"""EmbeddingService abstraction.

This is the **only** interface other platform services use for embeddings:

    Memory Engine / Voice Engine
            ↓
    EmbeddingService
            ↓
    E5 adapter  (the sole module that knows E5 internals)

No feature module may import `sentence_transformers` or reference a model name.
Swapping the embedding model later must not require touching a feature module.
"""
from __future__ import annotations

import abc
from typing import Sequence

import numpy as np


class EmbeddingError(RuntimeError):
    """Raised when embedding cannot be produced."""


class EmbeddingService(abc.ABC):
    """Model-agnostic embedding contract."""

    @abc.abstractmethod
    def embed_query(self, text: str) -> list[float]:
        """Embed a search query, using the model's QUERY convention."""

    @abc.abstractmethod
    def embed_document(self, text: str) -> list[float]:
        """Embed a stored document, using the model's PASSAGE convention."""

    @abc.abstractmethod
    def embed_documents(self, texts: Sequence[str]) -> list[list[float]]:
        """Embed a batch of documents."""

    @abc.abstractmethod
    def embed_queries(self, texts: Sequence[str]) -> list[list[float]]:
        """Embed a batch of queries."""

    @abc.abstractmethod
    def get_dimension(self) -> int:
        """Vector dimensionality."""

    @abc.abstractmethod
    def get_model_metadata(self) -> dict:
        """Model id, revision, dimension, prefixes, normalisation, dtype."""

    # -- shared helpers ----------------------------------------------------

    @staticmethod
    def _as_vector(values: Sequence[float]) -> np.ndarray:
        arr = np.asarray(values, dtype=np.float32)
        if arr.ndim != 1:
            raise EmbeddingError(f"Expected a 1-D vector, got shape {arr.shape}")
        return arr

    @staticmethod
    def l2_normalize(vector: np.ndarray) -> np.ndarray:
        norm = float(np.linalg.norm(vector))
        if norm == 0.0:
            raise EmbeddingError("Cannot normalise a zero vector")
        return vector / norm

    def cosine_similarity(self, a: Sequence[float], b: Sequence[float]) -> float:
        """Cosine similarity of two L2-normalised vectors.

        Convenience for callers that score in Python; production retrieval is
        performed by pgvector's `vector_cosine_ops`.
        """
        va = self.l2_normalize(self._as_vector(a))
        vb = self.l2_normalize(self._as_vector(b))
        return float(np.dot(va, vb))