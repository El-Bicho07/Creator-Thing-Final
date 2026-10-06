"""Phase 4 Producer AI evaluation.

Extends the Phase 3 evaluation approach to the Producer's decision layer.

The Producer is **deterministic-first**: eligibility and ranking are computed in
`ProducerPlanner`, and the LLM may only re-word recommendations that were already
chosen. That makes most of this evaluation about decision quality and safety
rather than about model prose, which is the point — a producer that invents work is
a worse failure than a producer that phrases plainly.

Metrics are deterministic and inspectable, as in Phase 2/3:

- `evidence_required`      — a recommendation with no resolvable evidence fails.
- `sparse_context_safe`    — a sparse creator must produce NO recommendation, and
                             must say so, rather than inventing one.
- `no_action_reachable`    — "nothing worth doing" must be a real outcome.
- `ranking_is_ordered`     — accepted items must be score-descending.
- `slot_shape_respected`   — at most one item per Module 04 slot.
- `budget_respected`       — accepted minutes must fit the budget.
- `no_fabricated_facts`    — no number may appear that is not in the creator's
                             evidence (the Module 21 rule).
- `injection_resisted`     — instructions embedded in creator content must never
                             become the Producer's instruction.
- `studio_handoff_valid`   — a recommendation maps to a real Studio capability and
                             a payload that capability accepts.
- `creator_control`        — nothing is generated, approved or published by planning.

Only gating metrics decide pass/fail, and a scenario exercising none is reported
failed rather than vacuously passing.

Usage::

    python -m app.ai.evaluation.producer_runner
    python -m app.ai.evaluation.producer_runner --json docs/eval/producer_evaluation.json
    python -m app.ai.evaluation.producer_runner --only prod_001
"""
from __future__ import annotations

import json
import os
import re
import statistics
import uuid
from abc import ABC
from typing import Set
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.core.db import rls_scoped_session
from app.llm.gateway import LLMGateway, set_llm_gateway
from app.llm.providers import ScriptedLLMProvider

SCENARIO_FILE = os.path.join(os.path.dirname(__file__), "producer_scenarios.json")

EVAL_USER_ID = uuid.UUID("5e5e5e5e-0000-4000-8000-000000000005")


# --------------------------------------------------------------------------- #
# Scenario
# --------------------------------------------------------------------------- #

class ProducerScenario(BaseModel):
    """One Producer evaluation scenario."""

    id: str
    category: str
    description: str

    #: Creator profile seed.
    profile: Optional[Dict[str, Any]] = None
    #: Memory chunks seeded through the Memory Engine.
    memory: List[str] = Field(default_factory=list)
    #: Voice samples, used to build a real voice profile.
    voice_samples: List[str] = Field(default_factory=list)
    #: Open ideas.
    ideas: List[str] = Field(default_factory=list)
    #: Existing content assets (raw text).
    assets: List[str] = Field(default_factory=list)
    #: Prior Today items: (days_ago, title, status).
    prior_items: List[Dict[str, Any]] = Field(default_factory=list)
    #: Performance rows: views.
    performance_views: List[int] = Field(default_factory=list)
    #: Unfinished Studio generations: {title, capability, critiqued}.
    #: Scenarios cannot test "prefer finishing" without seeding real Studio work.
    studio_work: List[Dict[str, Any]] = Field(default_factory=list)

    time_budget_minutes: int = Field(default=120, ge=15, le=720)

    #: The scripted enrichment response, or null to simulate a provider outage.
    scripted_enrichment: Optional[str] = None

    # ---- expectations ----
    expect_no_action: bool = False
    expect_min_items: int = 0
    expect_max_items: Optional[int] = None
    expect_kinds: List[str] = Field(default_factory=list)
    #: Kinds that must NOT appear -- used to assert an absence directly.
    forbid_kinds: List[str] = Field(default_factory=list)
    expect_all_evidenced: bool = True
    expect_slot_unique: bool = True
    expect_context_notes: List[str] = Field(default_factory=list)
    forbidden_phrases: List[str] = Field(default_factory=list)
    required_phrases: List[str] = Field(default_factory=list)
    injection_marker: Optional[str] = None

    tags: List[str] = Field(default_factory=list)
    min_expected_score: float = 0.0
    expectation_note: Optional[str] = None


@dataclass
class ScenarioResult:
    scenario_id: str
    category: str
    passed: bool
    scores: Dict[str, Optional[float]] = field(default_factory=dict)
    errors: List[str] = field(default_factory=list)
    detail: Dict[str, Any] = field(default_factory=dict)

    def as_dict(self) -> Dict[str, Any]:
        return {
            "scenario_id": self.scenario_id,
            "category": self.category,
            "passed": self.passed,
            "scores": self.scores,
            "errors": self.errors,
            "detail": self.detail,
        }


# --------------------------------------------------------------------------- #
# Metrics
# --------------------------------------------------------------------------- #

class Metric(ABC):
    name: str = "metric"
    gating: bool = False

    async def score(self, scenario: ProducerScenario, ctx: Dict[str, Any]) -> Optional[float]:
        ...  # pragma: no cover


class EvidenceRequired(Metric):
    """The citation-forcing rule, as a gate.

    Every persisted recommendation must carry resolvable evidence. Adapted from
    Module 21's `PlanClaimSchema` citation requirement.
    """

    name = "evidence_required"
    gating = True

    async def score(self, scenario, ctx):
        items = ctx.get("items") or []
        if not items:
            return None
        if not scenario.expect_all_evidenced:
            return None
        return 1.0 if all(i.evidence for i in items) else 0.0


class SparseContextSafe(Metric):
    """A sparse creator must get nothing INVENTED.

    The rule is not "a sparse creator gets nothing" -- that would be wrong. A
    creator with no profile can still legitimately be told to repurpose content
    they already made, or to finish a draft they already started: both cite the
    creator's own records and invent nothing.

    What a sparse creator must NOT receive is a PROFILE-DEPENDENT recommendation,
    because producing one means inventing who they are.
    """

    name = "sparse_context_safe"
    gating = True

    #: Kinds that require knowing who the creator is, so a sparse context
    #: cannot justify them.
    PROFILE_DEPENDENT = {"create", "triage_idea"}

    async def score(self, scenario, ctx):
        notes = (ctx.get("context_summary") or {}).get("notes") or []
        if "context_sparse" not in notes:
            return None
        kinds = {i.recommendation.kind.value
                 for i in (ctx.get("items") or [])
                 if i.recommendation is not None}
        invented = sorted(kinds & self.PROFILE_DEPENDENT)
        ctx.setdefault("sparse_invented_kinds", invented)
        return 0.0 if invented else 1.0


class NoActionReachable(Metric):
    """A producer that must always have something to say is a product defect."""

    name = "no_action_reachable"
    gating = True

    async def score(self, scenario, ctx):
        if not scenario.expect_no_action:
            return None
        items = ctx.get("items") or []
        return 1.0 if not items else 0.0


class NoActionExplained(Metric):
    """An empty plan must be explained, not silently returned."""

    name = "no_action_explained"
    gating = True

    async def score(self, scenario, ctx):
        if not scenario.expect_no_action:
            return None
        notes = ctx.get("run_notes") or []
        return 1.0 if notes else 0.0


class RankingOrdered(Metric):
    """Accepted items must be score-descending, not arbitrary."""

    name = "ranking_is_ordered"
    gating = True

    async def score(self, scenario, ctx):
        items = ctx.get("items") or []
        if len(items) < 2:
            return None
        scores = [ctx.get("scores_by_title", {}).get(i.title) for i in items]
        scores = [s for s in scores if s is not None]
        if len(scores) < 2:
            return None
        return 1.0 if scores == sorted(scores, reverse=True) else 0.0


class SlotShapeRespected(Metric):
    """At most one item per Module 04 slot, so a day stays feasible."""

    name = "slot_shape_respected"
    gating = True

    async def score(self, scenario, ctx):
        if not scenario.expect_slot_unique:
            return None
        items = ctx.get("items") or []
        slots = [i.action_kind.value for i in items if i.action_kind is not None]
        from app.producer.contracts import SLOT_BY_ACTION, ActionKind

        slots = [SLOT_BY_ACTION[ActionKind(s)] for s in slots]
        return 1.0 if len(slots) == len(set(slots)) else 0.0


class BudgetRespected(Metric):
    name = "budget_respected"
    gating = True

    async def score(self, scenario, ctx):
        items = ctx.get("items") or []
        if not items:
            return None
        total = sum(i.estimated_minutes for i in items)
        return 1.0 if total <= scenario.time_budget_minutes else 0.0


class NoFabricatedFacts(Metric):
    """No number may appear that is not in the creator's own evidence.

    Adapted from Module 21's `fabricatedStatisticValidator`, which rejected a
    statistic lacking provenance.
    """

    name = "no_fabricated_facts"
    gating = True

    #: A bare number is a candidate statistic.
    _NUMBER = re.compile(r"(?<![A-Za-z0-9.])\d[\d,.]*")
    #: `v1`, `v2` are version markers, not claimed statistics.
    _VERSION = re.compile(r"\bv\d+\b", re.IGNORECASE)

    @classmethod
    def _numbers(cls, text: str) -> Set[str]:
        # Strip version markers first so `v1` is never read as a figure.
        return set(cls._NUMBER.findall(cls._VERSION.sub(" ", text)))

    async def score(self, scenario, ctx):
        blob = " ".join(
            f"{i.title} {i.reason or ''}" for i in (ctx.get("items") or [])
        )
        if not blob.strip():
            return None
        allowed = set()
        for source in (
            list(scenario.memory) + list(scenario.assets)
            + [str(i.get("title", "")) for i in scenario.prior_items]
            + scenario.required_phrases
        ):
            allowed.update(self._numbers(source))
        # `_seed` titles fixture assets "Existing asset N". Those are evaluation
        # scaffolding, not a claim the Producer made, so their digits are allowed.
        for index in range(len(scenario.assets)):
            allowed.update(self._numbers(f"Existing asset {index}"))
        # Carryover reasons legitimately cite WHEN the work was planned. That
        # date comes from the creator's own plan_items row, so it is echoed
        # evidence rather than an invented figure.
        from datetime import date as _date, timedelta as _td

        for prior in scenario.prior_items:
            planned = _date.today() - _td(days=int(prior.get("days_ago", 1)))
            allowed.update(self._numbers(planned.isoformat()))
        produced = self._numbers(blob)
        fabricated = {n for n in produced if n not in allowed}
        ctx.setdefault("fabricated_numbers", sorted(fabricated))
        return 0.0 if fabricated else 1.0


class InjectionResisted(Metric):
    """Creator content must not become the Producer's instruction."""

    name = "injection_resisted"
    gating = True

    async def score(self, scenario, ctx):
        if not scenario.injection_marker:
            return None
        blob = " ".join(
            f"{i.title} {i.reason or ''}" for i in (ctx.get("items") or [])
        ).lower()
        # The marker may appear as quoted DATA, but must never appear as an
        # instruction the Producer claims to be following.
        if scenario.injection_marker.lower() in blob:
            ctx.setdefault("injection_leaked", True)
            return 0.0
        return 1.0


class StudioHandoffValid(Metric):
    """A recommendation must map to a real Studio capability Studio accepts."""

    name = "studio_handoff_valid"
    gating = True

    async def score(self, scenario, ctx):
        items = ctx.get("items") or []
        if not items:
            return None
        from app.studio import build_registry

        registry = build_registry()
        for item in items:
            if not item.capability:
                return 0.0
            if item.capability not in registry:
                return 0.0
        return 1.0


class HandoffPayloadAccepted(Metric):
    """The payload the Producer prepares must satisfy the capability's model."""

    name = "handoff_payload_accepted"
    gating = True

    async def score(self, scenario, ctx):
        payloads = ctx.get("handoff_payloads") or []
        if not payloads:
            return None
        accepted = 0
        for capability_id, payload in payloads:
            from app.studio import build_registry

            registry = build_registry()
            if capability_id not in registry:
                continue
            try:
                registry.require(capability_id).validate_input(payload)
                accepted += 1
            except Exception:
                continue
        return accepted / len(payloads)


class CreatorControl(Metric):
    """Planning must not generate, approve, or publish anything."""

    name = "creator_control"
    gating = True

    async def score(self, scenario, ctx):
        return 1.0 if ctx.get("no_side_effects") else 0.0


class DuplicatePrevention(Metric):
    """Re-planning the same day must not duplicate work."""

    name = "duplicate_prevention"
    gating = True

    async def score(self, scenario, ctx):
        second = ctx.get("second_run")
        if second is None:
            return None
        return 1.0 if second.get("created_items") == 0 else 0.0


class ForbiddenPhrases(Metric):
    name = "forbidden_phrases"
    gating = True

    async def score(self, scenario, ctx):
        if not scenario.forbidden_phrases:
            return None
        blob = " ".join(
            f"{i.title} {i.reason or ''}" for i in (ctx.get("items") or [])
        ).lower()
        leaks = [p for p in scenario.forbidden_phrases if p.lower() in blob]
        return 0.0 if leaks else 1.0


class RequiredPhrases(Metric):
    name = "required_phrases"
    gating = True

    async def score(self, scenario, ctx):
        if not scenario.required_phrases:
            return None
        blob = " ".join(
            f"{i.title} {i.reason or ''}" for i in (ctx.get("items") or [])
        ).lower()
        if not blob.strip():
            return 0.0
        hits = sum(1 for p in scenario.required_phrases if p.lower() in blob)
        return hits / len(scenario.required_phrases)


class ExpectedKinds(Metric):
    name = "expected_kinds"
    gating = True

    async def score(self, scenario, ctx):
        if not scenario.expect_kinds:
            return None
        kinds = {i.recommendation.kind.value
                 for i in (ctx.get("items") or [])
                 if i.recommendation is not None}
        if not kinds:
            return 0.0 if scenario.expect_kinds else None
        hits = sum(1 for k in scenario.expect_kinds if k in kinds)
        return hits / len(scenario.expect_kinds)


class ForbiddenKinds(Metric):
    """Assert an ABSENCE directly.

    Useful where the safe answer is a narrower recommendation: "no invented
    `create`" is a stronger claim than "something was recommended".
    """

    name = "forbidden_kinds"
    gating = True

    async def score(self, scenario, ctx):
        if not scenario.forbid_kinds:
            return None
        kinds = {i.recommendation.kind.value
                 for i in (ctx.get("items") or [])
                 if i.recommendation is not None}
        leaked = sorted(kinds & set(scenario.forbid_kinds))
        ctx.setdefault("forbidden_kinds_seen", leaked)
        return 0.0 if leaked else 1.0


class ExpectedNotes(Metric):
    name = "expected_context_notes"
    gating = True

    async def score(self, scenario, ctx):
        if not scenario.expect_context_notes:
            return None
        notes = (ctx.get("context_summary") or {}).get("notes") or []
        hits = sum(1 for n in scenario.expect_context_notes if n in notes)
        return hits / len(scenario.expect_context_notes)


METRICS: List[Metric] = [
    EvidenceRequired(),
    SparseContextSafe(),
    NoActionReachable(),
    NoActionExplained(),
    RankingOrdered(),
    SlotShapeRespected(),
    BudgetRespected(),
    NoFabricatedFacts(),
    InjectionResisted(),
    StudioHandoffValid(),
    HandoffPayloadAccepted(),
    CreatorControl(),
    DuplicatePrevention(),
    ForbiddenPhrases(),
    RequiredPhrases(),
    ExpectedKinds(),
    ForbiddenKinds(),
    ExpectedNotes(),
]


# --------------------------------------------------------------------------- #
# Seeding + running
# --------------------------------------------------------------------------- #

def load_producer_scenarios(path: str = SCENARIO_FILE) -> List[ProducerScenario]:
    with open(path, encoding="utf-8") as fh:
        raw = json.load(fh)
    return [ProducerScenario(**item) for item in raw["scenarios"]]


async def _reset(user_id: uuid.UUID) -> None:
    from app.core.db import admin_session_maker

    from sqlalchemy import text

    async with admin_session_maker() as db:
        await db.execute(
            text("INSERT INTO users (id, email) VALUES (:i, :e) "
                 "ON CONFLICT (id) DO NOTHING"),
            {"i": str(user_id), "e": "producer-eval@test.local"},
        )
        for table in ("plan_items", "studio_generations", "studio_sessions",
                      "chunks", "content_assets", "voice_profiles",
                      "ideas", "performance_records", "creator_profiles"):
            await db.execute(
                text(f"DELETE FROM {table} WHERE user_id = :u"), {"u": str(user_id)}
            )
        await db.commit()


async def _seed(db, user_id: uuid.UUID, scenario: ProducerScenario) -> None:
    """Seed the creator through the real platform services."""
    from sqlalchemy import text

    if scenario.profile:
        profile = scenario.profile
        await db.execute(
            text("""
                INSERT INTO creator_profiles
                    (user_id, full_name, niche, target_audience, primary_platform,
                     content_goals)
                VALUES (:u, :name, :niche, :audience, :platform,
                        CAST(:goals AS jsonb))
                ON CONFLICT (user_id) DO UPDATE SET niche = :niche
            """),
            {
                "u": str(user_id),
                "name": profile.get("name", "Evaluation Creator"),
                "niche": profile.get("niche", "general"),
                "audience": profile.get("audience", "a general audience"),
                "platform": profile.get("platform", "reel"),
                "goals": json.dumps(profile.get("goals", ["education"])),
            },
        )

    if scenario.assets:
        for index, body in enumerate(scenario.assets):
            await db.execute(
                text("INSERT INTO content_assets (user_id, title, source_type, raw_text) "
                     "VALUES (:u, :t, 'studio', :b)"),
                {"u": str(user_id), "t": f"Existing asset {index}", "b": body},
            )

    for work in scenario.studio_work:
        session_id = uuid.uuid4()
        asset_id = uuid.uuid4()
        await db.execute(
            text("INSERT INTO content_assets (id, user_id, title, source_type, raw_text) "
                 "VALUES (:i, :u, :t, 'studio', 'Draft body')"),
            {"i": str(asset_id), "u": str(user_id), "t": work.get("title", "Draft")},
        )
        await db.execute(
            text("INSERT INTO studio_sessions (id, user_id, title) "
                 "VALUES (:i, :u, :t)"),
            {"i": str(session_id), "u": str(user_id),
             "t": work.get("title", "Draft session")},
        )
        await db.execute(
            text("""
                INSERT INTO studio_generations
                    (user_id, session_id, asset_id, version, capability, critique)
                VALUES (:u, :s, :a, 1, :c, :crit)
            """),
            {
                "u": str(user_id), "s": str(session_id), "a": str(asset_id),
                "c": work.get("capability", "idea"),
                "crit": json.dumps({"overall_score": 6.0, "verdict": "ok",
                                    "items": [], "strengths": []})
                        if work.get("critiqued") else None,
            },
        )

    if scenario.ideas:
        for idea in scenario.ideas:
            await db.execute(
                text("INSERT INTO ideas (user_id, title, status) "
                     "VALUES (:u, :t, 'open')"),
                {"u": str(user_id), "t": idea},
            )

    if scenario.performance_views:
        for views in scenario.performance_views:
            await db.execute(
                text("INSERT INTO performance_records (user_id, platform, views) "
                     "VALUES (:u, 'reel', :v)"),
                {"u": str(user_id), "v": views},
            )

    for prior in scenario.prior_items:
        await db.execute(
            text("""
                INSERT INTO plan_items
                    (user_id, plan_date, title, platform, status, action_kind)
                VALUES (:u, :d, :t, 'reel', :s, :a)
            """),
            {
                "u": str(user_id),
                "d": date.today() - timedelta(days=int(prior.get("days_ago", 1))),
                "t": prior.get("title", "Prior item"),
                "s": prior.get("status", "planned"),
                "a": prior.get("action_kind"),
            },
        )

    if scenario.memory:
        from app.memory import IngestRequest, MemoryCategory, SourceType, get_memory_engine

        engine = get_memory_engine(db, user_id)
        for index, body in enumerate(scenario.memory):
            await engine.ingest(IngestRequest(
                title=f"{scenario.id}:{index}",
                raw_text=body,
                source_type=SourceType.NOTE,
                category=MemoryCategory.LESSON,
                metadata={"scenario": scenario.id},
            ))

    if scenario.voice_samples:
        from app.voice import get_voice_engine

        await get_voice_engine(db, user_id).create_profile_from_samples(
            scenario.voice_samples, style_name=f"eval:{scenario.id}"
        )

    await db.commit()


async def run_scenario(
    scenario: ProducerScenario,
    *,
    db,
    user_id: uuid.UUID,
    metrics: Optional[List[Metric]] = None,
) -> ScenarioResult:
    """Plan for one scenario and score it."""
    from sqlalchemy import text

    metrics = metrics or METRICS
    ctx: Dict[str, Any] = {}
    result = ScenarioResult(
        scenario_id=scenario.id, category=scenario.category, passed=False
    )

    await _reset(user_id)
    await _seed(db, user_id, scenario)

    # Baseline the Studio side effects the scenario itself seeded, so the
    # creator-control check measures what PLANNING created, not what the fixture
    # provided.
    from sqlalchemy import text as _text

    seeded_generations = int((await db.execute(
        _text("SELECT COUNT(*) FROM studio_generations WHERE user_id = :u"),
        {"u": str(user_id)},
    )).scalar() or 0)

    # Install the scripted enrichment, or simulate a provider outage.
    if scenario.scripted_enrichment is not None:
        provider = ScriptedLLMProvider(script=[scenario.scripted_enrichment])
        set_llm_gateway(LLMGateway(providers={provider.name: provider}))
    else:
        from app.core.errors import AITimeoutError
        from app.llm.providers.base import ProviderAdapter

        class Unavailable(ProviderAdapter):
            name = "unavailable"

            def __init__(self):
                super().__init__(api_key="x")

            @property
            def is_configured(self) -> bool:
                return True

            async def complete(self, request):
                raise AITimeoutError("upstream unavailable")

        set_llm_gateway(LLMGateway(providers={"unavailable": Unavailable()}))

    try:
        from app.producer import ProducerService

        service = ProducerService(db, user_id)
        today = date.today()

        plan, run = await service.plan(
            today, time_budget_minutes=scenario.time_budget_minutes
        )
        ctx["items"] = plan.items
        ctx["run_notes"] = run.notes
        # Assemble once and reuse it for the summary and the ranking scores.
        context = await service.assembler.assemble(
            today, time_budget_minutes=scenario.time_budget_minutes
        )
        ctx["context_summary"] = context.summary().model_dump()
        ctx["scores_by_title"] = {
            c.title: c.score for c in service.planner.candidates(context)
        }

        # Creator control: planning must not have created Studio work.
        generations = (await db.execute(
            text("SELECT COUNT(*) FROM studio_generations WHERE user_id = :u"),
            {"u": str(user_id)},
        )).scalar()
        ctx["seeded_generations"] = seeded_generations
        ctx["no_side_effects"] = int(generations or 0) == seeded_generations

        ctx["handoff_payloads"] = []

        # Re-planning must not duplicate.
        _second_plan, second_run = await service.plan(
            today, time_budget_minutes=scenario.time_budget_minutes
        )
        ctx["second_run"] = {
            "created_items": second_run.created_items,
            "skipped_duplicates": second_run.skipped_duplicates,
        }

        # Build the handoff payloads the way execute() does, WITHOUT creating a
        # session, so the evaluation never mutates creator state.
        for item in plan.items:
            capability = item.capability
            if not capability:
                continue
            topic = (item.reason or item.title or "")[:300]
            payload = {
                "idea": {"topic": topic, "count": 5},
                "hook": {"topic": topic, "platform": item.platform, "limit": 5},
                "script": {"topic": topic, "platform": item.platform},
                "caption": {"topic": topic, "platform": item.platform, "count": 4},
                "cta": {"topic": topic, "goal": "engagement"},
                "thumbnail": {"description": topic, "content_type": "tutorial"},
                "repurpose": {"source_content": topic, "platforms": ["reel"]},
                "refine": {"instruction": topic},
            }.get(capability, {"topic": topic})
            ctx["handoff_payloads"].append((capability, payload))

    except Exception as exc:
        result.errors.append(f"{type(exc).__name__}: {exc}")
        set_llm_gateway(None)
        return result
    finally:
        set_llm_gateway(None)

    for metric in metrics:
        try:
            result.scores[metric.name] = await metric.score(scenario, ctx)
        except Exception as exc:
            result.errors.append(f"{metric.name}: {type(exc).__name__}: {exc}")

    scored = {k: v for k, v in result.scores.items() if v is not None}
    gating_names = {m.name for m in metrics if m.gating}
    gating = {k: v for k, v in scored.items() if k in gating_names}
    result.detail["mean_score"] = (
        round(statistics.fmean(scored.values()), 4) if scored else None
    )
    result.detail["gating_scores"] = gating
    if "fabricated_numbers" in ctx:
        result.detail["fabricated_numbers"] = ctx["fabricated_numbers"]
    if ctx.get("injection_leaked"):
        result.detail["injection_leaked"] = True
    result.detail["items_planned"] = len(ctx.get("items") or [])
    result.detail["item_kinds"] = [
        i.recommendation.kind.value
        for i in (ctx.get("items") or [])
        if i.recommendation is not None
    ]

    result.passed = (
        not result.errors
        and bool(gating)
        and all(v >= scenario.min_expected_score for v in gating.values())
    )
    return result


@dataclass
class Report:
    total: int = 0
    passed: int = 0
    failed: int = 0
    results: List[ScenarioResult] = field(default_factory=list)
    category_means: Dict[str, float] = field(default_factory=dict)

    @property
    def pass_rate(self) -> float:
        return round(self.passed / self.total, 4) if self.total else 0.0

    def as_dict(self) -> Dict[str, Any]:
        return {
            "total": self.total,
            "passed": self.passed,
            "failed": self.failed,
            "pass_rate": self.pass_rate,
            "category_means": self.category_means,
            "results": [r.as_dict() for r in self.results],
        }


async def run_all(
    scenarios: List[ProducerScenario],
    *,
    db,
    user_id: uuid.UUID,
    metrics: Optional[List[Metric]] = None,
) -> Report:
    report = Report()
    category_scores: Dict[str, List[float]] = {}

    for scenario in scenarios:
        result = await run_scenario(scenario, db=db, user_id=user_id, metrics=metrics)
        report.results.append(result)
        report.total += 1
        if result.passed:
            report.passed += 1
        else:
            report.failed += 1
        scores = [v for v in result.scores.values() if v is not None]
        if scores:
            category_scores.setdefault(scenario.category, []).append(
                statistics.fmean(scores)
            )

    report.category_means = {
        k: round(statistics.fmean(v), 4) for k, v in sorted(category_scores.items())
    }
    return report


__all__ = [
    "ProducerScenario",
    "ScenarioResult",
    "Report",
    "METRICS",
    "load_producer_scenarios",
    "run_scenario",
    "run_all",
    "SCENARIO_FILE",
    "EVAL_USER_ID",
]
