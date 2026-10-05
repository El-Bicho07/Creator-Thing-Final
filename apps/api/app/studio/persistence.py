"""Studio persistence models.

Studio reuses Phase 2 infrastructure deliberately:

- generated bodies go into the existing ``content_assets`` table (no second asset
  store), with Studio provenance in ``metadata``;
- memory and voice are reached through ``LongTermMemoryEngine`` and
  ``CreatorVoiceEngine``, never queried directly;
- LLM calls go through ``LLMGateway``, which records ``ai_calls``.

Only two tables are new (``studio_sessions``, ``studio_generations``), because no
existing table models a multi-step workspace session or per-version history.

All statements are parameterised. Ownership is enforced by PostgreSQL RLS, and no
function here accepts a caller-supplied user id as an authority: the user id
always comes from the authenticated dependency.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

# --------------------------------------------------------------------------- #
# Session steps
# --------------------------------------------------------------------------- #

SESSION_STEPS = ("context", "generate", "review", "refine", "done")

SESSION_STATUSES = ("active", "completed", "archived")


@dataclass
class StudioSessionRecord:
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    status: str
    current_step: str
    brief: Optional[str]
    idea_id: Optional[uuid.UUID]
    last_capability: Optional[str]
    metadata: Dict[str, Any]
    created_at: Any
    updated_at: Any

    @classmethod
    def from_row(cls, row: Any) -> "StudioSessionRecord":
        return cls(
            id=row.id,
            user_id=row.user_id,
            title=row.title,
            status=row.status,
            current_step=row.current_step,
            brief=row.brief,
            idea_id=row.idea_id,
            last_capability=row.last_capability,
            metadata=dict(row.metadata or {}),
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    def as_dict(self) -> Dict[str, Any]:
        return {
            "id": str(self.id),
            "title": self.title,
            "status": self.status,
            "current_step": self.current_step,
            "brief": self.brief,
            "idea_id": str(self.idea_id) if self.idea_id else None,
            "last_capability": self.last_capability,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


@dataclass
class StudioGenerationRecord:
    id: uuid.UUID
    user_id: uuid.UUID
    session_id: uuid.UUID
    asset_id: uuid.UUID
    version: int
    capability: str
    prompt_name: Optional[str]
    prompt_version: Optional[str]
    parent_generation_id: Optional[uuid.UUID]
    critique: Optional[Dict[str, Any]]
    input_tokens: int
    output_tokens: int
    estimated_cost: float
    latency_ms: int
    creator_approved: bool
    metadata: Dict[str, Any]
    created_at: Any

    @classmethod
    def from_row(cls, row: Any) -> "StudioGenerationRecord":
        return cls(
            id=row.id,
            user_id=row.user_id,
            session_id=row.session_id,
            asset_id=row.asset_id,
            version=row.version,
            capability=row.capability,
            prompt_name=row.prompt_name,
            prompt_version=row.prompt_version,
            parent_generation_id=row.parent_generation_id,
            critique=dict(row.critique) if row.critique else None,
            input_tokens=row.input_tokens or 0,
            output_tokens=row.output_tokens or 0,
            estimated_cost=float(row.estimated_cost or 0.0),
            latency_ms=row.latency_ms or 0,
            creator_approved=bool(row.creator_approved),
            metadata=dict(row.metadata or {}),
            created_at=row.created_at,
        )


# --------------------------------------------------------------------------- #
# Repository
# --------------------------------------------------------------------------- #

class StudioRepository:
    """Data access for Studio, scoped to one authenticated creator.

    The user id is captured at construction from the auth dependency and used in
    every WHERE clause. That is defence in depth: RLS is the authoritative
    boundary, so a bug here degrades to "returns nothing" rather than
    "returns another creator's row".
    """

    def __init__(self, db: AsyncSession, user_id: uuid.UUID) -> None:
        self._db = db
        self._user_id = user_id

    # ---------------- sessions ----------------

    async def create_session(
        self,
        *,
        title: str,
        brief: Optional[str] = None,
        idea_id: Optional[uuid.UUID] = None,
        current_step: str = "context",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> StudioSessionRecord:
        row = (await self._db.execute(
            text("""
                INSERT INTO studio_sessions
                    (user_id, title, brief, idea_id, current_step, metadata)
                VALUES (:u, :t, :b, :i, :s, CAST(:m AS jsonb))
                RETURNING *
            """),
            {
                "u": str(self._user_id),
                "t": title,
                "b": brief,
                "i": str(idea_id) if idea_id else None,
                "s": current_step,
                "m": _json(metadata or {}),
            },
        )).mappings().one()
        await self._db.commit()
        return StudioSessionRecord.from_row(row)

    async def get_session(self, session_id: uuid.UUID) -> Optional[StudioSessionRecord]:
        row = (await self._db.execute(
            text("SELECT * FROM studio_sessions WHERE id = :i AND user_id = :u"),
            {"i": str(session_id), "u": str(self._user_id)},
        )).mappings().first()
        return StudioSessionRecord.from_row(row) if row else None

    async def list_sessions(
        self, *, limit: int = 25, status: Optional[str] = None
    ) -> List[StudioSessionRecord]:
        params: Dict[str, Any] = {"u": str(self._user_id), "limit": limit}
        clause = "user_id = :u"
        if status:
            clause += " AND status = :status"
            params["status"] = status
        rows = (await self._db.execute(
            text(f"""
                SELECT * FROM studio_sessions
                WHERE {clause}
                ORDER BY updated_at DESC
                LIMIT :limit
            """),
            params,
        )).mappings().all()
        return [StudioSessionRecord.from_row(r) for r in rows]

    async def update_session(
        self,
        session_id: uuid.UUID,
        *,
        title: Optional[str] = None,
        brief: Optional[str] = None,
        status: Optional[str] = None,
        current_step: Optional[str] = None,
        idea_id: Optional[uuid.UUID] = None,
        last_capability: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[StudioSessionRecord]:
        """Partial update. `None` means 'leave unchanged'."""
        sets: List[str] = []
        params: Dict[str, Any] = {"i": str(session_id), "u": str(self._user_id)}

        if title is not None:
            sets.append("title = :title")
            params["title"] = title
        if brief is not None:
            sets.append("brief = :brief")
            params["brief"] = brief
        if status is not None:
            sets.append("status = :status")
            params["status"] = status
        if current_step is not None:
            sets.append("current_step = :step")
            params["step"] = current_step
        if idea_id is not None:
            sets.append("idea_id = :idea")
            params["idea"] = str(idea_id)
        if last_capability is not None:
            sets.append("last_capability = :cap")
            params["cap"] = last_capability
        if metadata is not None:
            sets.append("metadata = metadata || CAST(:m AS jsonb)")
            params["m"] = _json(metadata)

        if not sets:
            return await self.get_session(session_id)

        row = (await self._db.execute(
            text(f"""
                UPDATE studio_sessions SET {', '.join(sets)}
                WHERE id = :i AND user_id = :u
                RETURNING *
            """),
            params,
        )).mappings().first()
        await self._db.commit()
        return StudioSessionRecord.from_row(row) if row else None

    async def delete_session(self, session_id: uuid.UUID) -> bool:
        """Delete a session, its generation history, and the content it generated.

        The FK is `studio_generations.asset_id -> content_assets(id) ON DELETE
        CASCADE`, which cascades in the *asset -> generation* direction only.
        Deleting the session therefore removes the generation rows but leaves the
        generated `content_assets` rows (and their `chunks` embeddings) orphaned.

        Those assets were produced by Studio and have no meaning outside this
        session, so they are removed explicitly. This is still an explicit creator
        action: Studio never deletes content on its own.
        """
        asset_ids = (await self._db.execute(
            text("""
                SELECT asset_id FROM studio_generations
                WHERE session_id = :s AND user_id = :u
            """),
            {"s": str(session_id), "u": str(self._user_id)},
        )).scalars().all()

        result = await self._db.execute(
            text("DELETE FROM studio_sessions WHERE id = :i AND user_id = :u"),
            {"i": str(session_id), "u": str(self._user_id)},
        )
        deleted = bool(result.rowcount)

        if deleted and asset_ids:
            # A real Python list bound as an array parameter. Hand-building a
            # Postgres array literal binds as text rather than uuid[], which
            # asyncpg rejects.
            ids = [a if isinstance(a, uuid.UUID) else uuid.UUID(str(a))
                   for a in asset_ids]
            # Only the asset is deleted. Its `chunks` rows (and their
            # embeddings) cascade from `content_assets.asset_id ON DELETE CASCADE`.
            #
            # Deleting chunks explicitly would have been both redundant and a
            # boundary violation: `chunks` is the Memory Engine's vector store,
            # and Studio must never manipulate it directly.
            await self._db.execute(
                text("DELETE FROM content_assets WHERE id = ANY(:a) AND user_id = :u"),
                {"a": ids, "u": str(self._user_id)},
            )

        await self._db.commit()
        return deleted

    # ---------------- generations ----------------

    async def next_version(self, session_id: uuid.UUID) -> int:
        value = (await self._db.execute(
            text("""
                SELECT COALESCE(MAX(version), 0) + 1 AS next
                FROM studio_generations
                WHERE session_id = :s AND user_id = :u
            """),
            {"s": str(session_id), "u": str(self._user_id)},
        )).scalar()
        return int(value or 1)

    async def create_generation(
        self,
        *,
        session_id: uuid.UUID,
        asset_id: uuid.UUID,
        version: int,
        capability: str,
        prompt_name: Optional[str] = None,
        prompt_version: Optional[str] = None,
        parent_generation_id: Optional[uuid.UUID] = None,
        critique: Optional[Dict[str, Any]] = None,
        input_tokens: int = 0,
        output_tokens: int = 0,
        estimated_cost: float = 0.0,
        latency_ms: int = 0,
        creator_approved: bool = False,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> StudioGenerationRecord:
        row = (await self._db.execute(
            text("""
                INSERT INTO studio_generations
                    (user_id, session_id, asset_id, version, capability,
                     prompt_name, prompt_version, parent_generation_id, critique,
                     input_tokens, output_tokens, estimated_cost, latency_ms,
                     creator_approved, metadata)
                VALUES (:u, :s, :a, :v, :c, :pn, :pv, :parent,
                        CAST(:crit AS jsonb), :it, :ot, :cost, :lat,
                        :appr, CAST(:m AS jsonb))
                RETURNING *
            """),
            {
                "u": str(self._user_id),
                "s": str(session_id),
                "a": str(asset_id),
                "v": version,
                "c": capability,
                "pn": prompt_name,
                "pv": prompt_version,
                "parent": str(parent_generation_id) if parent_generation_id else None,
                "crit": _json(critique) if critique else None,
                "it": input_tokens,
                "ot": output_tokens,
                "cost": estimated_cost,
                "lat": latency_ms,
                "appr": creator_approved,
                "m": _json(metadata or {}),
            },
        )).mappings().one()
        await self._db.commit()
        return StudioGenerationRecord.from_row(row)

    async def list_generations(
        self, session_id: uuid.UUID, *, limit: int = 50
    ) -> List[StudioGenerationRecord]:
        rows = (await self._db.execute(
            text("""
                SELECT * FROM studio_generations
                WHERE session_id = :s AND user_id = :u
                ORDER BY version ASC
                LIMIT :limit
            """),
            {"s": str(session_id), "u": str(self._user_id), "limit": limit},
        )).mappings().all()
        return [StudioGenerationRecord.from_row(r) for r in rows]

    async def get_generation(
        self, generation_id: uuid.UUID
    ) -> Optional[StudioGenerationRecord]:
        row = (await self._db.execute(
            text("SELECT * FROM studio_generations WHERE id = :i AND user_id = :u"),
            {"i": str(generation_id), "u": str(self._user_id)},
        )).mappings().first()
        return StudioGenerationRecord.from_row(row) if row else None

    async def latest_generation(
        self, session_id: uuid.UUID
    ) -> Optional[StudioGenerationRecord]:
        row = (await self._db.execute(
            text("""
                SELECT * FROM studio_generations
                WHERE session_id = :s AND user_id = :u
                ORDER BY version DESC
                LIMIT 1
            """),
            {"s": str(session_id), "u": str(self._user_id)},
        )).mappings().first()
        return StudioGenerationRecord.from_row(row) if row else None

    async def attach_critique(
        self, generation_id: uuid.UUID, critique: Dict[str, Any]
    ) -> Optional[StudioGenerationRecord]:
        row = (await self._db.execute(
            text("""
                UPDATE studio_generations SET critique = CAST(:crit AS jsonb)
                WHERE id = :i AND user_id = :u
                RETURNING *
            """),
            {
                "i": str(generation_id),
                "u": str(self._user_id),
                "crit": _json(critique),
            },
        )).mappings().first()
        await self._db.commit()
        return StudioGenerationRecord.from_row(row) if row else None

    async def set_approved(
        self, generation_id: uuid.UUID, approved: bool
    ) -> Optional[StudioGenerationRecord]:
        """Record an explicit creator approval decision.

        Studio never calls this on the creator's behalf.
        """
        row = (await self._db.execute(
            text("""
                UPDATE studio_generations SET creator_approved = :a
                WHERE id = :i AND user_id = :u
                RETURNING *
            """),
            {
                "i": str(generation_id),
                "u": str(self._user_id),
                "a": approved,
            },
        )).mappings().first()
        await self._db.commit()
        return StudioGenerationRecord.from_row(row) if row else None

    async def delete_generation(self, generation_id: uuid.UUID) -> bool:
        """Delete one version AND its content asset. Explicit creator action.

        The asset row must be deleted explicitly: the FK
        `studio_generations.asset_id -> content_assets(id) ON DELETE CASCADE` only
        cascades in the other direction (deleting the asset removes the version),
        so deleting the version alone would orphan the generated text in
        `content_assets`. Deleting the asset in turn cascades to its `chunks`.
        """
        asset_id = (await self._db.execute(
            text("""
                SELECT asset_id FROM studio_generations
                WHERE id = :i AND user_id = :u
            """),
            {"i": str(generation_id), "u": str(self._user_id)},
        )).scalar()

        result = await self._db.execute(
            text("DELETE FROM studio_generations WHERE id = :i AND user_id = :u"),
            {"i": str(generation_id), "u": str(self._user_id)},
        )
        deleted = bool(result.rowcount)

        if deleted and asset_id:
            # The asset's chunks cascade from the FK. Studio must not touch
            # `chunks` itself -- that is the Memory Engine's vector store.
            await self._db.execute(
                text("DELETE FROM content_assets WHERE id = :a AND user_id = :u"),
                {"a": str(asset_id), "u": str(self._user_id)},
            )

        await self._db.commit()
        return deleted

    # ---------------- content assets ----------------

    async def create_asset(
        self,
        *,
        title: str,
        raw_text: str,
        source_type: str,
        metadata: Optional[Dict[str, Any]] = None,
        external_id: Optional[str] = None,
    ) -> uuid.UUID:
        """Create a `content_assets` row for generated content.

        Studio does not maintain a second asset store. The body lives here, in the
        table Memory Engine already chunks and RLS already protects.
        """
        row = (await self._db.execute(
            text("""
                INSERT INTO content_assets
                    (user_id, title, source_type, raw_text, metadata, external_id)
                VALUES (:u, :t, :st, :txt, CAST(:m AS jsonb), :ext)
                RETURNING id
            """),
            {
                "u": str(self._user_id),
                "t": title,
                "st": source_type,
                "txt": raw_text,
                "m": _json(metadata or {}),
                "ext": external_id,
            },
        )).scalar_one()
        await self._db.commit()
        return uuid.UUID(str(row))

    async def get_asset_text(self, asset_id: uuid.UUID) -> Optional[str]:
        return (await self._db.execute(
            text("SELECT raw_text FROM content_assets WHERE id = :a AND user_id = :u"),
            {"a": str(asset_id), "u": str(self._user_id)},
        )).scalar()

    async def update_asset_text(
        self, asset_id: uuid.UUID, raw_text: str
    ) -> bool:
        """Overwrite a version's body. Used for explicit creator edits.

        Refinement itself never calls this: it creates a new version instead, so
        the previous text is always recoverable.
        """
        result = await self._db.execute(
            text("""
                UPDATE content_assets SET raw_text = :txt
                WHERE id = :a AND user_id = :u
            """),
            {"a": str(asset_id), "u": str(self._user_id), "txt": raw_text},
        )
        await self._db.commit()
        return bool(result.rowcount)

    async def list_prior_assets(
        self, *, limit: int = 5, exclude_asset_id: Optional[uuid.UUID] = None
    ) -> List[Dict[str, Any]]:
        """Recent Studio output, used as prior-work context.

        Ordered newest-first and excluded by id so a refinement does not treat the
        text it is rewriting as its own "prior work".
        """
        params: Dict[str, Any] = {"u": str(self._user_id), "limit": limit}
        exclude = ""
        if exclude_asset_id:
            exclude = "AND metadata->>'studio_session_id' IS DISTINCT FROM :ex"
            params["ex"] = str(exclude_asset_id)
        rows = (await self._db.execute(
            text(f"""
                SELECT id, title, raw_text, source_type, metadata, created_at
                FROM content_assets
                WHERE user_id = :u
                  AND metadata->>'produced_by' = 'studio'
                  {exclude}
                ORDER BY created_at DESC
                LIMIT :limit
            """),
            params,
        )).mappings().all()
        return [
            {
                "id": str(r.id),
                "title": r.title,
                "text": (r.raw_text or "")[:2000],
                "source_type": r.source_type,
                "metadata": dict(r.metadata or {}),
            }
            for r in rows
        ]


def _json(payload: Any) -> str:
    import json

    return json.dumps(payload, ensure_ascii=False, default=str)
