"""Long-Term Memory Engine.

The platform-wide RAG service. Adapted from Module 19 (`19_Creator_Second_Brain`)
per `docs/porting-log.md`:

    Memory Engine
          ↓
    EmbeddingService            <- only knows E5 through this abstraction
          ↓
    intfloat/multilingual-e5-base  (768-d, "passage:" / "query:")
          ↓
    pgvector (single `chunks` table)
          ↓
    PostgreSQL RLS on user_id   <- the authoritative isolation boundary

Invariants enforced here:
  * No feature module imports sentence_transformers or names a model.
  * There is exactly one vector store (`chunks`). No second vector database.
  * Every query runs in the caller's RLS-scoped session and additionally
    filters `user_id` as defence in depth. RLS remains authoritative.
  * Stored vectors are produced by `embed_document` (the `passage:` convention),
    retrieved with `embed_query` (the `query:` convention). Callers cannot get
    this wrong because the two methods are named for the role, not the text.
"""
from __future__ import annotations

import json
import logging
import uuid
from typing import Any, Optional, Sequence

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.embedding import EmbeddingService, get_embedding_service
from app.core.config import settings
from app.memory.chunking import chunk_text
from app.memory.policy import apply as redact_text
from app.memory.policy import evaluate as evaluate_policy
from app.memory.schemas import (
    IngestRequest,
    MemoryCategory,
    MemoryChunk,
    MemoryQuery,
    MemoryResult,
    MemoryStats,
    SourceType,
)

logger = logging.getLogger(__name__)

#: Columns selected for a retrieval result.
_SELECT_COLUMNS = """
    c.id            AS chunk_id,
    c.asset_id      AS content_asset_id,
    c.chunk_index,
    c.chunk_text,
    c.metadata,
    c.created_at,
    c.embedding_model,
    a.title,
    a.source_type,
    a.external_id
"""


class MemoryEngine:
    """Creator-scoped long-term memory over the shared pgvector store."""

    def __init__(self, db: AsyncSession, user_id: uuid.UUID,
                 embedding: Optional[EmbeddingService] = None) -> None:
        self._db = db
        self._user_id = uuid.UUID(str(user_id))
        self._embedding = embedding or get_embedding_service()

    # ------------------------------------------------------------------ #
    # Ingest
    # ------------------------------------------------------------------ #

    async def ingest(self, request: IngestRequest) -> dict[str, Any]:
        """Validate -> chunk -> embed -> store.

        The write policy decides whether the content is durable; chunk text is
        redacted before it can ever be embedded or stored.
        """
        decision = evaluate_policy(
            request.raw_text,
            request.category,
            explicit_user_request=True,  # ingestion is an explicit act
        )
        if not decision.should_persist:
            return {
                "persisted": False,
                "reason": "; ".join(decision.reasons),
                "asset_id": None,
                "chunks": 0,
            }

        safe_text = redact_text(request.raw_text)
        chunks = chunk_text(
            safe_text,
            self._embedding.token_length,
            target_tokens=min(request.chunk_size, 300),
            overlap_tokens=min(request.chunk_overlap, 40),
        )
        if not chunks:
            return {
                "persisted": False,
                "reason": "no content after normalisation",
                "asset_id": None,
                "chunks": 0,
            }

        asset_id = await self._create_asset(request, safe_text)

        vectors = self._embedding.embed_documents(chunks)
        token_lengths = [self._embedding.token_length(c) for c in chunks]

        rows = []
        for index, (text_chunk, vector, tokens) in enumerate(zip(chunks, vectors, token_lengths)):
            rows.append({
                "id": uuid.uuid4(),
                "user_id": self._user_id,
                "asset_id": asset_id,
                "chunk_index": index,
                "chunk_text": text_chunk,
                "embedding_v2": vector,
                "embedding_model": settings.embedding_model,
                "embedding_dimension": settings.embedding_dimension,
                "embedding_version": settings.embedding_version,
                "metadata": json.dumps({
                    **(request.metadata or {}),
                    "category": request.category.value,
                    "redacted": decision.redacted,
                    "redacted_fields": decision.redacted_fields,
                }),
            })

        await self._insert_rows(rows)
        logger.info(
            "Ingested asset %s with %d chunks for user %s",
            asset_id, len(rows), self._user_id,
        )
        return {
            "persisted": True,
            "asset_id": asset_id,
            "chunks": len(rows),
            "embedding_model": settings.embedding_model,
            "embedding_dimension": settings.embedding_dimension,
            "redacted": decision.redacted,
        }

    async def _create_asset(self, request: IngestRequest, safe_text: str) -> uuid.UUID:
        asset_id = uuid.uuid4()
        await self._db.execute(
            text(
                """
                INSERT INTO content_assets
                    (id, user_id, title, source_type, external_id, raw_text, metadata)
                VALUES
                    (:id, :user_id, :title, :source_type, :external_id, :raw_text,
                     CAST(:metadata AS jsonb))
                """
            ),
            {
                "id": str(asset_id),
                "user_id": str(self._user_id),
                "title": request.title,
                "source_type": request.source_type.value,
                "external_id": request.external_id,
                "raw_text": safe_text,
                # Raw text() has no type info, so JSONB params must be
                # serialised explicitly and cast.
                "metadata": json.dumps({
                    **(request.metadata or {}),
                    "category": request.category.value,
                }),
            },
        )
        return asset_id

    async def _insert_rows(self, rows: Sequence[dict[str, Any]]) -> None:
        """Insert chunks.

        Writes `embedding_v2` when the expand phase is still in place, and
        `embedding` once migration 004 has promoted it, so this code works both
        before and after cutover without a feature flag.
        """
        target = await self._active_embedding_column()

        # Raw `text()` carries no column type information, so the pgvector and
        # JSONB values must be sent as strings and cast on the VALUES side.
        # (Putting the cast in the column list is invalid SQL.)
        payload = []
        for row in rows:
            row = dict(row)
            # Write into whichever column is currently authoritative.
            row[target] = row.pop("embedding_v2")
            payload.append({
                **row,
                target: str(row[target]),
            })
        columns = list(payload[0].keys())
        collist = ", ".join(columns)
        value_specs = [
            f"CAST(:metadata AS jsonb)" if c == "metadata"
            else f"CAST(:{c} AS vector)" if c in (target, "embedding_v2")
            else f":{c}"
            for c in columns
        ]
        statement = text(
            f"INSERT INTO chunks ({collist}) VALUES ({', '.join(value_specs)}) "
            f"RETURNING id"
        )
        result = await self._db.execute(statement, payload)
        await self._db.commit()
        return result

    async def _active_embedding_column(self) -> str:
        """`embedding_v2` during expand, `embedding` after the contract migration."""
        result = await self._db.execute(
            text(
                """
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'chunks' AND column_name = 'embedding_v2'
                """
            )
        )
        return "embedding_v2" if result.scalar() is not None else "embedding"

    # ------------------------------------------------------------------ #
    # Retrieval
    # ------------------------------------------------------------------ #

    async def retrieve(self, memory_query: MemoryQuery) -> list[MemoryResult]:
        """Embed the query with the `query:` convention, then search pgvector.

        Results are scoped to the caller's user in SQL *and* by RLS.
        """
        vector = self._embedding.embed_query(memory_query.query)
        column = await self._active_embedding_column()

        params: dict[str, Any] = {
            "user_id": str(self._user_id),
            "vector": str(vector),
            "limit": memory_query.top_k,
        }

        filters = []
        for index, (key, value) in enumerate((memory_query.filters or {}).items()):
            if key == "source_type":
                params[f"src_{index}"] = str(value)
                filters.append(f"a.source_type = :src_{index}")
            elif key == "category":
                params[f"cat_{index}"] = str(value)
                filters.append(f"c.metadata->>'category' = :cat_{index}")
            elif key == "asset_id":
                params[f"asset_{index}"] = str(value)
                filters.append(f"c.asset_id = :asset_{index}")
        where_extra = (" AND " + " AND ".join(filters)) if filters else ""

        score_clause = "1 - (c.{col} <=> :vector)".replace("{col}", column)
        sql = text(
            f"""
            SELECT {_SELECT_COLUMNS}, {score_clause} AS score
            FROM chunks c
            JOIN content_assets a ON a.id = c.asset_id
            WHERE c.user_id = :user_id {where_extra}
              AND c.{column} IS NOT NULL
            ORDER BY c.{column} <=> :vector
            LIMIT :limit
            """
        )
        rows = (await self._db.execute(sql, params)).mappings().all()

        results: list[MemoryResult] = []
        for rank, row in enumerate(rows, start=1):
            score = float(row["score"])
            if memory_query.min_score is not None and score < memory_query.min_score:
                continue
            results.append(
                MemoryResult(
                    memory_id=row["chunk_id"],
                    content_asset_id=row["content_asset_id"],
                    chunk_id=row["chunk_id"],
                    score=score,
                    text=row["chunk_text"],
                    source=row["external_id"] or row["title"] or str(row["content_asset_id"]),
                    source_type=row["source_type"],
                    title=row["title"],
                    metadata=dict(row["metadata"] or {}),
                    created_at=row["created_at"],
                    retrieval_purpose=memory_query.purpose,
                    rank=rank,
                )
            )
        return results

    async def retrieve_for_prompt(
        self,
        query: str,
        *,
        top_k: int = 5,
        purpose: str = "prompt_context",
        filters: Optional[dict[str, Any]] = None,
    ) -> list[MemoryResult]:
        """Convenience wrapper used by feature code."""
        return await self.retrieve(
            MemoryQuery(query=query, top_k=top_k, purpose=purpose, filters=filters or {})
        )

    # ------------------------------------------------------------------ #
    # Summarize
    # ------------------------------------------------------------------ #

    async def summarize_asset(self, asset_id: uuid.UUID, *, max_chunks: int = 8) -> str:
        """Concatenate an asset's chunks as a compact summary source.

        Deliberately not an LLM call: summarisation of stored text is a read
        operation, and making it free keeps memory inspection available when no
        provider credential exists. LLM-based condensation can be layered on top
        by a feature through the LLM Gateway.
        """
        result = await self._db.execute(
            text(
                """
                SELECT chunk_text FROM chunks
                WHERE user_id = :user_id AND asset_id = :asset_id
                ORDER BY chunk_index
                LIMIT :limit
                """
            ),
            {"user_id": str(self._user_id), "asset_id": str(asset_id),
             "limit": max_chunks},
        )
        parts = [row[0] for row in result.fetchall()]
        return "\n\n".join(parts)

    # ------------------------------------------------------------------ #
    # Update / delete
    # ------------------------------------------------------------------ #

    async def delete_asset(self, asset_id: uuid.UUID) -> dict[str, int]:
        """Delete an asset; chunks cascade in the schema.

        Scoped by user_id in SQL and by RLS. A foreign asset affects 0 rows and
        is reported as `assets_deleted: 0` rather than raising, so the API cannot
        be used to probe for existence of another user's data.
        """
        result = await self._db.execute(
            text(
                """
                DELETE FROM content_assets
                WHERE id = :asset_id AND user_id = :user_id
                RETURNING id
                """
            ),
            {"asset_id": str(asset_id), "user_id": str(self._user_id)},
        )
        deleted = len(result.fetchall())
        await self._db.commit()
        return {"assets_deleted": deleted}

    async def update_chunk(self, chunk_id: uuid.UUID, new_text: str) -> dict[str, Any]:
        """Update chunk text and **re-embed it** so the stored vector matches.

        Leaving the old vector in place after an edit would silently make the
        index inconsistent with the text.
        """
        vector = self._embedding.embed_document(new_text)
        column = await self._active_embedding_column()
        result = await self._db.execute(
            text(
                f"""
                UPDATE chunks
                SET chunk_text = :chunk_text,
                    {column} = :vector,
                    embedding_model = :model,
                    embedding_dimension = :dimension,
                    embedding_version = :version,
                    embedding_created_at = NOW()
                WHERE id = :chunk_id AND user_id = :user_id
                RETURNING id
                """
            ),
            {
                "chunk_text": new_text,
                "vector": str(vector),
                "model": settings.embedding_model,
                "dimension": settings.embedding_dimension,
                "version": settings.embedding_version,
                "chunk_id": str(chunk_id),
                "user_id": str(self._user_id),
            },
        )
        updated = len(result.fetchall())
        await self._db.commit()
        return {"chunks_updated": updated, "re_embedded": bool(updated)}

    # ------------------------------------------------------------------ #
    # Introspection
    # ------------------------------------------------------------------ #

    async def stats(self) -> MemoryStats:
        """Creator-scoped counts plus embedding-provenance reconciliation."""
        column = await self._active_embedding_column()
        result = await self._db.execute(
            text(
                f"""
                SELECT
                    (SELECT COUNT(*) FROM content_assets WHERE user_id = :user_id) AS assets,
                    (SELECT COUNT(*) FROM chunks WHERE user_id = :user_id) AS chunks,
                    (SELECT COUNT(*) FROM chunks
                      WHERE user_id = :user_id AND {column} IS NULL) AS unembedded,
                    (SELECT COUNT(*) FROM chunks
                      WHERE user_id = :user_id AND {column} IS NOT NULL
                        AND (embedding_dimension IS DISTINCT FROM :dimension
                             OR embedding_model IS DISTINCT FROM :model)) AS mismatched
                """
            ),
            {
                "user_id": str(self._user_id),
                "dimension": settings.embedding_dimension,
                "model": settings.embedding_model,
            },
        )
        row = result.mappings().one()
        return MemoryStats(
            assets=int(row["assets"]),
            chunks=int(row["chunks"]),
            embedding_model=settings.embedding_model,
            embedding_dimension=settings.embedding_dimension,
            unembedded_chunks=int(row["unembedded"]),
            stale_dimension_chunks=int(row["mismatched"]),
        )

    async def list_assets(self, limit: int = 50) -> list[dict[str, Any]]:
        result = await self._db.execute(
            text(
                """
                SELECT a.id, a.title, a.source_type, a.created_at,
                       (SELECT COUNT(*) FROM chunks c
                         WHERE c.asset_id = a.id AND c.user_id = a.user_id) AS chunk_count
                FROM content_assets a
                WHERE a.user_id = :user_id
                ORDER BY a.created_at DESC
                LIMIT :limit
                """
            ),
            {"user_id": str(self._user_id), "limit": limit},
        )
        return [
            {
                "id": str(row["id"]),
                "title": row["title"],
                "source_type": row["source_type"],
                "created_at": row["created_at"],
                "chunk_count": int(row["chunk_count"]),
            }
            for row in result.mappings().all()
        ]


def get_memory_engine(
    db: AsyncSession,
    user_id: uuid.UUID,
    embedding: Optional[EmbeddingService] = None,
) -> MemoryEngine:
    return MemoryEngine(db, user_id, embedding)