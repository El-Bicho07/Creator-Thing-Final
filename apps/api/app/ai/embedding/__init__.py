"""Unified embedding service.

Feature code depends on `EmbeddingService` only:

    from app.ai.embedding import get_embedding_service

The concrete E5 adapter is an implementation detail of this package.
"""
from app.ai.embedding.base import EmbeddingError, EmbeddingService
from app.ai.embedding.e5 import (
    E5EmbeddingService,
    get_embedding_service,
    set_embedding_service,
)

__all__ = [
    "EmbeddingService",
    "EmbeddingError",
    "E5EmbeddingService",
    "get_embedding_service",
    "set_embedding_service",
]
