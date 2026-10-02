"""Local BGE embeddings via fastembed (ONNX — no PyTorch, no API key)."""

import os
import threading
from pathlib import Path

import numpy as np

from config import settings

os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")

_model = None
_lock = threading.Lock()

# BGE v1.5 retrieval instruction for short queries
QUERY_PREFIX = "Represent this sentence for searching relevant passages: "


def _get_model():
    global _model
    if _model is None:
        from fastembed import TextEmbedding

        cache = Path(__file__).resolve().parent.parent / ".model_cache"
        _model = TextEmbedding(settings.embedding_model, cache_dir=str(cache))
    return _model


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    with _lock:
        vecs = list(_get_model().embed(texts, batch_size=32))
    return [v.tolist() for v in vecs]


def embed_query(text: str) -> list[float]:
    return embed_texts([QUERY_PREFIX + text])[0]


def mean_vector(vectors: list[list[float]]) -> list[float] | None:
    if not vectors:
        return None
    m = np.mean(np.array(vectors), axis=0)
    norm = np.linalg.norm(m)
    return (m / norm).tolist() if norm else m.tolist()
