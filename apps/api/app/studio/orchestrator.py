"""StudioOrchestrator — the sole orchestration authority for Studio.

Donor note: Module 18 (Guruvelah) had the richest orchestration in the donor set
(`lib/ai/orchestrator.ts:32`). Three of its decisions were worth keeping and are
adapted here:

1. **Stage events.** The donor emitted `PipelineStageEvent{stage, status, message}`
   so a UI could show progress. Studio returns a stage trace on every execution,
   so the frontend can render workflow progress without inventing its own model.

2. **Deterministic structure, model prose.** The donor computed `allocateSegments`
   before calling the model. Studio does the same (`domain.rules.allocate_segments`).

3. **Derived, non-LLM steps.** The donor derived a shot list purely
   functionally from the script. Studio derives the version number and the workflow
   step the same way.

Deliberately *not* kept: the donor's fixed 6-stage pipeline and its own provider
client. In Studio a "pipeline" is a creator's session and its steps are chosen by
the creator, so the orchestrator executes a named capability and reports where the
session now sits. A single fixed pipeline would be the donor's architecture leaking
into the platform, which is exactly what the donor principle forbids.

The orchestrator also owns cost control: a per-session generation budget, enforced
before the Gateway is called.
"""
from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.studio.capabilities.implementations import build_registry
from app.studio.context import CreatorContext, ContextAssembler
from app.studio.domain import rules
from app.studio.persistence import StudioRepository, StudioSessionRecord
from app.studio.registry import (
    CapabilityContext,
    CapabilityError,
    CapabilityOutcome,
    StudioCapabilityRegistry,
)

logger = get_logger(__name__)

#: The Studio workflow, as displayed to the creator.
WORKFLOW_STEPS = ("context", "generate", "review", "refine", "done")

#: Which step the session sits at after a capability.
#:
#: Any capability that produced content moves the session to `review`: once there
#: is something on the page, the creator's next action is to read it. `generate` is
#: the step a session sits at while the creator is still deciding what to make (it
#: is where a new session starts once its brief is set), and `critique` moves to
#: `refine`. Refinement returns to `review` because the new version is the thing
#: that now needs reading.
_STEP_AFTER_CAPABILITY = {
    "idea": "review",
    "hook": "review",
    "script": "review",
    "caption": "review",
    "repurpose": "review",
    "cta": "review",
    "thumbnail": "review",
    "critique": "refine",
    "refine": "review",
}


class BudgetExceeded(CapabilityError):
    def __init__(self, message: str) -> None:
        super().__init__(message, status="budget_exceeded")


@dataclass
class StageTrace:
    """One step of an execution, mirroring the donor's stage event protocol."""

    stage: str
    status: str            # start | success | error | skipped
    message: str = ""
    detail: Dict[str, Any] = field(default_factory=dict)

    def as_dict(self) -> Dict[str, Any]:
        return {
            "stage": self.stage,
            "status": self.status,
            "message": self.message,
            "detail": self.detail,
        }


@dataclass
class ExecutionResult:
    generation: Optional[Any]
    outcome: Optional[CapabilityOutcome]
    stages: List[StageTrace] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    context_summary: Dict[str, Any] = field(default_factory=dict)

    #: The context blocks actually sent to the model, after injection hardening.
    #:
    #: Deliberately NOT part of `context_summary`, which the API returns: this
    #: contains the creator's own memory text. It exists so tests and the Studio
    #: evaluation suite can assert on what the model genuinely received, rather
    #: than on a proxy reconstructed from metadata.
    prompt_blocks: Dict[str, str] = field(default_factory=dict)

    def stage_dicts(self) -> List[Dict[str, Any]]:
        return [s.as_dict() for s in self.stages]


@dataclass
class BudgetPolicy:
    """Cost control, owned by Studio rather than left to the caller.

    A creator clicking "regenerate" repeatedly is the realistic runaway cost, so
    the limit is per session rather than global: a busy creator is not blocked, and
    a runaway loop is.
    """

    max_generations_per_session: int = 40
    max_refinements_per_version: int = 10


class StudioOrchestrator:
    """Executes Studio capabilities for one authenticated creator."""

    def __init__(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        *,
        repository: Optional[StudioRepository] = None,
        registry: Optional[StudioCapabilityRegistry] = None,
        assembler: Optional[ContextAssembler] = None,
        budget: Optional[BudgetPolicy] = None,
    ) -> None:
        self._db = db
        self._user_id = user_id
        self.repository = repository or StudioRepository(db, user_id)
        self.registry = registry or build_registry()
        self.assembler = assembler or ContextAssembler(db, user_id)
        self.budget = budget or BudgetPolicy()

    # ------------------------------------------------------------------ #
    # Catalogue
    # ------------------------------------------------------------------ #

    def capabilities(self) -> List[Dict[str, Any]]:
        return self.registry.infos()

    # ------------------------------------------------------------------ #
    # Generation
    # ------------------------------------------------------------------ #

    async def run_capability(
        self,
        session: StudioSessionRecord,
        capability_id: str,
        payload: Dict[str, Any],
        *,
        platform: Optional[str] = None,
        tone: Optional[str] = None,
        goal: Optional[str] = None,
        duration_sec: Optional[int] = None,
    ) -> ExecutionResult:
        """Validate, assemble context, generate, persist, and report stages."""
        stages: List[StageTrace] = []
        started = time.perf_counter()

        # ---- resolve capability (no donor conditionals live here) ----
        capability = self.registry.require(capability_id)
        stages.append(
            StageTrace("resolve_capability", "success", f"{capability.id} ({capability.classification})")
        )

        # ---- validate input BEFORE spending anything ----
        try:
            parsed = capability.validate_input(payload or {})
        except CapabilityError as exc:
            stages.append(StageTrace("validate_input", "error", str(exc)))
            return ExecutionResult(
                generation=None,
                outcome=None,
                stages=stages,
                warnings=[str(exc)],
            )
        stages.append(
            StageTrace("validate_input", "success", f"{type(parsed).__name__} accepted")
        )

        # ---- cost control ----
        existing = await self.repository.list_generations(session.id, limit=500)
        if len(existing) >= self.budget.max_generations_per_session:
            message = (
                f"This session has reached its limit of "
                f"{self.budget.max_generations_per_session} generations. "
                "Start a new session to keep creating."
            )
            stages.append(StageTrace("budget", "error", message))
            return ExecutionResult(
                generation=None, outcome=None, stages=stages, warnings=[message]
            )

        if capability_id == "refine":
            chain_length = _refinement_chain_length(existing)
            if chain_length >= self.budget.max_refinements_per_version:
                message = (
                    f"This version has been refined {chain_length} times. "
                    "Approve it or start a new version."
                )
                stages.append(StageTrace("budget", "error", message))
                return ExecutionResult(
                    generation=None, outcome=None, stages=stages, warnings=[message]
                )

        stages.append(StageTrace("budget", "success", "within limits"))

        # ---- context (platform-owned, via Phase 2 services) ----
        brief = _brief_from(session, parsed)
        context = await self.assembler.assemble(
            brief=brief,
            query=brief,
            platform=platform or payload.get("platform"),
        )
        stages.append(
            StageTrace(
                "assemble_context",
                "success",
                f"memory={context.memory_used} voice={context.voice_available} "
                f"prior={context.prior_work_used}",
                detail=context.summary(),
            )
        )

        latest_text = None
        if existing:
            latest_text = await self.repository.get_asset_text(existing[-1].asset_id)

        ctx = CapabilityContext(
            user_id=self._user_id,
            db=self._db,
            session=session,
            repository=self.repository,
            context=context,
            brief=brief,
            platform=platform,
            tone=tone,
            goal=goal,
            duration_sec=duration_sec,
            source_text=latest_text,
        )

        # ---- generate ----
        stages.append(StageTrace("generate", "start", f"{capability.id} via LLM Gateway"))
        try:
            outcome = await capability.execute(ctx, parsed)
        except CapabilityError as exc:
            stages.append(StageTrace("generate", "error", str(exc)))
            return ExecutionResult(
                generation=None,
                outcome=None,
                stages=stages,
                warnings=[str(exc)],
                context_summary=context.summary(),
                prompt_blocks=context.prompt_variables(),
            )
        except Exception as exc:
            # Unexpected: log with detail, return a safe message.
            logger.exception("Studio capability %s failed unexpectedly", capability.id)
            safe = "Generation failed unexpectedly. Please retry."
            stages.append(StageTrace("generate", "error", safe))
            return ExecutionResult(
                generation=None,
                outcome=None,
                stages=stages,
                warnings=[safe],
                context_summary=context.summary(),
                prompt_blocks=context.prompt_variables(),
            )
        stages.append(
            StageTrace("generate", "success", f"{capability.id} produced output")
        )

        if not outcome.version_text.strip():
            message = "The generation produced no usable text. Please retry."
            stages.append(StageTrace("persist", "error", message))
            return ExecutionResult(
                generation=None,
                outcome=outcome,
                stages=stages,
                warnings=outcome.warnings + [message],
                context_summary=context.summary(),
                prompt_blocks=context.prompt_variables(),
            )

        # ---- persist: new content_assets row + new generation version ----
        version = await self.repository.next_version(session.id)
        asset_id = await self.repository.create_asset(
            title=f"{session.title} · {capability.name} v{version}",
            raw_text=outcome.version_text,
            source_type="studio",
            external_id=f"studio:{session.id}:{version}",
            metadata={
                "produced_by": "studio",
                "studio_session_id": str(session.id),
                "capability": capability.id,
                "version": version,
                "donor": list(capability.donor),
                "classification": capability.classification,
                "platform": platform,
                "platform_resolved": outcome.metadata.get("platform"),
                "goal": goal,
                "tone": tone,
            },
        )
        parent_id = existing[-1].id if existing else None
        generation = await self.repository.create_generation(
            session_id=session.id,
            asset_id=asset_id,
            version=version,
            capability=capability.id,
            prompt_name=outcome.prompt_name,
            prompt_version=outcome.prompt_version,
            parent_generation_id=parent_id,
            input_tokens=int(outcome.metadata.get("input_tokens", 0)),
            output_tokens=int(outcome.metadata.get("output_tokens", 0)),
            latency_ms=int((time.perf_counter() - started) * 1000),
            metadata={
                **outcome.metadata,
                "context": context.summary(),
                "stages": [s.as_dict() for s in stages],
            },
        )
        stages.append(
            StageTrace(
                "persist", "success", f"version {version} saved", detail={"asset_id": str(asset_id)}
            )
        )

        # ---- advance the workflow ----
        target_step = _STEP_AFTER_CAPABILITY.get(capability.id)
        if target_step and target_step != session.current_step:
            await self.repository.update_session(
                session.id, current_step=target_step, last_capability=capability.id
            )
            stages.append(
                StageTrace("advance_step", "success", f"{session.current_step} → {target_step}")
            )

        return ExecutionResult(
            generation=generation,
            outcome=outcome,
            stages=stages,
            warnings=list(outcome.warnings),
            context_summary=context.summary(),
            prompt_blocks=context.prompt_variables(),
        )

    # ------------------------------------------------------------------ #
    # Critique
    # ------------------------------------------------------------------ #

    async def critique(
        self,
        session: StudioSessionRecord,
        *,
        generation_id: Optional[uuid.UUID] = None,
        text: Optional[str] = None,
    ) -> tuple[Optional[Any], Any, List[str]]:
        """Review an existing version.

        Critique never modifies content: it returns structured feedback and the
        creator decides whether anything changes.
        """
        from app.studio.capabilities.critique import CritiqueOutput, run_critique

        warnings: List[str] = []
        target = None
        if generation_id:
            target = await self.repository.get_generation(generation_id)
            if target is None:
                raise CapabilityError(
                    "Generation not found for this creator.", status="not_found"
                )

        if text is None and target is not None:
            text = await self.repository.get_asset_text(target.asset_id)
        if not text or not text.strip():
            raise CapabilityError(
                "There is nothing to critique yet. Generate content first.",
                status="empty_content",
            )

        context = await self.assembler.assemble(
            brief=session.brief or session.title,
            query=(session.brief or session.title)[:300],
        )
        feedback, critique_warnings = await run_critique(
            self._db, self._user_id, session, context, text
        )
        warnings.extend(critique_warnings)

        if target is not None:
            # Store feedback alongside the version it critiques.
            await self.repository.attach_critique(
                target.id,
                {
                    "overall_score": feedback.overall_score,
                    "verdict": feedback.verdict,
                    "items": [item.model_dump() for item in feedback.items],
                    "strengths": list(feedback.strengths),
                },
            )
            if session.current_step in ("generate", "review"):
                await self.repository.update_session(session.id, current_step="refine")

        return target, feedback, warnings

    # ------------------------------------------------------------------ #
    # Refinement
    # ------------------------------------------------------------------ #

    async def refine(
        self,
        session: StudioSessionRecord,
        *,
        instruction: str,
        modifier: Optional[str] = None,
        generation_id: Optional[uuid.UUID] = None,
    ) -> ExecutionResult:
        """Create a NEW version from a creator instruction.

        The previous version is never modified: Studio appends, so the creator can
        always go back.
        """
        payload: Dict[str, Any] = {"instruction": instruction}
        if modifier:
            payload["modifier"] = modifier

        if generation_id:
            target = await self.repository.get_generation(generation_id)
            if target is None:
                raise CapabilityError(
                    "Version not found for this creator.", status="not_found"
                )
            text = await self.repository.get_asset_text(target.asset_id)
            if text:
                payload["current_content"] = text

        return await self.run_capability(session, "refine", payload)


def _refinement_chain_length(generations: List[Any]) -> int:
    """How many times the current content has been refined, counting back to origin.

    Walks `parent_generation_id` from the newest generation until a non-`refine`
    capability is reached. Counting consecutive `refine` rows in version order
    would be wrong: each refinement chains from its predecessor, so version order
    alone makes the chain look reset after every step.
    """
    if not generations:
        return 0

    by_id = {g.id: g for g in generations}
    length = 0
    current = generations[-1]
    seen: set = set()
    while current is not None and current.capability == "refine":
        if current.id in seen:      # defensive: a cyclic chain must not hang
            break
        seen.add(current.id)
        length += 1
        current = by_id.get(current.parent_generation_id)
    return length


def _brief_from(session: StudioSessionRecord, parsed: Any) -> str:
    """Pick the most specific text available to use as the retrieval query."""
    for attribute in ("topic", "source_content", "description", "current_content"):
        value = getattr(parsed, attribute, None)
        if isinstance(value, str) and value.strip():
            return value.strip()[:1_000]
    if session.brief and session.brief.strip():
        return session.brief.strip()[:1_000]
    return session.title


__all__ = [
    "StudioOrchestrator",
    "ExecutionResult",
    "StageTrace",
    "BudgetPolicy",
    "BudgetExceeded",
    "WORKFLOW_STEPS",
    "rules",
    "CreatorContext",
]
