"""Memory contracts shared by the Memory Engine and its callers.

Retrieval results always carry provenance so a caller can trace a memory back to
the content asset it came from (task §27).
"""
from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class MemoryCategory(str, Enum):
    """Categories the write policy recognises (task §29)."""

    PREFERENCE = "preference"
    FACT = "fact"
    DECISION = "decision"
    LESSON = "lesson"
    IDEA = "idea"
    CONTENT_INSIGHT = "content_insight"
    PERFORMANCE_INSIGHT = "performance_insight"
    VOICE_SIGNAL = "voice_signal"


class SourceType(str, Enum):
    POST = "post"
    CAPTION = "caption"
    HOOK = "hook"
    SCRIPT = "script"
    NOTE = "note"
    TRANSCRIPT = "transcript"
    COMMENT = "comment"
    PERFORMANCE = "performance"
    IDEA = "idea"
    MANUAL = "manual"


class IngestRequest(BaseModel):
    """Ingest one piece of creator content into long-term memory."""

    title: str = Field(..., min_length=1, max_length=255)
    raw_text: str = Field(..., min_length=1)
    source_type: SourceType = SourceType.MANUAL
    external_id: Optional[str] = None
    category: MemoryCategory = MemoryCategory.FACT
    metadata: dict[str, Any] = Field(default_factory=dict)
    # Chunking controls; sensible defaults live in the engine.
    chunk_size: int = Field(default=900, ge=100, le=4000)
    chunk_overlap: int = Field(default=150, ge=0, le=1000)


class MemoryChunk(BaseModel):
    """One embedded chunk of a content asset."""

    chunk_id: uuid.UUID
    asset_id: uuid.UUID
    chunk_index: int
    text: str
    token_length: int = 0
    embedding_model: str = ""
    embedding_dimension: int = 0


class MemoryResult(BaseModel):
    """A retrieved memory with full provenance."""

    memory_id: uuid.UUID
    content_asset_id: uuid.UUID
    chunk_id: uuid.UUID
    score: float
    text: str
    source: str
    source_type: str
    title: Optional[str] = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[datetime] = None

    # Retrieval context, so a caller can attribute *why* this surfaced.
    retrieval_purpose: Optional[str] = None
    rank: Optional[int] = None


class MemoryQuery(BaseModel):
    """A retrieval request."""

    query: str = Field(..., min_length=1)
    top_k: int = Field(default=10, ge=1, le=100)
    purpose: Optional[str] = Field(
        default=None,
        description="Why this retrieval happened, e.g. 'studio_script_stage4'",
    )
    filters: dict[str, Any] = Field(default_factory=dict)
    min_score: Optional[float] = Field(default=None, ge=-1.0, le=1.0)


class MemoryStats(BaseModel):
    assets: int = 0
    chunks: int = 0
    embedding_model: Optional[str] = None
    embedding_dimension: Optional[int] = None
    unembedded_chunks: int = 0
    stale_dimension_chunks: int = 0