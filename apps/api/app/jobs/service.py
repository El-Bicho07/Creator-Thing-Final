"""Background job tracking.

Uses the existing `jobs` table (migration 002). No Redis, Kafka, Celery or
Kubernetes is introduced: ADR-005 and the Phase 1 architecture chose a simple
Postgres-backed design, and nothing in Phase 2 proves a broker is necessary.

Lifecycle:

    create -> pending -> claimed -> running -> completed
                                       \\-> failed (retryable)
                                       \\-> cancelled

Claiming uses `UPDATE ... WHERE status = 'pending' ... RETURNING`, which is
atomic in PostgreSQL, so two workers cannot claim the same job.

RLS: every statement is scoped to `user_id` and runs in the caller's session, so
a job is visible only to its creator.
"""
from __future__ import annotations

import json
import logging
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

#: Statuses a worker may claim.
CLAIMABLE = ("pending",)


@dataclass
class JobRecord:
    id: uuid.UUID
    user_id: uuid.UUID
    job_type: str
    status: str
    progress: int
    total: int
    error_message: Optional[str]
    metadata: dict[str, Any]

    @classmethod
    def from_row(cls, row) -> "JobRecord":
        return cls(
            id=row["id"] if not isinstance(row["id"], uuid.UUID) else row["id"],
            user_id=row["user_id"],
            job_type=row["job_type"],
            status=row["status"],
            progress=int(row["progress"] or 0),
            total=int(row["total"] or 100),
            error_message=row["error_message"],
            metadata=dict(row["metadata"] or {}),
        )

    def as_dict(self) -> dict[str, Any]:
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "job_type": self.job_type,
            "status": self.status,
            "progress": self.progress,
            "total": self.total,
            "error_message": self.error_message,
            "metadata": self.metadata,
        }


class JobService:
    """Creator-scoped job creation, claiming and progress reporting."""

    def __init__(self, db: AsyncSession, user_id: uuid.UUID) -> None:
        self._db = db
        self._user_id = uuid.UUID(str(user_id))

    async def create(self, job_type: str, *, total: int = 100,
                     metadata: Optional[dict[str, Any]] = None) -> uuid.UUID:
        job_id = uuid.uuid4()
        await self._db.execute(
            text(
                """
                INSERT INTO jobs (id, user_id, job_type, status, progress, total, metadata)
                VALUES (:id, :user_id, :job_type, 'pending', 0, :total,
                        CAST(:metadata AS jsonb))
                """
            ),
            {
                "id": str(job_id),
                "user_id": str(self._user_id),
                "job_type": job_type,
                "total": total,
                "metadata": json.dumps(metadata or {}),
            },
        )
        await self._db.commit()
        return job_id

    async def claim(self, job_type: Optional[str] = None) -> Optional[JobRecord]:
        """Atomically claim one pending job for this user."""
        clause = "AND job_type = :job_type" if job_type else ""
        params: dict[str, Any] = {"user_id": str(self._user_id)}
        if job_type:
            params["job_type"] = job_type
        result = await self._db.execute(
            text(
                f"""
                UPDATE jobs SET status = 'running', updated_at = NOW()
                WHERE id = (
                    SELECT id FROM jobs
                    WHERE user_id = :user_id AND status IN ('pending')
                    {clause}
                    ORDER BY created_at
                    FOR UPDATE SKIP LOCKED
                    LIMIT 1
                )
                RETURNING id, user_id, job_type, status, progress, total,
                          error_message, metadata
                """
            ),
            params,
        )
        row = result.mappings().one_or_none()
        await self._db.commit()
        return JobRecord.from_row(row) if row else None

    async def get(self, job_id: uuid.UUID) -> Optional[JobRecord]:
        result = await self._db.execute(
            text(
                """
                SELECT id, user_id, job_type, status, progress, total,
                       error_message, metadata
                FROM jobs WHERE id = :id AND user_id = :user_id
                """
            ),
            {"id": str(job_id), "user_id": str(self._user_id)},
        )
        row = result.mappings().one_or_none()
        return JobRecord.from_row(row) if row else None

    async def update_progress(self, job_id: uuid.UUID, progress: int,
                              *, total: Optional[int] = None) -> None:
        await self._db.execute(
            text(
                """
                UPDATE jobs
                SET progress = :progress,
                    total = COALESCE(:total, total),
                    updated_at = NOW()
                WHERE id = :id AND user_id = :user_id
                """
            ),
            {
                "progress": max(0, min(100, int(progress))),
                "total": total,
                "id": str(job_id),
                "user_id": str(self._user_id),
            },
        )
        await self._db.commit()

    async def complete(self, job_id: uuid.UUID,
                       result: Optional[dict[str, Any]] = None) -> None:
        merged = await self._merge_metadata(job_id, {"result": result or {}})
        await self._db.execute(
            text(
                """
                UPDATE jobs
                SET status = 'completed', progress = 100, error_message = NULL,
                    metadata = CAST(:metadata AS jsonb), updated_at = NOW()
                WHERE id = :id AND user_id = :user_id
                """
            ),
            {"metadata": json.dumps(merged), "id": str(job_id),
             "user_id": str(self._user_id)},
        )
        await self._db.commit()

    async def fail(self, job_id: uuid.UUID, error: str,
                   *, retry: bool = False) -> None:
        """Mark a job failed, or return it to `pending` when retryable."""
        status = "pending" if retry else "failed"
        merged = await self._merge_metadata(job_id, {"last_error": error})
        await self._db.execute(
            text(
                """
                UPDATE jobs
                SET status = :status, error_message = :error,
                    metadata = CAST(:metadata AS jsonb), updated_at = NOW()
                WHERE id = :id AND user_id = :user_id
                """
            ),
            {"status": status, "error": error[:1000],
             "metadata": json.dumps(merged), "id": str(job_id),
             "user_id": str(self._user_id)},
        )
        await self._db.commit()

    async def cancel(self, job_id: uuid.UUID) -> dict[str, int]:
        """Cancel a job that has not finished."""
        result = await self._db.execute(
            text(
                """
                UPDATE jobs SET status = 'cancelled', updated_at = NOW()
                WHERE id = :id AND user_id = :user_id
                  AND status IN ('pending', 'running')
                RETURNING id
                """
            ),
            {"id": str(job_id), "user_id": str(self._user_id)},
        )
        cancelled = len(result.fetchall())
        await self._db.commit()
        return {"cancelled": cancelled}

    async def list_jobs(self, limit: int = 25) -> list[dict[str, Any]]:
        result = await self._db.execute(
            text(
                """
                SELECT id, user_id, job_type, status, progress, total,
                       error_message, metadata
                FROM jobs WHERE user_id = :user_id
                ORDER BY created_at DESC LIMIT :limit
                """
            ),
            {"user_id": str(self._user_id), "limit": limit},
        )
        return [JobRecord.from_row(r).as_dict() for r in result.mappings().all()]

    async def _merge_metadata(self, job_id: uuid.UUID,
                              extra: dict[str, Any]) -> dict[str, Any]:
        row = await self._db.execute(
            text("SELECT metadata FROM jobs WHERE id = :id AND user_id = :user_id"),
            {"id": str(job_id), "user_id": str(self._user_id)},
        )
        current = row.mappings().one_or_none()
        merged = dict(current["metadata"] or {}) if current else {}
        merged.update(extra)
        return merged


async def run_job(
    db: AsyncSession,
    user_id: uuid.UUID,
    job_type: str,
    work: Callable[[JobService, JobRecord], Awaitable[dict[str, Any]]],
    *,
    total: int = 100,
    metadata: Optional[dict[str, Any]] = None,
    max_retries: int = 2,
) -> JobRecord:
    """Create and immediately execute one job in-process.

    Phase 2 scope: the pipeline is real (create/claim/progress/complete/fail), but
    execution is in-process rather than on a separate worker fleet. Swapping in a
    worker later only changes who calls `claim()`.
    """
    service = JobService(db, user_id)
    job_id = await service.create(job_type, total=total, metadata=metadata)
    record = await service.claim(job_type)
    if record is None:  # pragma: no cover - created moments ago
        raise RuntimeError(f"job {job_id} could not be claimed immediately")

    attempt = 0
    while True:
        try:
            result = await work(service, record)
            await service.complete(record.id, result)
            updated = await service.get(record.id)
            return updated or record
        except Exception as exc:
            attempt += 1
            logger.warning("Job %s (%s) failed attempt %d: %s",
                           record.id, job_type, attempt, exc)
            if attempt <= max_retries:
                await service.fail(record.id, f"{type(exc).__name__}: {exc}", retry=True)
                again = await service.claim(job_type)
                if again is None:
                    break
                record = again
                continue
            await service.fail(record.id, f"{type(exc).__name__}: {exc}")
            break

    updated = await service.get(record.id)
    return updated or record


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_job_service(db: AsyncSession, user_id: uuid.UUID) -> JobService:
    return JobService(db, user_id)