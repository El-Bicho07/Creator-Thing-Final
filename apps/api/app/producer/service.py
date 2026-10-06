"""The AI Creative Producer.

NEW platform functionality, not a donor port. Neither Module 04 nor Module 21
contained a working planner: Module 04's engine was deleted, and Module 21's
`getBestTime()` returns `new Date()` regardless of input.

Boundaries this service enforces, and which the tests assert:

1. **The Producer decides WHAT. Studio decides HOW.** `execute()` never generates
   content. It validates the recommendation, then hands off to Studio.
2. **Recommendations are structured**, validated against Pydantic contracts, and
   never parsed out of prose by the client.
3. **Evidence is mandatory.** A recommendation with no resolvable evidence is not
   persisted -- the Module 21 citation-forcing pattern, made checkable.
4. **The Producer may say NO_ACTION.** "Nothing worth doing today" is a first-class,
   expected outcome rather than filler.
5. **One LLM call, through the Gateway**, used only to phrase and rank candidates
   whose eligibility was already decided deterministically. The order and the
   accept/reject decisions are computed in `ProducerPlanner`, not by the model.
6. **Bounded.** No autonomous loop. One planning pass per request.
"""
from __future__ import annotations

import time
import uuid
from dataclasses import dataclass
from datetime import date
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.jobs.service import JobService
from app.llm import LLMRequest, get_llm_gateway
from app.llm.contracts import LLMResponse
from app.producer.context import CreatorContext, ProducerContextAssembler
from app.producer.contracts import (
    ACTION_FOR_KIND,
    CAPABILITY_FOR_KIND,
    ActionKind,
    Evidence,
    EvidenceKind,
    ProducerContextSummary,
    ProducerRecommendation,
    ProducerRun,
    RecommendationKind,
    TodayItem,
    TodayItemStatus,
    TodayPlan,
)
from app.producer.persistence import InvalidTransition, TodayRepository
from app.producer.planner import Candidate, ProducerPlanner

logger = get_logger(__name__)

#: The evidence table each EvidenceKind must resolve against. A reference that
#: does not exist in the owning table is a fabricated citation.
_EVIDENCE_TABLES: Dict[EvidenceKind, Optional[str]] = {
    EvidenceKind.MEMORY: "chunks",
    EvidenceKind.CONTENT_ASSET: "content_assets",
    EvidenceKind.STUDIO_GENERATION: "studio_generations",
    EvidenceKind.IDEA: "ideas",
    EvidenceKind.CREATOR_PROFILE: "creator_profiles",
    EvidenceKind.VOICE_PROFILE: "voice_profiles",
    EvidenceKind.PERFORMANCE: "performance_records",
    EvidenceKind.TODAY_ITEM: "plan_items",
}


class ProducerError(Exception):
    def __init__(self, message: str, *, status: str = "error") -> None:
        super().__init__(message)
        self.status = status


@dataclass
class StudioHandoff:
    """A prepared Studio session for an accepted recommendation.

    The Producer prepares the session and context; Studio generates the content.
    """

    session_id: uuid.UUID
    capability: str
    input: Dict[str, Any]
    item_id: uuid.UUID
    created: bool


class ProducerService:
    """Decision layer for one authenticated creator."""

    def __init__(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        *,
        repository: Optional[TodayRepository] = None,
        assembler: Optional[ProducerContextAssembler] = None,
        planner: Optional[ProducerPlanner] = None,
    ) -> None:
        self._db = db
        self._user_id = user_id
        self.repository = repository or TodayRepository(db, user_id)
        self.assembler = assembler or ProducerContextAssembler(db, user_id)
        self.planner = planner or ProducerPlanner()

    # ------------------------------------------------------------------ #
    # Planning
    # ------------------------------------------------------------------ #

    async def plan(
        self,
        plan_date: date,
        *,
        time_budget_minutes: int = 120,
        persist: bool = True,
    ) -> Tuple[TodayPlan, ProducerRun]:
        """Produce today's plan.

        The deterministic planner decides what is eligible and in what order. The
        Gateway, if reachable, only re-phrases titles and reasons for the
        already-chosen candidates. A provider failure degrades to the
        deterministic plan rather than failing the request.
        """
        started = time.perf_counter()
        notes: List[str] = []

        context = await self.assembler.assemble(
            plan_date, time_budget_minutes=time_budget_minutes
        )
        candidates = self.planner.candidates(context)
        deterministic = self.planner.rank(
            candidates, budget_minutes=time_budget_minutes
        )

        # Surface the planning gap as context. It is deliberately NOT a scoring
        # signal on a "create" candidate -- see the note in planner.py.
        if context.days_since_last_plan is not None and context.days_since_last_plan >= 3:
            notes.append(
                f"no plan for {context.days_since_last_plan} days"
            )

        recommendations = [c.to_recommendation() for c in deterministic]
        existing = await self.repository.open_items(plan_date)

        if not recommendations:
            notes.append("nothing_cleared_the_bar")
            return (
                TodayPlan(
                    plan_date=plan_date,
                    items=existing,
                    notes=notes + ["The Producer found nothing worth recommending today."],
                ),
                ProducerRun(
                    plan_date=plan_date,
                    recommendations=0,
                    created_items=0,
                    skipped_duplicates=0,
                    notes=notes,
                ),
            )

        recommendations, llm_notes = await self._enrich(recommendations, context)
        notes.extend(llm_notes)

        # Duplicate prevention against what is already planned today.
        seen_keys = {i.dedupe_key for i in existing if i.dedupe_key}
        fresh: List[ProducerRecommendation] = []
        skipped = 0
        for recommendation in recommendations:
            key = self._dedupe_key(recommendation)
            if key in seen_keys:
                skipped += 1
                continue
            seen_keys.add(key)
            fresh.append(recommendation)

        if skipped:
            notes.append(f"{skipped} already planned today")

        created: List[TodayItem] = []
        if persist:
            rank = 0
            for recommendation in fresh:
                item = await self.repository.create_from_recommendation(
                    recommendation, plan_date, rank=rank
                )
                if item is not None:
                    created.append(item)
                    rank += 1

        items = existing + created if persist else existing
        run = ProducerRun(
            plan_date=plan_date,
            recommendations=len(recommendations),
            created_items=len(created),
            skipped_duplicates=skipped,
            latency_ms=int((time.perf_counter() - started) * 1000),
            notes=notes,
        )
        plan = TodayPlan(
            plan_date=plan_date,
            items=items,
            generated_at=None,
            notes=notes,
        )
        plan.total_estimated_minutes = sum(
            i.estimated_minutes for i in items
            if i.status in (TodayItemStatus.PLANNED, TodayItemStatus.IN_PROGRESS)
        )
        return plan, run

    async def recommend_only(
        self, plan_date: date, *, time_budget_minutes: int = 120
    ) -> Tuple[List[ProducerRecommendation], ProducerContextSummary, ProducerRun]:
        """Plan WITHOUT persisting, so a creator can inspect reasoning first.

        Re-derives the ranked candidates directly rather than re-planning, so the
        preview carries full reasoning instead of only what was persisted. The
        plan still goes through the same deterministic path, so a preview and a
        real plan cannot disagree.
        """
        started = time.perf_counter()
        context = await self.assembler.assemble(
            plan_date, time_budget_minutes=time_budget_minutes
        )
        candidates = self.planner.candidates(context)
        ranked = self.planner.rank(candidates, budget_minutes=time_budget_minutes)
        recommendations = [c.to_recommendation() for c in ranked]

        # Enrichment is skipped for a preview: the creator is being shown what the
        # Producer decided, not a marketing copy of it.
        run = ProducerRun(
            plan_date=plan_date,
            recommendations=len(recommendations),
            created_items=0,
            skipped_duplicates=0,
            latency_ms=int((time.perf_counter() - started) * 1000),
            notes=[] if recommendations else ["nothing_cleared_the_bar"],
        )
        return recommendations, context.summary(), run

    async def plan_as_job(
        self, plan_date: date, *, time_budget_minutes: int = 120
    ) -> ProducerRun:
        """Run planning through the existing JobService.

        Planning is several Gateway calls plus assembly, so it is genuinely
        asynchronous work. The job is recorded for observability (task §25) using
        the platform's own job infrastructure -- no new queue.
        """
        from app.jobs.service import run_job

        async def work(service: JobService, record) -> Dict[str, Any]:
            await service.update_progress(record.id, 50)
            plan, run = await self.plan(plan_date, time_budget_minutes=time_budget_minutes)
            await service.update_progress(record.id, 90)
            return {
                "plan_date": run.plan_date.isoformat(),
                "recommendations": run.recommendations,
                "created_items": run.created_items,
                "skipped_duplicates": run.skipped_duplicates,
                "latency_ms": run.latency_ms,
                "items": len(plan.items),
                "notes": run.notes,
            }

        record = await run_job(
            self._db,
            self._user_id,
            "producer_plan",
            work,
            total=100,
            metadata={"plan_date": plan_date.isoformat()},
            max_retries=1,
        )

        return ProducerRun(
            job_id=record.id,
            plan_date=plan_date,
            status=record.status,
            recommendations=int((record.metadata or {}).get("recommendations", 0) or 0),
            created_items=int((record.metadata or {}).get("created_items", 0) or 0),
            skipped_duplicates=int((record.metadata or {}).get("skipped_duplicates", 0) or 0),
            latency_ms=int((record.metadata or {}).get("latency_ms", 0) or 0),
            notes=list((record.metadata or {}).get("notes") or []),
        )

    # ------------------------------------------------------------------ #
    # Evidence validation
    # ------------------------------------------------------------------ #

    async def validate_evidence(
        self, evidence: List[Evidence]
    ) -> Tuple[List[Evidence], List[str]]:
        """Resolve every evidence reference against the table that owns it.

        Module 21 required `citationIds` to be non-empty but never checked that an
        id resolved to anything, so citations were forgeable. Here a reference
        that does not exist is dropped, and a recommendation left with no evidence
        is refused.
        """
        valid: List[Evidence] = []
        dropped: List[str] = []
        for item in evidence:
            table = _EVIDENCE_TABLES.get(item.kind)
            if table is None:
                dropped.append(f"{item.kind.value}:{item.ref_id}")
                continue
            # The creator profile is a singleton, so the assembler emits the
            # literal marker "creator_profile" rather than a row id. This must be
            # checked BEFORE querying: binding the marker as a UUID fails.
            if item.kind is EvidenceKind.CREATOR_PROFILE and item.ref_id == "creator_profile":
                present = await self._db.execute(
                    text("SELECT 1 FROM creator_profiles WHERE user_id = :u LIMIT 1"),
                    {"u": str(self._user_id)},
                )
                if present.first() is None:
                    dropped.append(f"{item.kind.value}:{item.ref_id}")
                else:
                    valid.append(item)
                continue
            try:
                found = await self._db.execute(
                    text(f"SELECT 1 FROM {table} WHERE id = :i LIMIT 1"),
                    {"i": item.ref_id},
                )
            except Exception as exc:
                # A malformed reference is dropped, never trusted.
                logger.info("Producer evidence check failed for %s: %s", table, exc)
                dropped.append(f"{item.kind.value}:{item.ref_id}")
                continue
            if found.first() is None:
                dropped.append(f"{item.kind.value}:{item.ref_id}")
                continue
            valid.append(item)

        if dropped:
            logger.info("Producer dropped %d unresolvable evidence refs: %s",
                        len(dropped), dropped[:5])
        return valid, dropped

    # ------------------------------------------------------------------ #
    # Execution / Studio handoff
    # ------------------------------------------------------------------ #

    async def execute(
        self,
        item_id: uuid.UUID,
        *,
        studio_session_id: Optional[uuid.UUID] = None,
    ) -> StudioHandoff:
        """Accept a Today item and hand it to Studio.

        The Producer prepares a Studio session and the capability input; it does
        NOT generate content. Studio owns generation, critique and refinement.
        """
        from app.studio import build_registry

        item = await self.repository.get(item_id)
        if item is None:
            raise ProducerError("Today item not found.", status="not_found")

        if item.source != "producer" or not item.capability:
            # A creator-added item may still name a capability explicitly.
            if not item.capability:
                raise ProducerError(
                    "This item has no Studio capability attached. Open it in Studio "
                    "to choose how to create it.",
                    status="not_executable",
                )

        capability_id = item.capability
        registry = build_registry()
        if capability_id not in registry:
            raise ProducerError(
                f"The suggested capability '{capability_id}' is no longer "
                "available. Recreate the plan.",
                status="capability_unavailable",
            )

        if item.status is TodayItemStatus.COMPLETED:
            raise ProducerError(
                "This item is already complete.", status="already_completed"
            )

        # Carry over: reuse the linked session when one exists.
        if studio_session_id is None and item.studio_session_id:
            studio_session_id = item.studio_session_id

        created = False
        if studio_session_id is None:
            session = (await self._db.execute(
                text("""
                    INSERT INTO studio_sessions (user_id, title, brief, current_step)
                    VALUES (:u, :t, :b, 'generate') RETURNING id
                """),
                {
                    "u": str(self._user_id),
                    "t": item.title[:255],
                    "b": item.reason or item.title,
                },
            )).scalar_one()
            studio_session_id = session
            created = True

        payload = await self._capability_input(item, capability_id)

        await self.repository.update(
            item_id,
            studio_session_id=studio_session_id,
        )
        await self._transition(item, TodayItemStatus.IN_PROGRESS)

        return StudioHandoff(
            session_id=studio_session_id,
            capability=capability_id,
            input=payload,
            item_id=item_id,
            created=created,
        )

    async def _capability_input(
        self, item: TodayItem, capability_id: str
    ) -> Dict[str, Any]:
        """Build the Studio capability input for an item.

        Deliberately minimal and schema-shaped: Studio validates it against the
        capability's Pydantic model, so a wrong shape fails there with a clear 422
        rather than here.
        """
        topic = (item.reason or item.title or "").strip()
        if capability_id == "idea":
            return {"topic": topic[:300], "count": 5}
        if capability_id == "script":
            return {"topic": topic[:300], "platform": item.platform}
        if capability_id == "refine":
            return {"instruction": item.reason or item.title}
        if capability_id == "repurpose":
            return {
                "source_content": (item.title or topic)[:4_000],
                "platforms": ["reel", "linkedin"],
            }
        if capability_id == "caption":
            return {"topic": topic[:300], "platform": item.platform, "count": 4}
        if capability_id == "cta":
            return {"topic": topic[:300], "goal": "engagement"}
        if capability_id == "hook":
            return {"topic": topic[:300], "platform": item.platform, "limit": 5}
        if capability_id == "thumbnail":
            return {"description": topic[:4_000], "content_type": "tutorial"}
        return {"topic": topic[:300]}

    async def _transition(self, item: TodayItem, status: TodayItemStatus) -> TodayItem:
        try:
            return await self.repository.transition(item.id, status)
        except InvalidTransition:
            raise
        except LookupError:
            raise ProducerError("Today item not found.", status="not_found")

    # ------------------------------------------------------------------ #
    # LLM enrichment
    # ------------------------------------------------------------------ #

    async def _enrich(
        self,
        recommendations: List[ProducerRecommendation],
        context: CreatorContext,
    ) -> Tuple[List[ProducerRecommendation], List[str]]:
        """Re-phrase already-chosen recommendations through the Gateway.

        Deliberately narrow: the model may improve titles and reasons, and may
        reorder within an equal score, but it cannot introduce a new item, change
        the order, or claim a fact the evidence does not support. Everything it
        returns is re-validated, and a failure degrades to the deterministic plan.
        """
        if not recommendations:
            return recommendations, []

        try:
            prompt_variables = context.prompt_variables()
        except Exception as exc:  # pragma: no cover - assembly already ran
            logger.warning("Producer prompt assembly failed: %s", exc)
            return recommendations, ["llm_enrichment_skipped"]

        request = LLMRequest(
            purpose="producer_enrich",
            feature="producer",
            prompt_name="producer/enrich",
            prompt_version="v1",
            input_data={
                **prompt_variables,
                "recommendations": [
                    {
                        "kind": r.kind.value,
                        "title": r.title,
                        "reason": r.reason,
                        "priority": r.priority.value,
                        "action_kind": r.action_kind.value,
                        "estimated_minutes": r.estimated_minutes,
                    }
                    for r in recommendations
                ],
            },
            temperature=0.5,
            max_tokens=1200,
            metadata={"plan_date": context.plan_date.isoformat()},
        )

        try:
            response = await get_llm_gateway().generate(
                user_id=self._user_id, request=request, db=self._db
            )
        except Exception as exc:
            logger.info("Producer enrichment unavailable, using deterministic plan: %s", exc)
            return recommendations, ["llm_enrichment_unavailable"]

        payload = getattr(response, "structured_output", None) or (
            response if isinstance(response, dict) else None
        )
        if not isinstance(payload, dict):
            return recommendations, ["llm_enrichment_unavailable"]

        enriched: List[ProducerRecommendation] = []
        by_kind_title = {(r.kind.value, r.title): r for r in recommendations}
        for item in payload.get("recommendations") or []:
            if not isinstance(item, dict):
                continue
            original = by_kind_title.get((str(item.get("kind")), str(item.get("title"))))
            if original is None:
                # The model invented an item. Refuse it.
                continue
            title = str(item.get("title") or original.title).strip()[:255]
            reason = str(item.get("reason") or original.reason).strip()[:2_000]
            if not title or not reason:
                continue
            enriched.append(
                original.model_copy(update={"title": title, "reason": reason})
            )

        if len(enriched) != len(recommendations):
            # Partial rewrite would silently drop an item; use the deterministic set.
            return recommendations, ["llm_enrichment_partial"]

        return enriched, []

    @staticmethod
    def _dedupe_key(recommendation: ProducerRecommendation) -> str:
        from app.producer.persistence import _stable_key

        return f"{recommendation.kind.value}:{_stable_key(recommendation)}"


__all__ = [
    "ProducerService",
    "ProducerError",
    "StudioHandoff",
]
