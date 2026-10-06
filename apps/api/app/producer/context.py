"""Producer context assembly.

The Producer is the decision layer. Like Studio's `ContextAssembler`, it is the
**only** component that reads creator context, and it reads it exclusively through
Phase 2/3 services:

    creator profile   -> SQL on `creator_profiles` (platform-owned)
    voice             -> `CreatorVoiceEngine.get_profile()`
    memory            -> `LongTermMemoryEngine.retrieve_for_prompt()`
    unfinished work   -> `studio_sessions` / `studio_generations`
    ideas             -> `ideas`
    recent content    -> `content_assets`
    performance       -> `performance_records` (READ ONLY; Growth is not built)
    prior Today items -> `plan_items`

Hard boundaries this module enforces:

- No provider SDK, no embedding model, no `chunks` SQL. Memory owns vectors.
- Retrieved memory and creator content are UNTRUSTED and pass through
  `app.studio.safety` before entering a prompt.
- Performance data is read, never interpreted: the Producer does not build
  analytics, and a sparse performance history must not become a fabricated claim.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.memory import MemoryEngine, MemoryQuery, get_memory_engine
from app.producer.contracts import (
    Evidence,
    EvidenceKind,
    ProducerContextSummary,
    TodayItemStatus,
)
from app.voice import VoiceEngine, get_voice_engine

logger = get_logger(__name__)


@dataclass
class UnfinishedWork:
    """A Studio generation the creator did not finish."""

    generation_id: uuid.UUID
    session_id: uuid.UUID
    session_title: str
    capability: str
    version: int
    has_critique: bool
    text_preview: str
    created_at: Any


@dataclass
class CreatorContext:
    """Everything the Producer may reason about."""

    plan_date: date
    time_budget_minutes: int = 120

    full_name: Optional[str] = None
    niche: Optional[str] = None
    target_audience: Optional[str] = None
    primary_platform: Optional[str] = None
    content_goals: List[str] = field(default_factory=list)

    voice_summary: str = ""
    has_voice: bool = False
    forbidden_words: List[str] = field(default_factory=list)

    memory_text: str = ""
    memory_refs: List[Evidence] = field(default_factory=list)

    unfinished: List[UnfinishedWork] = field(default_factory=list)
    open_ideas: List[Dict[str, Any]] = field(default_factory=list)
    recent_assets: List[Dict[str, Any]] = field(default_factory=list)

    #: Performance is a COUNT plus the single strongest signal, never a summary
    #: the Producer could over-read. Growth/Analytics is explicitly not built.
    performance_count: int = 0
    best_performing_asset_title: Optional[str] = None

    planned_today: List[Dict[str, Any]] = field(default_factory=list)
    open_carryover: List[Dict[str, Any]] = field(default_factory=list)
    days_since_last_plan: Optional[int] = None

    notes: List[str] = field(default_factory=list)

    def summary(self) -> ProducerContextSummary:
        """Non-sensitive counts for the API response and observability."""
        return ProducerContextSummary(
            has_profile=bool(self.niche),
            has_voice=self.has_voice,
            memory_chunks=len(self.memory_refs),
            unfinished_generations=len(self.unfinished),
            open_ideas=len(self.open_ideas),
            recent_assets=len(self.recent_assets),
            performance_records=self.performance_count,
            days_since_last_plan=self.days_since_last_plan,
            notes=list(self.notes),
        )

    def prompt_variables(self) -> Dict[str, str]:
        """Blocks for the producer prompt, each injection-hardened."""
        from app.studio import safety

        return {
            "creator_profile": safety.wrap("studio_context", self.profile_block(), max_chars=2_000),
            "creator_voice": safety.wrap("creator_voice", self.voice_summary, max_chars=1_200),
            "content_memory": safety.wrap("retrieved_memory", self.memory_text, max_chars=3_000),
            "unfinished_work": safety.wrap("prior_work", self.unfinished_block(), max_chars=2_000),
            "existing_ideas": safety.wrap("prior_work", self.ideas_block(), max_chars=1_500),
            "existing_content": safety.wrap("prior_work", self.assets_block(), max_chars=1_500),
            "planned_today": safety.wrap("studio_context", self.plan_block(), max_chars=1_500),
            "time_budget_minutes": str(self.time_budget_minutes),
            "current_date": self.plan_date.isoformat(),
            "recent_performance": self.performance_block(),
            "active_lessons": "",
        }

    # ------------------------------------------------------------------ #
    # Prompt blocks
    # ------------------------------------------------------------------ #

    def profile_block(self) -> str:
        parts = []
        if self.niche:
            parts.append(f"Niche: {self.niche}")
        if self.target_audience:
            parts.append(f"Audience: {self.target_audience}")
        if self.primary_platform:
            parts.append(f"Primary platform: {self.primary_platform}")
        if self.content_goals:
            parts.append("Goals: " + ", ".join(self.content_goals[:5]))
        return "\n".join(parts)

    def unfinished_block(self) -> str:
        if not self.unfinished:
            return ""
        lines = []
        for work in self.unfinished[:6]:
            state = "critiqued" if work.has_critique else "not yet critiqued"
            lines.append(
                f"- {work.session_title} · {work.capability} v{work.version} "
                f"({state}) · {work.text_preview[:120]}"
            )
        return "\n".join(lines)

    def ideas_block(self) -> str:
        if not self.open_ideas:
            return ""
        return "\n".join(f"- {i['title']}" for i in self.open_ideas[:6])

    def assets_block(self) -> str:
        if not self.recent_assets:
            return ""
        return "\n".join(f"- {a['title']}" for a in self.recent_assets[:6])

    def plan_block(self) -> str:
        if not self.planned_today:
            return "(nothing planned yet)"
        return "\n".join(
            f"- [{i['status']}] {i['title']}" for i in self.planned_today[:10]
        )

    def performance_block(self) -> str:
        """Performance as raw counts only.

        The Producer must not be handed a conclusion it could then present to the
        creator as insight. Growth owns interpretation.
        """
        if self.performance_count == 0:
            return "(no performance records)"
        parts = [f"records: {self.performance_count}"]
        if self.best_performing_asset_title:
            parts.append(f"highest recorded views: {self.best_performing_asset_title}")
        return ", ".join(parts)


class ProducerContextAssembler:
    """Builds `CreatorContext` from platform services."""

    MEMORY_TOP_K = 5
    MEMORY_MAX_CHARS = 3_000

    def __init__(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        *,
        memory: Optional[MemoryEngine] = None,
        voice: Optional[VoiceEngine] = None,
    ) -> None:
        self._db = db
        self._user_id = user_id
        self._memory = memory
        self._voice = voice

    @property
    def memory_engine(self) -> MemoryEngine:
        if self._memory is None:
            self._memory = get_memory_engine(self._db, self._user_id)
        return self._memory

    @property
    def voice_engine(self) -> VoiceEngine:
        if self._voice is None:
            self._voice = get_voice_engine(self._db, self._user_id)
        return self._voice

    async def assemble(
        self,
        plan_date: date,
        *,
        time_budget_minutes: int = 120,
    ) -> CreatorContext:
        context = CreatorContext(plan_date=plan_date)

        await self._load_profile(context)
        await self._load_voice(context)
        await self._load_memory(context, plan_date)
        await self._load_unfinished(context)
        await self._load_ideas(context)
        await self._load_assets(context)
        await self._load_performance(context)
        await self._load_plan(context, plan_date)

        context.time_budget_minutes = time_budget_minutes
        self._assess_sparsity(context)
        return context

    # ------------------------------------------------------------------ #
    # Loaders
    # ------------------------------------------------------------------ #

    async def _load_profile(self, context: CreatorContext) -> None:
        row = (await self._db.execute(
            text("""
                SELECT full_name, niche, target_audience, primary_platform,
                       content_goals
                FROM creator_profiles WHERE user_id = :u LIMIT 1
            """),
            {"u": str(self._user_id)},
        )).mappings().first()

        if row is None:
            context.notes.append("no_creator_profile")
            return
        context.full_name = row["full_name"]
        context.niche = row["niche"]
        context.target_audience = row["target_audience"]
        context.primary_platform = row["primary_platform"]
        goals = row["content_goals"] or []
        context.content_goals = [str(g) for g in goals][:5] if isinstance(goals, list) else []

    async def _load_voice(self, context: CreatorContext) -> None:
        try:
            profile = await self.voice_engine.get_profile()
            if not profile:
                # `get_profile()` only reads the canonical "Primary Style".
                # Migration 005 exists so a creator can keep several NAMED
                # profiles (e.g. an English primary and a Tamil explainer), so a
                # creator whose only profile is named must not be reported as
                # having no voice at all.
                named = await self.voice_engine.list_profiles()
                profile = named[-1] if named else None
        except Exception as exc:
            logger.warning("Producer context: voice read failed: %s", exc)
            context.notes.append("voice_unavailable")
            return
        if not profile:
            context.notes.append("no_voice_profile")
            return

        from app.studio.context import ContextAssembler

        context.voice_summary = ContextAssembler._render_voice(profile)
        context.has_voice = bool(context.voice_summary)
        forbidden = profile.get("forbidden_words") or []
        context.forbidden_words = [str(w) for w in forbidden][:20]

    async def _load_memory(self, context: CreatorContext, plan_date: date) -> None:
        query = self._retrieval_query(context)
        if not query:
            context.notes.append("no_memory_query")
            return
        try:
            hits = await self.memory_engine.retrieve(
                MemoryQuery(
                    query=query,
                    top_k=self.MEMORY_TOP_K,
                    purpose="producer_planning",
                )
            )
        except Exception as exc:
            logger.warning("Producer context: memory retrieval failed: %s", exc)
            context.notes.append("memory_unavailable")
            return

        if not hits:
            context.notes.append("no_relevant_memory")
            return

        lines = []
        for hit in hits:
            title = hit.title or hit.source_type
            lines.append(f"- [{title}] {hit.text}")
            context.memory_refs.append(
                Evidence(
                    kind=EvidenceKind.MEMORY,
                    ref_id=str(hit.chunk_id),
                    summary=(hit.text or "")[:300],
                )
            )
        blob = "\n".join(lines)[: self.MEMORY_MAX_CHARS]
        context.memory_text = blob

    def _retrieval_query(self, context: CreatorContext) -> str:
        """What to retrieve memory about.

        Built from creator-owned facts, not invented. A creator with no profile
        gets no memory retrieval at all rather than a fabricated query.
        """
        parts = [p for p in (context.niche, context.target_audience) if p]
        if context.content_goals:
            parts.append(" ".join(context.content_goals[:3]))
        if not parts:
            return ""
        return " ".join(parts)[:300]

    async def _load_unfinished(self, context: CreatorContext) -> None:
        rows = (await self._db.execute(
            text("""
                SELECT g.id AS generation_id, g.session_id, g.capability,
                       g.version, g.critique, g.created_at, g.asset_id,
                       s.title AS session_title, s.status AS session_status
                FROM studio_generations g
                JOIN studio_sessions s ON s.id = g.session_id
                WHERE g.user_id = :u
                  AND s.status = 'active'
                  AND NOT EXISTS (
                      SELECT 1 FROM studio_generations newer
                      WHERE newer.session_id = g.session_id
                        AND newer.version > g.version
                  )
                ORDER BY g.created_at DESC
                LIMIT 8
            """),
            {"u": str(self._user_id)},
        )).mappings().all()

        for row in rows:
            preview = ""
            try:
                preview = (await self._db.execute(
                    text("SELECT raw_text FROM content_assets WHERE id = :a"),
                    {"a": str(row["asset_id"])},
                )).scalar() or ""
            except Exception:  # pragma: no cover - asset lookup is best-effort
                preview = ""

            context.unfinished.append(
                UnfinishedWork(
                    generation_id=row["generation_id"],
                    session_id=row["session_id"],
                    session_title=row["session_title"],
                    capability=row["capability"],
                    version=row["version"],
                    has_critique=row["critique"] is not None,
                    text_preview=preview[:200],
                    created_at=row["created_at"],
                )
            )

        if not context.unfinished:
            context.notes.append("no_unfinished_work")

    async def _load_ideas(self, context: CreatorContext) -> None:
        rows = (await self._db.execute(
            text("""
                SELECT id, title, status FROM ideas
                WHERE user_id = :u
                  AND (status IS NULL OR status NOT IN ('used', 'published', 'discarded'))
                ORDER BY created_at DESC LIMIT 8
            """),
            {"u": str(self._user_id)},
        )).mappings().all()
        context.open_ideas = [
            {"id": str(r["id"]), "title": r["title"], "status": r["status"]}
            for r in rows
        ]
        if not context.open_ideas:
            context.notes.append("no_open_ideas")

    async def _load_assets(self, context: CreatorContext) -> None:
        """Creator-made content only -- Studio output.

        Deliberately filtered to `source_type = 'studio'`. The Memory Engine
        also writes `content_assets` rows, so an unfiltered read would treat
        ingested notes as content the creator made and would offer to repurpose
        their own memory. This matches how Studio itself lists prior work
        (`metadata->>'produced_by' = 'studio'`).
        """
        rows = (await self._db.execute(
            text("""
                SELECT id, title, source_type FROM content_assets
                WHERE user_id = :u AND source_type = 'studio'
                ORDER BY created_at DESC LIMIT 8
            """),
            {"u": str(self._user_id)},
        )).mappings().all()
        context.recent_assets = [
            {"id": str(r["id"]), "title": r["title"], "source_type": r["source_type"]}
            for r in rows
        ]

    async def _load_performance(self, context: CreatorContext) -> None:
        """Read-only counts. Growth owns any interpretation."""
        try:
            row = (await self._db.execute(
                text("""
                    SELECT COUNT(*) AS n,
                           MAX(views) AS best_views
                    FROM performance_records WHERE user_id = :u
                """),
                {"u": str(self._user_id)},
            )).mappings().one()
        except Exception as exc:  # pragma: no cover - table always exists
            logger.warning("Producer context: performance read failed: %s", exc)
            context.notes.append("performance_unavailable")
            return

        context.performance_count = int(row["n"] or 0)
        if row["best_views"]:
            best = (await self._db.execute(
                text("""
                    SELECT a.title FROM performance_records p
                    JOIN content_assets a ON a.id = p.asset_id
                    WHERE p.user_id = :u AND p.views = :v
                    LIMIT 1
                """),
                {"u": str(self._user_id), "v": row["best_views"]},
            )).scalar()
            context.best_performing_asset_title = best

    async def _load_plan(self, context: CreatorContext, plan_date: date) -> None:
        rows = (await self._db.execute(
            text("""
                SELECT id, title, status, action_kind, capability, rank, reason
                FROM plan_items
                WHERE user_id = :u AND plan_date = :d
                ORDER BY rank, created_at
            """),
            {"u": str(self._user_id), "d": plan_date},
        )).mappings().all()
        context.planned_today = [dict(r) for r in rows]

        # Carryover: unfinished work from previous days that was never resolved.
        carry = (await self._db.execute(
            text("""
                SELECT id, plan_date, title, status, action_kind, reason
                FROM plan_items
                WHERE user_id = :u
                  AND plan_date < :d
                  AND status IN ('planned', 'in_progress', 'blocked')
                ORDER BY plan_date DESC LIMIT 8
            """),
            {"u": str(self._user_id), "d": plan_date},
        )).mappings().all()
        context.open_carryover = [dict(r) for r in carry]

        last = (await self._db.execute(
            text("""
                SELECT MAX(plan_date) AS last_date FROM plan_items
                WHERE user_id = :u AND plan_date < :d
            """),
            {"u": str(self._user_id), "d": plan_date},
        )).scalar()
        if last:
            context.days_since_last_plan = (plan_date - last).days

    # ------------------------------------------------------------------ #
    # Sparsity
    # ------------------------------------------------------------------ #

    #: Signals that make the Producer's job possible at all.
    def _assess_sparsity(self, context: CreatorContext) -> None:
        """Classify how much usable context exists.

        This is what lets the Producer say "not enough to recommend anything"
        instead of inventing something. A sparse creator is a supported state, not
        an error.
        """
        score = 0
        score += 2 if context.niche else 0
        score += 1 if context.target_audience else 0
        score += 1 if context.has_voice else 0
        score += 2 if context.memory_refs else 0
        score += 2 if context.unfinished else 0
        score += 1 if context.open_ideas else 0
        score += 1 if context.recent_assets else 0

        if score >= 6:
            context.notes.append("context_rich")
        elif score >= 3:
            context.notes.append("context_moderate")
        else:
            context.notes.append("context_sparse")

    @staticmethod
    def sparsity_score(context: CreatorContext) -> int:
        """Exposed for the planner's threshold and for tests."""
        score = 0
        score += 2 if context.niche else 0
        score += 1 if context.target_audience else 0
        score += 1 if context.has_voice else 0
        score += 2 if context.memory_refs else 0
        score += 2 if context.unfinished else 0
        score += 1 if context.open_ideas else 0
        score += 1 if context.recent_assets else 0
        return score


__all__ = ["CreatorContext", "ProducerContextAssembler", "UnfinishedWork"]
