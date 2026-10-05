"""Platform-level Memory API (`/api/memory`).

Ownership is derived from the authenticated identity only. There is no
`user_id` parameter anywhere in this router: a client cannot ask for another
creator's memory, and PostgreSQL RLS is the authoritative boundary regardless of
what the application layer does.
"""
from __future__ import annotations

import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user, get_db_with_user
from app.memory import (
    IngestRequest,
    MemoryCategory,
    MemoryEngine,
    MemoryQuery,
    SourceType,
    get_memory_engine,
)
from app.memory.policy import evaluate

router = APIRouter(prefix="/memory", tags=["memory"])


# --------------------------------------------------------------------------- #
# Schemas
# --------------------------------------------------------------------------- #

class MemoryIngestBody(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    text: str = Field(..., min_length=1)
    source_type: SourceType = SourceType.MANUAL
    external_id: Optional[str] = None
    category: MemoryCategory = MemoryCategory.FACT
    metadata: dict[str, Any] = Field(default_factory=dict)
    #: Set when a human explicitly asked to remember this; relaxes the
    #: transience rules in the write policy but never the redaction rules.
    explicit_user_request: bool = True


class MemorySearchBody(BaseModel):
    query: str = Field(..., min_length=1)
    top_k: int = Field(default=10, ge=1, le=100)
    purpose: Optional[str] = None
    filters: dict[str, Any] = Field(default_factory=dict)
    min_score: Optional[float] = Field(default=None, ge=-1.0, le=1.0)


class MemoryResultOut(BaseModel):
    memory_id: uuid.UUID
    content_asset_id: uuid.UUID
    chunk_id: uuid.UUID
    score: float
    text: str
    source: str
    source_type: str
    title: Optional[str] = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    retrieval_purpose: Optional[str] = None
    rank: Optional[int] = None


class MemorySearchOut(BaseModel):
    results: list[MemoryResultOut]
    embedding_model: str
    embedding_dimension: int


class MemoryIngestOut(BaseModel):
    persisted: bool
    asset_id: Optional[uuid.UUID] = None
    chunks: int
    reason: Optional[str] = None
    redacted: bool = False
    embedding_model: Optional[str] = None
    embedding_dimension: Optional[int] = None


class MemoryStatsOut(BaseModel):
    assets: int
    chunks: int
    embedding_model: Optional[str]
    embedding_dimension: Optional[int]
    unembedded_chunks: int
    stale_dimension_chunks: int


class AssetOut(BaseModel):
    id: uuid.UUID
    title: str
    source_type: str
    created_at: Any
    chunk_count: int


class PolicyCheckOut(BaseModel):
    should_persist: bool
    category: str
    reasons: list[str]
    redacted: bool
    redacted_fields: list[str]


# --------------------------------------------------------------------------- #
# Dependencies
# --------------------------------------------------------------------------- #

def memory_engine(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
) -> MemoryEngine:
    """Memory engine bound to the authenticated creator and their RLS session."""
    return get_memory_engine(db, uuid.UUID(current_user.id))


def _uuid_or_404(value: str, field: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except (ValueError, AttributeError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid {field}: must be a UUID",
        )


# --------------------------------------------------------------------------- #
# Routes
# --------------------------------------------------------------------------- #

@router.get("/health")
async def memory_health() -> dict:
    return {"status": "ok", "service": "memory"}


@router.post("/ingest", response_model=MemoryIngestOut, status_code=201)
async def ingest_memory(
    body: MemoryIngestBody,
    engine: MemoryEngine = Depends(memory_engine),
) -> MemoryIngestOut:
    """Ingest content into long-term memory.

    The write policy decides durability; credential-shaped and personal values are
    redacted before anything is stored or embedded.
    """
    result = await engine.ingest(
        IngestRequest(
            title=body.title,
            raw_text=body.text,
            source_type=body.source_type,
            external_id=body.external_id,
            category=body.category,
            metadata=body.metadata,
        )
    )
    if not result["persisted"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"reason": result.get("reason"), "policy": "memory_write_policy"},
        )
    return MemoryIngestOut(
        persisted=True,
        asset_id=result["asset_id"],
        chunks=result["chunks"],
        redacted=result.get("redacted", False),
        embedding_model=result.get("embedding_model"),
        embedding_dimension=result.get("embedding_dimension"),
    )


@router.post("/search", response_model=MemorySearchOut)
async def search_memory(
    body: MemorySearchBody,
    engine: MemoryEngine = Depends(memory_engine),
) -> MemorySearchOut:
    """Semantic search over this creator's memory.

    The query is embedded with the E5 `query:` convention and matched against
    `passage:`-embedded chunks by pgvector cosine distance, scoped by RLS.
    """
    results = await engine.retrieve(
        MemoryQuery(
            query=body.query,
            top_k=body.top_k,
            purpose=body.purpose,
            filters=body.filters,
            min_score=body.min_score,
        )
    )
    from app.core.config import settings

    return MemorySearchOut(
        results=[MemoryResultOut(**r.model_dump()) for r in results],
        embedding_model=settings.embedding_model,
        embedding_dimension=settings.embedding_dimension,
    )


@router.get("/assets", response_model=list[AssetOut])
async def list_assets(
    limit: int = Query(default=50, ge=1, le=200),
    engine: MemoryEngine = Depends(memory_engine),
) -> list[AssetOut]:
    return [AssetOut(**a) for a in await engine.list_assets(limit)]


@router.get("/assets/{asset_id}/summary")
async def summarize_asset(
    asset_id: str,
    engine: MemoryEngine = Depends(memory_engine),
) -> dict:
    aid = _uuid_or_404(asset_id, "asset_id")
    summary = await engine.summarize_asset(aid)
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found or not owned by the authenticated creator",
        )
    return {"asset_id": str(aid), "summary": summary}


@router.delete("/assets/{asset_id}")
async def delete_asset(
    asset_id: str,
    engine: MemoryEngine = Depends(memory_engine),
) -> dict:
    aid = _uuid_or_404(asset_id, "asset_id")
    result = await engine.delete_asset(aid)
    if not result["assets_deleted"]:
        # A non-owned asset is reported as absent rather than forbidden, so the
        # endpoint cannot be used to discover that another creator's id exists.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found or not owned by the authenticated creator",
        )
    return result


@router.get("/stats", response_model=MemoryStatsOut)
async def memory_stats(engine: MemoryEngine = Depends(memory_engine)) -> MemoryStatsOut:
    return MemoryStatsOut(**(await engine.stats()).model_dump())


@router.post("/policy/check", response_model=PolicyCheckOut)
async def check_policy(body: MemoryIngestBody) -> PolicyCheckOut:
    """Dry-run the memory write policy without storing anything."""
    decision = evaluate(
        body.text, body.category, explicit_user_request=body.explicit_user_request
    )
    return PolicyCheckOut(
        should_persist=decision.should_persist,
        category=decision.category.value,
        reasons=decision.reasons,
        redacted=decision.redacted,
        redacted_fields=decision.redacted_fields,
    )