"""E5-base embedding adapter -- the ONLY module that knows E5 internals.

Selected model (ADR-002, Phase 2): `intfloat/multilingual-e5-base`, 768 dims.

E5 retrieval convention, applied here and never by callers:
    query   -> "query: <text>"
    document-> "passage: <text>"

These prefixes are MANDATORY. Stripping them measurably degrades E5 retrieval.
The no-prefix variant remains historical benchmark evidence only and is not a
production mode.

Every vector is L2-normalised, which is what pgvector's `vector_cosine_ops`
assumes.
"""
from __future__ import annotations

import logging
import threading
from typing import Sequence

import numpy as np

from app.ai.embedding.base import EmbeddingError, EmbeddingService
from app.core.config import settings

logger = logging.getLogger(__name__)

#: Words that indicate someone stripped the convention; we refuse rather than
#: silently embedding the wrong thing.
_QUERY_PREFIX = "query:"
_PASSAGE_PREFIX = "passage:"


class E5EmbeddingService(EmbeddingService):
    """`intfloat/multilingual-e5-base` adapter."""

    def __init__(
        self,
        model_name: str | None = None,
        revision: str | None = None,
        device: str | None = None,
        batch_size: int | None = None,
        max_seq_length: int | None = None,
    ) -> None:
        self._model_name = model_name or settings.embedding_model
        self._revision = revision if revision is not None else settings.embedding_revision
        self._device = device or settings.embedding_device
        self._batch_size = batch_size or settings.embedding_batch_size
        self._max_seq_length = max_seq_length or settings.embedding_max_seq_length
        self._dimension = settings.embedding_dimension
        self._query_prefix = settings.embedding_query_prefix
        self._passage_prefix = settings.embedding_document_prefix
        self._normalize = settings.embedding_normalize
        self._model = None
        self._lock = threading.Lock()
        self._tokenizer = None
        self._validate_configuration()

    # -- configuration -----------------------------------------------------

    def _validate_configuration(self) -> None:
        if self._model_name != "intfloat/multilingual-e5-base":
            raise EmbeddingError(
                "Phase 2 production model is intfloat/multilingual-e5-base; "
                f"got {self._model_name!r}"
            )
        if self._dimension != 768:
            raise EmbeddingError(
                f"multilingual-e5-base produces 768 dimensions; got {self._dimension}"
            )
        if not self._normalize:
            raise EmbeddingError("E5 vectors must be L2-normalised for cosine search")
        if self._query_prefix.strip() != _QUERY_PREFIX:
            raise EmbeddingError(
                f"query prefix must be {_QUERY_PREFIX!r}, got {self._query_prefix!r}"
            )
        if self._passage_prefix.strip() != _PASSAGE_PREFIX:
            raise EmbeddingError(
                f"document prefix must be {_PASSAGE_PREFIX!r}, got {self._passage_prefix!r}"
            )

    # -- model loading -----------------------------------------------------

    def _load(self):
        """Lazily load the model. Raises EmbeddingError with a clear message."""
        if self._model is not None:
            return self._model
        with self._lock:
            if self._model is not None:
                return self._model
            try:
                from sentence_transformers import SentenceTransformer
            except ImportError as exc:  # pragma: no cover
                raise EmbeddingError(
                    "sentence-transformers is required for the E5 embedding service"
                ) from exc
            try:
                kwargs = {"device": self._device}
                if self._revision:
                    kwargs["revision"] = self._revision
                model = SentenceTransformer(self._model_name, **kwargs)
                model.max_seq_length = self._max_seq_length
                self._tokenizer = model.tokenizer
            except Exception as exc:
                raise EmbeddingError(
                    f"Failed to load embedding model {self._model_name!r}: {exc}"
                ) from exc
            self._model = model
            logger.info(
                "Loaded embedding model %s (%s dims, device=%s, max_seq_length=%d)",
                self._model_name, self._dimension, self._device, self._max_seq_length,
            )
            return self._model

    def is_loaded(self) -> bool:
        return self._model is not None

    def unload(self) -> None:
        with self._lock:
            self._model = None
            self._tokenizer = None

    @property
    def tokenizer(self):
        self._load()
        return self._tokenizer

    # -- prefixing ---------------------------------------------------------

    def _format_query(self, text: str) -> str:
        return f"{self._query_prefix}{text}"

    def _format_document(self, text: str) -> str:
        return f"{self._passage_prefix}{text}"

    def _clean(self, text) -> str:
        if text is None:
            raise EmbeddingError("Cannot embed None")
        if not isinstance(text, str):
            raise EmbeddingError(f"Expected str, got {type(text).__name__}")
        return text

    # -- EmbeddingService --------------------------------------------------

    def embed_query(self, text: str) -> list[float]:
        return self.embed_queries([text])[0]

    def embed_document(self, text: str) -> list[float]:
        return self.embed_documents([text])[0]

    def embed_queries(self, texts: Sequence[str]) -> list[list[float]]:
        cleaned = [self._clean(t) for t in texts]
        return self._encode([self._format_query(t) for t in cleaned])

    def embed_documents(self, texts: Sequence[str]) -> list[list[float]]:
        cleaned = [self._clean(t) for t in texts]
        return self._encode([self._format_document(t) for t in cleaned])

    def _encode(self, formatted: list[str]) -> list[list[float]]:
        if not formatted:
            return []
        model = self._load()
        try:
            vectors = model.encode(
                formatted,
                batch_size=self._batch_size,
                convert_to_numpy=True,
                normalize_embeddings=self._normalize,
                show_progress_bar=False,
            )
        except Exception as exc:
            raise EmbeddingError(f"Embedding failed: {exc}") from exc

        arr = np.asarray(vectors, dtype=np.float32)
        if arr.ndim != 2 or arr.shape[1] != self._dimension:
            raise EmbeddingError(
                f"Model returned shape {arr.shape}, expected (*, {self._dimension})"
            )
        return [row.tolist() for row in arr]

    def get_dimension(self) -> int:
        return self._dimension

    def get_model_metadata(self) -> dict:
        tokenizer_name = None
        if self._model is not None:
            tokenizer_name = type(self._model.tokenizer).__name__
        return {
            "model": self._model_name,
            "revision": self._revision,
            "dimension": self._dimension,
            "device": self._device,
            "dtype": "float32",
            "batch_size": self._batch_size,
            "max_seq_length": self._max_seq_length,
            "normalize": self._normalize,
            "normalization": "L2",
            "similarity": "cosine",
            "query_prefix": self._query_prefix,
            "document_prefix": self._passage_prefix,
            "version": settings.embedding_version,
            "loaded": self.is_loaded(),
            "tokenizer": tokenizer_name,
        }

    def token_length(self, text: str) -> int:
        """Token count of the RAW text (no prefix), for chunk budgeting."""
        tokenizer = self.tokenizer
        return len(tokenizer.encode(self._clean(text), add_special_tokens=False))


_SERVICE: E5EmbeddingService | None = None
_SERVICE_LOCK = threading.Lock()


def get_embedding_service() -> E5EmbeddingService:
    """Process-wide singleton (model load is expensive)."""
    global _SERVICE
    if _SERVICE is None:
        with _SERVICE_LOCK:
            if _SERVICE is None:
                _SERVICE = E5EmbeddingService()
    return _SERVICE


def set_embedding_service(service: E5EmbeddingService | None) -> None:
    """Test seam."""
    global _SERVICE
    _SERVICE = service