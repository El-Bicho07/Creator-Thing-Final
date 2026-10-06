"""Today plan persistence and state transitions.

Reuses the existing `plan_items` table (migration 007). No new table: a "day" is
just a `plan_date`, and a Producer recommendation becomes a row rather than a
separate entity that could disagree with the plan about whether work was accepted.

All statements are parameterised and scoped to the authenticated creator. The user
id comes from the auth dependency, never from the caller, so a bug here degrades to
"returns nothing" rather than "returns another creator's plan" — and RLS is the
authoritative boundary regardless.
"""
from __future__ import annotations

import json
import uuid
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.producer.contracts import (
    ALLOWED_TRANSITIONS,
    PRIORITY_VALUE,
    ActionKind,
    ClaimKind,
    Evidence,
    ProducerRecommendation,
    TodayItem,
    TodayItemStatus,
)

#: What a plan_items row looks like when read back.
_SELECT = """
    SELECT id, user_id, plan_date, idea_id, title, platform, priority,
           estimated_minutes, completed, metadata, status, reason, reason_kind,
           action_kind, capability, rank, dedupe_key, studio_session_id,
           generation_id, source, recommendation, priority_band,
           created_at, updated_at
    FROM plan_items
"""


class InvalidTransition(Exception):
    """An illegal Today item state change.

    Raised instead of relying on the database so the API can return a 409 with an
    explanation, and so the legal-transition table has exactly one definition.
    """

    def __init__(self, current: TodayItemStatus, requested: TodayItemStatus) -> None:
        allowed = sorted(s.value for s in ALLOWED_TRANSITIONS.get(current, set()))
        super().__init__(
            f"cannot move a Today item from '{current.value}' to "
            f"'{requested.value}'. Allowed from here: "
            + (", ".join(allowed) if allowed else "none (terminal state)")
        )
        self.current = current
        self.requested = requested


class TodayRepository:
    """Data access for the Today plan, scoped to one creator."""

    def __init__(self, db: AsyncSession, user_id: uuid.UUID) -> None:
        self._db = db
        self._user_id = user_id

    # ------------------------------------------------------------------ #
    # Reads
    # ------------------------------------------------------------------ #

    async def list_for_date(self, plan_date: date) -> List[TodayItem]:
        rows = (await self._db.execute(
            text(_SELECT + " WHERE user_id = :u AND plan_date = :d ORDER BY rank, created_at"),
            {"u": str(self._user_id), "d": plan_date},
        )).mappings().all()
        return [self._to_item(r) for r in rows]

    async def get(self, item_id: uuid.UUID) -> Optional[TodayItem]:
        row = (await self._db.execute(
            text(_SELECT + " WHERE id = :i AND user_id = :u"),
            {"i": str(item_id), "u": str(self._user_id)},
        )).mappings().first()
        return self._to_item(row) if row else None

    async def open_items(self, plan_date: date) -> List[TodayItem]:
        """Items still actionable, used for duplicate prevention."""
        rows = (await self._db.execute(
            text(_SELECT + """
                WHERE user_id = :u AND plan_date = :d
                  AND status IN ('planned', 'in_progress')
                ORDER BY rank
            """),
            {"u": str(self._user_id), "d": plan_date},
        )).mappings().all()
        return [self._to_item(r) for r in rows]

    async def last_planned_date(self) -> Optional[date]:
        value = (await self._db.execute(
            text("SELECT MAX(plan_date) FROM plan_items WHERE user_id = :u"),
            {"u": str(self._user_id)},
        )).scalar()
        return value

    # ------------------------------------------------------------------ #
    # Writes
    # ------------------------------------------------------------------ #

    async def create_from_recommendation(
        self,
        recommendation: ProducerRecommendation,
        plan_date: date,
        *,
        rank: int,
        idea_id: Optional[uuid.UUID] = None,
        studio_session_id: Optional[uuid.UUID] = None,
        generation_id: Optional[uuid.UUID] = None,
        source: str = "producer",
    ) -> Optional[TodayItem]:
        """Persist a recommendation as a Today item.

        Returns None when a duplicate already exists for this creator and day. The
        partial unique index on `(user_id, plan_date, dedupe_key)` is the real
        guarantee; catching the violation here turns it into a skip rather than an
        error, because a duplicate is the expected outcome of re-planning.
        """
        from sqlalchemy.exc import IntegrityError

        try:
            row = (await self._db.execute(
                text("""
                    INSERT INTO plan_items
                        (user_id, plan_date, idea_id, title, platform, priority,
                         priority_band, estimated_minutes, status, reason,
                         reason_kind, action_kind, capability, rank, dedupe_key,
                         studio_session_id, generation_id, source, recommendation,
                         completed)
                    VALUES (:u, :d, :idea, :title, :platform, :priority,
                            :band, :minutes, 'planned', :reason, :reason_kind,
                            :action, :capability, :rank, :dedupe,
                            :session, :generation, :source, CAST(:rec AS jsonb),
                            FALSE)
                    ON CONFLICT (user_id, plan_date, dedupe_key)
                        WHERE dedupe_key IS NOT NULL
                    DO NOTHING
                    RETURNING *
                """),
                {
                    "u": str(self._user_id),
                    "d": plan_date,
                    "idea": str(idea_id) if idea_id else None,
                    "title": recommendation.title[:255],
                    "platform": recommendation.platform,
                    "priority": PRIORITY_VALUE.get(recommendation.priority, 5),
                    "band": recommendation.priority.value,
                    "minutes": recommendation.estimated_minutes,
                    "reason": recommendation.reason,
                    "reason_kind": recommendation.reason_kind.value,
                    "action": recommendation.action_kind.value,
                    "capability": recommendation.suggested_capability,
                    "rank": rank,
                    "dedupe": f"{recommendation.kind.value}:{_stable_key(recommendation)}",
                    "session": str(studio_session_id) if studio_session_id else None,
                    "generation": str(generation_id) if generation_id else None,
                    "source": source,
                    # Store the FULL recommendation, not a projection, so the
                    # row round-trips into a ProducerRecommendation and the
                    # creator can later see exactly what was decided and why.
                    "rec": json.dumps(
                        recommendation.model_dump(mode="json"), default=str
                    ),
                },
            )).mappings().first()
        except IntegrityError:
            await self._db.rollback()
            return None

        await self._db.commit()
        return self._to_item(row) if row else None

    async def create_manual(
        self,
        *,
        title: str,
        plan_date: date,
        platform: str = "reel",
        estimated_minutes: int = 30,
        reason: Optional[str] = None,
        action_kind: Optional[ActionKind] = None,
        idea_id: Optional[uuid.UUID] = None,
    ) -> TodayItem:
        """A creator-added item.

        `source='creator'` means the Producer will never overwrite or remove it.
        """
        row = (await self._db.execute(
            text("""
                INSERT INTO plan_items
                    (user_id, plan_date, idea_id, title, platform, priority,
                     priority_band, estimated_minutes, status, reason,
                     action_kind, rank, source, completed)
                VALUES (:u, :d, :idea, :title, :platform, 5, 'medium', :minutes,
                        'planned', :reason, :action,
                        COALESCE((SELECT MAX(rank) + 1 FROM plan_items
                                  WHERE user_id = :u AND plan_date = :d), 0),
                        'creator', FALSE)
                RETURNING *
            """),
            {
                "u": str(self._user_id),
                "d": plan_date,
                "idea": str(idea_id) if idea_id else None,
                "title": title[:255],
                "platform": platform,
                "minutes": estimated_minutes,
                "reason": reason,
                "action": action_kind.value if action_kind else None,
            },
        )).mappings().one()
        await self._db.commit()
        return self._to_item(row)

    async def transition(
        self, item_id: uuid.UUID, requested: TodayItemStatus
    ) -> TodayItem:
        """Move an item to a new state, validating the transition.

        Raises `InvalidTransition` for an illegal move so the caller can return 409.
        """
        current = await self.get(item_id)
        if current is None:
            raise LookupError("today item not found")

        allowed = ALLOWED_TRANSITIONS.get(current.status, set())
        if requested not in allowed:
            raise InvalidTransition(current.status, requested)

        row = (await self._db.execute(
            text("""
                UPDATE plan_items
                SET status = :status, completed = :completed, updated_at = NOW()
                WHERE id = :i AND user_id = :u
                RETURNING *
            """),
            {
                "status": requested.value,
                "completed": requested is TodayItemStatus.COMPLETED,
                "i": str(item_id),
                "u": str(self._user_id),
            },
        )).mappings().first()
        await self._db.commit()
        return self._to_item(row)

    async def update(
        self,
        item_id: uuid.UUID,
        *,
        title: Optional[str] = None,
        reason: Optional[str] = None,
        platform: Optional[str] = None,
        estimated_minutes: Optional[int] = None,
        studio_session_id: Optional[uuid.UUID] = None,
        generation_id: Optional[uuid.UUID] = None,
    ) -> Optional[TodayItem]:
        sets: List[str] = []
        params: Dict[str, Any] = {"i": str(item_id), "u": str(self._user_id)}
        for column, value, cast in (
            ("title", title, None),
            ("reason", reason, None),
            ("platform", platform, None),
            ("estimated_minutes", estimated_minutes, int),
            ("studio_session_id", studio_session_id, str),
            ("generation_id", generation_id, str),
        ):
            if value is None:
                continue
            sets.append(f"{column} = :{column}")
            params[column] = cast(value) if cast else value

        if not sets:
            return await self.get(item_id)

        row = (await self._db.execute(
            text(f"""
                UPDATE plan_items SET {', '.join(sets)}, updated_at = NOW()
                WHERE id = :i AND user_id = :u
                RETURNING *
            """),
            params,
        )).mappings().first()
        await self._db.commit()
        return self._to_item(row) if row else None

    async def delete(self, item_id: uuid.UUID) -> bool:
        result = await self._db.execute(
            text("DELETE FROM plan_items WHERE id = :i AND user_id = :u"),
            {"i": str(item_id), "u": str(self._user_id)},
        )
        deleted = bool(result.rowcount)
        await self._db.commit()
        return deleted

    async def sync_progress_from_studio(self, session_id: uuid.UUID) -> int:
        """Reflect Studio progress on items handed off to a session.

        Studio owns generation state. Today reads it rather than duplicating it, so
        the two surfaces cannot disagree about whether work is done.
        """
        # Take the id of the newest generation, not a fresh UUID: the item must
        # point at the version that actually exists.
        latest = (await self._db.execute(
            text("""
                SELECT id FROM studio_generations
                WHERE session_id = :s AND user_id = :u
                ORDER BY version DESC
                LIMIT 1
            """),
            {"s": str(session_id), "u": str(self._user_id)},
        )).scalar()

        if not latest:
            return 0

        result = await self._db.execute(
            text("""
                UPDATE plan_items
                SET status = 'completed', completed = TRUE, generation_id = :gen,
                    updated_at = NOW()
                WHERE studio_session_id = :s AND user_id = :u
                  AND status IN ('planned', 'in_progress')
            """),
            {"gen": str(latest), "s": str(session_id), "u": str(self._user_id)},
        )
        await self._db.commit()
        return int(result.rowcount or 0)

    # ------------------------------------------------------------------ #
    # Mapping
    # ------------------------------------------------------------------ #

    @staticmethod
    def _to_item(row) -> TodayItem:
        recommendation_raw = row["recommendation"] or {}
        evidence: List[Evidence] = []
        reconstructed: Optional[ProducerRecommendation] = None
        if isinstance(recommendation_raw, dict):
            for item in recommendation_raw.get("evidence") or []:
                try:
                    evidence.append(Evidence(**item))
                except Exception:
                    # A stored evidence row that no longer validates must not break
                    # the whole plan render.
                    continue
            try:
                reconstructed = ProducerRecommendation(**recommendation_raw)
            except Exception:
                # The snapshot may predate a contract change. Degrade to the raw
                # dict rather than failing the whole plan.
                reconstructed = None

        return TodayItem(
            id=row["id"],
            plan_date=row["plan_date"],
            title=row["title"],
            status=TodayItemStatus(row["status"]),
            priority=_priority_from(row),
            priority_rank=row["priority"] or 5,
            rank=row["rank"] or 0,
            action_kind=ActionKind(row["action_kind"]) if row["action_kind"] else None,
            capability=row["capability"],
            platform=row["platform"],
            estimated_minutes=row["estimated_minutes"] or 30,
            reason=row["reason"],
            reason_kind=ClaimKind(row["reason_kind"]) if row["reason_kind"] else None,
            source=row["source"] or "creator",
            idea_id=row["idea_id"],
            studio_session_id=row["studio_session_id"],
            generation_id=row["generation_id"],
            dedupe_key=row["dedupe_key"],
            evidence=evidence,
            recommendation=reconstructed,
            completed=bool(row["completed"]),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )


def _priority_from(row) -> Any:
    """Prefer the band; fall back to the legacy integer."""
    band = row["priority_band"] if "priority_band" in row.keys() else None
    if band:
        from app.producer.contracts import Priority

        try:
            return Priority(band)
        except ValueError:
            pass
    from app.producer.contracts import Priority

    value = row["priority"] or 5
    if value <= 2:
        return Priority.HIGH
    if value <= 6:
        return Priority.MEDIUM
    return Priority.LOW


def _stable_key(recommendation: ProducerRecommendation) -> str:
    """A stable dedupe key for a recommendation.

    Derived from the evidence rather than the title, so re-planning the same
    situation produces the same key and the item is de-duplicated instead of
    duplicated. Falls back to the title when there is no evidence, which is the
    only case for `NO_ACTION`.
    """
    if recommendation.evidence:
        first = recommendation.evidence[0]
        return f"{first.kind.value}:{first.ref_id}"[:180]
    return recommendation.title[:180]


__all__ = ["TodayRepository", "InvalidTransition", "TodayItemStatus"]
