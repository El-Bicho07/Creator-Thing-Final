"""Re-embedding service for the 384 -> 768 migration (task §19).

Every production vector is generated here by `EmbeddingService.embed_document`,
which applies the mandatory `passage: ` prefix. Nothing is padded, truncated,
sliced or copied from the old 384-d column.

Safety properties:
  * **Genuine** -- a vector whose width is not the configured dimension is
    rejected, so a misconfigured model cannot silently store wrong-width data.
  * **Idempotent** -- a chunk already carrying the target model, dimension and
    version is skipped, so re-running is cheap and safe.
  * **Audited** -- reports records examined, embedded, already-current, skipped,
    failed, retried and duration, so completion can be reconciled.
  * **Resilient** -- a failing batch is retried once, then its rows are reported
    and left NULL. The contract migration refuses to run while any exist.

Usage (inside the API container):
    python -m app.memory.reembed --verify
    python -m app.memory.reembed --batch 32
    python -m app.memory.reembed --user-id <uuid>
"""
from __future__ import annotations

import argparse
import asyncio
import logging
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.embedding import EmbeddingService, get_embedding_service
from app.core.config import settings
from app.core.db import admin_session_maker, async_session_maker


def _session_maker():
    """Operational sessions use the RLS-bypassing admin role.

    Re-embedding must see every creator's rows, which `api_user` deliberately
    cannot do (RLS scopes it to the caller). Falling back to the application
    engine would silently process only the zero-UUID creator, so a missing
    admin URL is a hard error rather than a quiet no-op.
    """
    if admin_session_maker is not None:
        return admin_session_maker
    raise RuntimeError(
        "ADMIN_DATABASE_URL is not configured. Re-embedding needs a role that "
        "bypasses RLS so it can process every creator's rows. Refusing to run "
        "against the RLS-scoped application role."
    )

logger = logging.getLogger(__name__)


@dataclass
class ReembedReport:
    """Reconciliation record for one re-embedding run."""

    examined: int = 0
    embedded: int = 0
    already_current: int = 0
    skipped: int = 0
    failed: int = 0
    retries: int = 0
    batch_size: int = 16
    embedding_model: str = ""
    embedding_dimension: int = 0
    duration_seconds: float = 0.0
    failure_ids: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "examined": self.examined,
            "embedded": self.embedded,
            "already_current": self.already_current,
            "skipped": self.skipped,
            "failed": self.failed,
            "retries": self.retries,
            "batch_size": self.batch_size,
            "embedding_model": self.embedding_model,
            "embedding_dimension": self.embedding_dimension,
            "duration_seconds": round(self.duration_seconds, 3),
            "failure_ids": self.failure_ids[:20],
        }

    def __str__(self) -> str:
        return (
            f"examined={self.examined} embedded={self.embedded} "
            f"already_current={self.already_current} skipped={self.skipped} "
            f"failed={self.failed} retries={self.retries} "
            f"in {self.duration_seconds:.2f}s "
            f"({self.embedding_model} {self.embedding_dimension}d)"
        )


async def active_embedding_column(session: AsyncSession) -> str:
    """`embedding_v2` during the expand phase, `embedding` after cutover."""
    result = await session.execute(
        text(
            """
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'chunks' AND column_name = 'embedding_v2'
            """
        )
    )
    return "embedding_v2" if result.scalar() is not None else "embedding"


def _update_sql(column: str, count: int) -> str:
    """One fixed-shape UPDATE ... FROM (VALUES ...) for a batch of `count` rows."""
    # Every column of the VALUES row needs an explicit cast: raw text() gives
    # PostgreSQL no type for the placeholders, so uncast integers arrive as text.
    values = ", ".join(
        f"(CAST(:id{i} AS uuid), CAST(:vec{i} AS vector), "
        f"CAST(:model{i} AS varchar), CAST(:dim{i} AS integer), "
        f"CAST(:ver{i} AS varchar))"
        for i in range(count)
    )
    return text(f"""
        UPDATE chunks AS c SET
            {column}        = v.vec,
            embedding_model = v.model,
            embedding_dimension = v.dim,
            embedding_version   = v.ver,
            embedding_created_at = NOW()
        FROM (VALUES {values}) AS v(id, vec, model, dim, ver)
        WHERE c.id = v.id
    """)


class ReembeddingService:
    """Re-embed `chunks` rows into the E5 column using real model output."""

    def __init__(self, embedding: Optional[EmbeddingService] = None,
                 batch_size: Optional[int] = None) -> None:
        self._embedding = embedding or get_embedding_service()
        self._batch_size = batch_size or settings.embedding_batch_size

    async def run(self, *, user_id: Optional[uuid.UUID] = None,
                  limit: Optional[int] = None,
                  verify_only: bool = False) -> ReembedReport:
        report = ReembedReport(
            batch_size=self._batch_size,
            embedding_model=settings.embedding_model,
            embedding_dimension=settings.embedding_dimension,
        )
        started = time.perf_counter()

        async with _session_maker()() as session:
            column = await active_embedding_column(session)

            params: dict[str, Any] = {
                "dimension": settings.embedding_dimension,
                "model": settings.embedding_model,
                "version": settings.embedding_version,
            }
            scope = ""
            if user_id is not None:
                scope += " AND user_id = :user_id"
                params["user_id"] = str(user_id)
            if limit is not None:
                scope += " AND id IN (SELECT id FROM chunks ORDER BY created_at LIMIT :limit)"
                params["limit"] = limit

            total = await session.execute(
                text(f"SELECT COUNT(*) FROM chunks WHERE TRUE{scope}"), params
            )
            total_rows = int(total.scalar() or 0)

            already = await session.execute(
                text(
                    f"""
                    SELECT COUNT(*) FROM chunks
                    WHERE {column} IS NOT NULL
                      AND embedding_dimension = :dimension
                      AND embedding_model = :model
                      AND embedding_version = :version
                      {scope}
                    """
                ),
                params,
            )
            report.already_current = int(already.scalar() or 0)

            if verify_only:
                report.examined = total_rows
                report.skipped = report.already_current
                report.duration_seconds = time.perf_counter() - started
                return report

            pending = await session.execute(
                text(
                    f"""
                    SELECT id, chunk_text FROM chunks
                    WHERE ({column} IS NULL
                           OR embedding_dimension IS DISTINCT FROM :dimension
                           OR embedding_model IS DISTINCT FROM :model
                           OR embedding_version IS DISTINCT FROM :version)
                      {scope}
                    ORDER BY created_at
                    """
                ),
                params,
            )
            rows = pending.mappings().all()
            report.examined = total_rows

            for offset in range(0, len(rows), self._batch_size):
                batch = rows[offset:offset + self._batch_size]
                texts = [r["chunk_text"] for r in batch]

                vectors = None
                try:
                    vectors = self._embedding.embed_documents(texts)
                except Exception as exc:
                    report.retries += 1
                    logger.warning("Batch @%d failed (%s); retrying once", offset, exc)
                    try:
                        vectors = self._embedding.embed_documents(texts)
                    except Exception as exc2:
                        logger.error("Batch @%d failed permanently: %s", offset, exc2)
                        report.failed += len(batch)
                        report.failure_ids.extend(str(r["id"]) for r in batch)
                        continue

                payload: dict[str, Any] = {}
                accepted = 0
                for index, (row, vector) in enumerate(zip(batch, vectors)):
                    if len(vector) != settings.embedding_dimension:
                        report.failed += 1
                        report.failure_ids.append(str(row["id"]))
                        continue
                    payload[f"id{index}"] = str(row["id"])
                    payload[f"vec{index}"] = str(vector)
                    payload[f"model{index}"] = settings.embedding_model
                    payload[f"dim{index}"] = settings.embedding_dimension
                    payload[f"ver{index}"] = settings.embedding_version
                    accepted += 1

                if not accepted:
                    continue

                await session.execute(_update_sql(column, len(batch)), payload)
                report.embedded += accepted
                report.skipped += len(batch) - accepted

            await session.commit()

        report.duration_seconds = time.perf_counter() - started
        return report


async def verify_provenance() -> dict[str, Any]:
    """Reconcile embedding provenance across all chunks (task §20)."""
    async with _session_maker()() as session:
        column = await active_embedding_column(session)
        row = (
            await session.execute(
                text(
                    f"""
                    SELECT
                        COUNT(*)                                            AS total,
                        COUNT(*) FILTER (WHERE {column} IS NULL)            AS unembedded,
                        COUNT(*) FILTER (WHERE {column} IS NOT NULL
                                          AND embedding_dimension IS DISTINCT FROM :dim)
                                                                          AS wrong_dimension,
                        COUNT(*) FILTER (WHERE {column} IS NOT NULL
                                          AND embedding_model IS DISTINCT FROM :model)
                                                                          AS wrong_model,
                        COUNT(*) FILTER (WHERE {column} IS NOT NULL
                                          AND embedding_version IS DISTINCT FROM :ver)
                                                                          AS wrong_version,
                        COALESCE(MAX(vector_dims({column})), 0)             AS observed_max_dim
                    FROM chunks
                    """
                ),
                {"dim": settings.embedding_dimension,
                 "model": settings.embedding_model,
                 "ver": settings.embedding_version},
            )
        ).mappings().one()
        return dict(row)


def main() -> None:
    parser = argparse.ArgumentParser(description="Re-embed chunks with E5-base")
    parser.add_argument("--verify", action="store_true",
                        help="report provenance reconciliation without writing")
    parser.add_argument("--batch", type=int, default=None)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--user-id", default=None)
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    if args.verify:
        report = asyncio.run(verify_provenance())
        print("PROVENANCE RECONCILIATION")
        for key, value in report.items():
            print(f"  {key}: {value}")
        return

    service = ReembeddingService(batch_size=args.batch)
    result = asyncio.run(
        service.run(
            user_id=uuid.UUID(args.user_id) if args.user_id else None,
            limit=args.limit,
        )
    )
    print("RE-EMBEDDING REPORT")
    for key, value in result.as_dict().items():
        print(f"  {key}: {value}")


if __name__ == "__main__":
    main()