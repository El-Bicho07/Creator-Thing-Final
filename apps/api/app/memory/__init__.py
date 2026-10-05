"""Long-Term Memory Engine (platform-wide RAG service).

Adapted from Module 19. Depends on `EmbeddingService` only -- it must never
import `sentence_transformers` or name a specific embedding model.
"""
from app.memory.policy import PolicyDecision, evaluate, redact
from app.memory.retrieval import MemoryEngine, get_memory_engine
from app.memory.schemas import (
    IngestRequest,
    MemoryCategory,
    MemoryChunk,
    MemoryQuery,
    MemoryResult,
    MemoryStats,
    SourceType,
)

__all__ = [
    "MemoryEngine",
    "get_memory_engine",
    "MemoryQuery",
    "MemoryResult",
    "MemoryChunk",
    "MemoryStats",
    "IngestRequest",
    "MemoryCategory",
    "SourceType",
    "evaluate",
    "redact",
    "PolicyDecision",
]
