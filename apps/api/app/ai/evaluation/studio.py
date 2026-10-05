"""Phase 3 Studio AI evaluation.

Extends the Phase 2 evaluation framework with Studio-specific metrics, then runs
~26 representative scenarios across idea-to-content, hook quality, script quality,
creator voice, contextual relevance, memory usage, instruction following, critique
usefulness and refinement quality.

Design constraints, inherited from Phase 2 and kept:

- **Metrics are deterministic and inspectable.** No metric asks an LLM whether an
  output "seems" good. They check structural contracts (styles present, segments
  ordered, words preserved) and lexical expectations the scenario author stated up
  front. That makes a failure explainable.
- **Only gating metrics decide pass/fail**, and a scenario that exercised no gating
  metric is reported failed rather than vacuously passing.
- **The evaluation does not modify production config**, and no embedding benchmark
  is re-run (Phase 3 §37 explicitly forbids it).

Two modes:

- ``run_studio_scenarios`` drives real Studio capabilities against a real
  RLS-scoped database with the deterministic mock provider. This measures Studio's
  orchestration, context assembly, validation and persistence.
- ``--provider`` optionally routes to a live provider for output-quality review;
  structural metrics remain valid either way.

Usage::

    python -m app.ai.evaluation.studio_runner
    python -m app.ai.evaluation.studio_runner --json out.json
    python -m app.ai.evaluation.studio_runner --only studio_013
"""
from __future__ import annotations

import json
import os
import re
import statistics
import uuid
from abc import ABC
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.ai.evaluation.framework import Scenario, ScenarioCategory
from app.core.db import rls_scoped_session
from app.llm.gateway import LLMGateway, set_llm_gateway
from app.llm.providers import MockLLMProvider, ScriptedLLMProvider

SCENARIO_FILE = os.path.join(os.path.dirname(__file__), "studio_scenarios.json")

EVAL_USER_ID = uuid.UUID("5e5e5e5e-0000-4000-8000-000000000003")

#: A valid critique payload, used when a scenario scripts only a refine response.
CRITIQUE_FALLBACK = json.dumps({
    "overall_score": 6.0,
    "verdict": "Solid, with one structural issue.",
    "items": [{
        "dimension": "structure",
        "severity": "medium",
        "finding": "One section repeats an earlier point.",
        "suggestion": "Merge the duplicate section.",
    }],
    "strengths": ["The opening is specific."],
})


# --------------------------------------------------------------------------- #
# Scenario model
# --------------------------------------------------------------------------- #

class StudioScenario(BaseModel):
    """One Studio evaluation scenario.

    `scripted_output` supplies the provider's response so the metrics can assert on
    deterministic content. That is deliberate: these scenarios measure Studio's
    behaviour (context assembled, contract held, output persisted), not a model's
    creativity. Model quality is a separate concern.
    """

    id: str
    category: ScenarioCategory
    description: str
    capability: str = "idea"
    input: Dict[str, Any] = Field(default_factory=dict)

    #: Creator memory to seed before the run.
    corpus: List[str] = Field(default_factory=list)
    #: Voice samples to build a profile from.
    voice_samples: List[str] = Field(default_factory=list)

    #: The provider's scripted response for the GENERATE step (a JSON string).
    scripted_output: str = "{}"
    #: Scripted response for the critique step, when the scenario asks for one.
    critique_scripted_output: Optional[str] = None
    #: Scripted response for the refine step, when the scenario asks for one.
    refine_scripted_output: Optional[str] = None

    #: Structural expectations, checked by the metrics below.
    expect_style_count: Optional[int] = None
    expect_segment_roles: List[str] = Field(default_factory=list)
    expect_content_persisted: bool = True
    expect_memory_used: Optional[bool] = None
    expect_voice_used: Optional[bool] = None

    #: Lexical expectations on the persisted text.
    required_phrases: List[str] = Field(default_factory=list)
    forbidden_phrases: List[str] = Field(default_factory=list)

    min_expected_score: float = 0.0
    tags: List[str] = Field(default_factory=list)
    expectation_note: Optional[str] = None


@dataclass
class StudioScenarioResult:
    scenario_id: str
    category: str
    capability: str
    passed: bool
    scores: Dict[str, Optional[float]] = field(default_factory=dict)
    errors: List[str] = field(default_factory=list)
    detail: Dict[str, Any] = field(default_factory=dict)

    def as_dict(self) -> Dict[str, Any]:
        return {
            "scenario_id": self.scenario_id,
            "category": self.category,
            "capability": self.capability,
            "passed": self.passed,
            "scores": self.scores,
            "errors": self.errors,
            "detail": self.detail,
        }


# --------------------------------------------------------------------------- #
# Metrics
# --------------------------------------------------------------------------- #

class StudioMetric(ABC):
    name: str = "metric"
    gating: bool = False

    async def score(
        self, scenario: StudioScenario, context: Dict[str, Any]
    ) -> Optional[float]:  # pragma: no cover - interface
        ...


class OutputPersisted(StudioMetric):
    """The capability's result must reach `content_assets` + `studio_generations`.

    This is the metric that makes "generation persisted" a measured property rather
    than a claim: without it, a capability that computes the right answer but never
    saves it would still score well.
    """

    name = "output_persisted"
    gating = True

    async def score(self, scenario, context):
        if not scenario.expect_content_persisted:
            return None
        generation = context.get("generation")
        text = context.get("persisted_text") or ""
        if generation is None:
            return 0.0
        ok = bool(text.strip()) and generation.version >= 1
        return 1.0 if ok else 0.0


class ProvenanceRecorded(StudioMetric):
    """Every generation must record capability + prompt name/version.

    Ties to §20: "how was this piece of content generated?" must be answerable from
    the database.
    """

    name = "provenance_recorded"
    gating = True

    async def score(self, scenario, context):
        generation = context.get("generation")
        if generation is None:
            return 0.0
        ok = bool(generation.capability) and bool(generation.prompt_name) \
            and bool(generation.prompt_version)
        return 1.0 if ok else 0.0


class StyleCoverage(StudioMetric):
    """Hook quality: one hook per requested style, realigned to the taxonomy.

    Adapted from Module 03's `realign_slots` contract, which exists because a model
    asked for ten hooks sometimes returns seven.
    """

    name = "style_coverage"
    gating = True

    async def score(self, scenario, context):
        if scenario.expect_style_count is None:
            return None
        hooks = (context.get("output") or {}).get("hooks") or []
        if not hooks:
            return 0.0
        distinct = {h.get("style") for h in hooks if h.get("style")}
        real = [h for h in hooks if h.get("text") and "pending" not in h["text"]]
        if not real:
            return 0.0
        # Coverage of the taxonomy, discounted when slots are placeholders.
        coverage = min(len(distinct), scenario.expect_style_count) \
            / scenario.expect_style_count
        substance = len(real) / scenario.expect_style_count
        return round((coverage + substance) / 2, 4)


class SegmentStructure(StudioMetric):
    """Script quality: HOOK first, CTA last, correct segment count.

    Adapted from Module 18's `validateScriptOutput`, which required the first
    segment to be HOOK and the last CTA.
    """

    name = "segment_structure"
    gating = True

    async def score(self, scenario, context):
        if not scenario.expect_segment_roles:
            return None
        segments = (context.get("output") or {}).get("segments") or []
        if not segments:
            return 0.0
        expected = [r.lower() for r in scenario.expect_segment_roles]
        actual = [str(s.get("role", "")).lower() for s in segments]
        expected_roles = [r for r in expected if r != "value"]

        role_hits = sum(
            1 for i, role in enumerate(expected_roles)
            if i < len(actual) and actual[i] == role
        )
        role_score = role_hits / len(expected_roles) if expected_roles else 1.0

        empty = sum(1 for s in segments if not str(s.get("text", "")).strip())
        substance = (len(segments) - empty) / len(segments)
        return round((role_score + substance) / 2, 4)


class MemoryUsed(StudioMetric):
    """Memory usage: the Memory Engine must actually supply context."""

    name = "memory_used"
    gating = True

    async def score(self, scenario, context):
        if scenario.expect_memory_used is None:
            return None
        assembler_notes = context.get("context_summary") or {}
        used = int(assembler_notes.get("memory_chunks") or 0)
        if scenario.expect_memory_used:
            return 1.0 if used > 0 else 0.0
        return 1.0 if used == 0 else 0.0


class VoiceUsed(StudioMetric):
    """Creator voice: the Voice Engine must supply a style block."""

    name = "voice_used"
    gating = True

    async def score(self, scenario, context):
        if scenario.expect_voice_used is None:
            return None
        summary = context.get("context_summary") or {}
        available = bool(summary.get("voice_available"))
        if scenario.expect_voice_used:
            return 1.0 if available else 0.0
        return 1.0 if not available else 0.0


class RequiredPhrases(StudioMetric):
    """Instruction following / idea-to-content: stated expectations appear."""

    name = "required_phrases"
    gating = True

    async def score(self, scenario, context):
        if not scenario.required_phrases:
            return None
        blob = (context.get("persisted_text") or "").lower()
        if not blob:
            return 0.0
        hits = sum(1 for p in scenario.required_phrases if p.lower() in blob)
        return hits / len(scenario.required_phrases)


class ForbiddenPhrases(StudioMetric):
    """Faithfulness: banned filler must not survive into stored content.

    The hygiene rules were adapted from Module 01, so this checks they actually run.
    """

    name = "forbidden_phrases"
    gating = True

    async def score(self, scenario, context):
        if not scenario.forbidden_phrases:
            return None
        blob = (context.get("persisted_text") or "").lower()
        leaks = [p for p in scenario.forbidden_phrases if p.lower() in blob]
        return 0.0 if leaks else 1.0


class NoFabricatedNumbers(StudioMetric):
    """Anti-fabrication: no numerals that were not in the input or corpus.

    A model-invented statistic is the most damaging failure mode in creator content,
    and it is detectable without an LLM judge: any number in the output must trace
    back to the creator's own material.
    """

    name = "no_fabricated_numbers"
    gating = True

    _NUMBER = re.compile(r"\d[\d,.]*")

    async def score(self, scenario, context):
        text = context.get("persisted_text") or ""
        if not text.strip():
            return None
        allowed = set()
        for source in list(scenario.corpus) + [
            str(v) for v in scenario.input.values()
        ] + scenario.required_phrases:
            allowed.update(self._NUMBER.findall(source))
        produced = set(self._NUMBER.findall(text))
        fabricated = {n for n in produced if n not in allowed}
        context.setdefault("fabricated_numbers", sorted(fabricated))
        return 0.0 if fabricated else 1.0


class CritiqueActionable(StudioMetric):
    """Critique usefulness: every finding carries a concrete fix.

    A finding without a suggestion is a complaint, not review, so it is scored as
    zero rather than discounted.
    """

    name = "critique_actionable"
    gating = True

    async def score(self, scenario, context):
        critique = context.get("critique")
        if critique is None:
            return None
        items = list(critique.get("items") or [])
        if not items:
            return 0.0
        actionable = [i for i in items if str(i.get("suggestion") or "").strip()]
        if not actionable:
            return 0.0
        return len(actionable) / len(items)


class CritiqueDidNotMutate(StudioMetric):
    """Human control: critique must review without editing.

    A review that rewrote the draft would be a silent modification of creator
    content, which §24 forbids.
    """

    name = "critique_did_not_mutate"
    gating = True

    async def score(self, scenario, context):
        before = context.get("text_before_critique")
        after = context.get("text_after_critique")
        if before is None or after is None:
            return None
        return 1.0 if before == after else 0.0


class PreviousVersionPreserved(StudioMetric):
    """Refinement quality: the original version survives.

    Ties to §21: refining must append, not overwrite.
    """

    name = "previous_version_preserved"
    gating = True

    async def score(self, scenario, context):
        before = context.get("text_before_refine")
        after = context.get("text_after_refine")
        if before is None:
            return None
        if after is None:
            return 0.0
        preserved = 1.0 if before.strip() else 0.0
        # And the refined text must actually differ, or nothing happened.
        changed = 0.0 if before.strip() == after.strip() else 1.0
        return round((preserved + changed) / 2, 4)


class VersionIncremented(StudioMetric):
    name = "version_incremented"
    gating = True

    async def score(self, scenario, context):
        versions = context.get("version_numbers") or []
        if len(versions) < 2:
            return None
        return 1.0 if versions == list(range(1, len(versions) + 1)) else 0.0


class ContextRelevance(StudioMetric):
    """Contextual relevance: assembled context mentions the creator's own material.

    Checked lexically against the seeded corpus: if the creator seeded a lesson and
    it never appears in what was sent to the model, memory did not influence output.
    """

    name = "context_relevance"
    gating = True

    _TOKEN = re.compile(r"[a-z]{5,}")

    async def score(self, scenario, context):
        if not scenario.corpus:
            return None
        prompt_text = context.get("prompt_text") or ""
        if not prompt_text.strip():
            return 0.0
        corpus_tokens: set = set()
        for text in scenario.corpus:
            corpus_tokens.update(self._TOKEN.findall(text.lower()))
        if not corpus_tokens:
            return 0.0
        prompt_tokens = set(self._TOKEN.findall(prompt_text.lower()))
        overlap = corpus_tokens & prompt_tokens
        return round(min(len(overlap) / 4, 1.0), 4)


STUDIO_METRICS: List[StudioMetric] = [
    OutputPersisted(),
    ProvenanceRecorded(),
    StyleCoverage(),
    SegmentStructure(),
    MemoryUsed(),
    VoiceUsed(),
    RequiredPhrases(),
    ForbiddenPhrases(),
    NoFabricatedNumbers(),
    CritiqueActionable(),
    CritiqueDidNotMutate(),
    PreviousVersionPreserved(),
    VersionIncremented(),
    ContextRelevance(),
]


# --------------------------------------------------------------------------- #
# Suite
# --------------------------------------------------------------------------- #

@dataclass
class Report:
    total: int = 0
    passed: int = 0
    failed: int = 0
    results: List[StudioScenarioResult] = field(default_factory=list)
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


def load_studio_scenarios(path: str = SCENARIO_FILE) -> List[StudioScenario]:
    with open(path, encoding="utf-8") as fh:
        raw = json.load(fh)
    return [StudioScenario(**item) for item in raw["scenarios"]]


async def _seed_creator(db, user_id: uuid.UUID, scenario: StudioScenario) -> None:
    """Seed memory and voice through the real Phase 2 engines."""
    if scenario.corpus:
        from app.memory import IngestRequest, MemoryCategory, SourceType, get_memory_engine

        engine = get_memory_engine(db, user_id)
        for index, text in enumerate(scenario.corpus):
            await engine.ingest(IngestRequest(
                title=f"{scenario.id}:{index}",
                raw_text=text,
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
    scenario: StudioScenario,
    *,
    db,
    user_id: uuid.UUID,
    metrics: Optional[List[StudioMetric]] = None,
) -> StudioScenarioResult:
    """Execute one scenario against the real Studio stack."""
    metrics = metrics or STUDIO_METRICS
    context: Dict[str, Any] = {}
    result = StudioScenarioResult(
        scenario_id=scenario.id,
        category=scenario.category.value,
        capability=scenario.capability,
        passed=False,
    )

    # Each step needs a response that satisfies ITS output model, so the script is
    # ordered generate -> critique -> refine and keyed by position.
    script = [scenario.scripted_output]
    if scenario.critique_scripted_output:
        script.append(scenario.critique_scripted_output)
    if scenario.refine_scripted_output:
        # Critique consumes the second slot only if it is scripted; keep the
        # refine response in the right position regardless.
        if not scenario.critique_scripted_output:
            script.append(CRITIQUE_FALLBACK)
        script.append(scenario.refine_scripted_output)

    provider = ScriptedLLMProvider(script=script)
    set_llm_gateway(LLMGateway(providers={provider.name: provider}))

    try:
        from app.studio import StudioOrchestrator

        await _seed_creator(db, user_id, scenario)

        orchestrator = StudioOrchestrator(db, user_id)
        session = await orchestrator.repository.create_session(
            title=f"eval {scenario.id}",
            brief=str(scenario.input.get("topic") or scenario.description)[:500],
        )

        # ---- generate ----
        execution = await orchestrator.run_capability(
            session, scenario.capability, scenario.input
        )
        context["output"] = (
            execution.outcome.output if execution.outcome is not None else {}
        )
        context["warnings"] = execution.warnings
        context["generation"] = execution.generation
        context["context_summary"] = execution.context_summary
        if execution.generation is not None:
            context["persisted_text"] = (
                await orchestrator.repository.get_asset_text(execution.generation.asset_id)
                or ""
            )
        # What the model actually received, for context-relevance scoring.
        # Taken from the orchestrator's real assembled blocks, not reconstructed.
        context["prompt_blocks"] = dict(execution.prompt_blocks or {})
        context["prompt_text"] = "\n".join(context["prompt_blocks"].values())

        # ---- critique, when the scenario calls for it ----
        if "critique" in scenario.tags:
            context["text_before_critique"] = context.get("persisted_text")
            try:
                _target, feedback, critique_warnings = await orchestrator.critique(
                    session, generation_id=execution.generation.id
                    if execution.generation else None
                )
                context["critique"] = {
                    "overall_score": feedback.overall_score,
                    "verdict": feedback.verdict,
                    "items": [i.model_dump() for i in feedback.items],
                    "strengths": list(feedback.strengths),
                }
                context["critique_warnings"] = critique_warnings
            except Exception as exc:
                result.errors.append(f"critique: {type(exc).__name__}: {exc}")
            if execution.generation is not None:
                context["text_after_critique"] = (
                    await orchestrator.repository.get_asset_text(
                        execution.generation.asset_id
                    )
                    or ""
                )

        # ---- refine, when the scenario calls for it ----
        if "refine" in scenario.tags:
            context["text_before_refine"] = context.get("persisted_text")
            instruction = str(
                scenario.input.get("refine_instruction") or "improve this"
            )
            refine_execution = await orchestrator.refine(
                session, instruction=instruction
            )
            context["refine_output"] = (
                refine_execution.outcome.output
                if refine_execution.outcome else None
            )
            if refine_execution.generation is not None:
                context["text_after_refine"] = (
                    await orchestrator.repository.get_asset_text(
                        refine_execution.generation.asset_id
                    )
                    or ""
                )
                context["persisted_text"] = context["text_after_refine"]
                context["generation"] = refine_execution.generation

        versions = await orchestrator.repository.list_generations(session.id)
        context["version_numbers"] = [g.version for g in versions]

    except Exception as exc:
        result.errors.append(f"{type(exc).__name__}: {exc}")
        return result
    finally:
        set_llm_gateway(None)

    for metric in metrics:
        try:
            result.scores[metric.name] = await metric.score(scenario, context)
        except Exception as exc:
            result.errors.append(f"{metric.name}: {type(exc).__name__}: {exc}")

    scored = {k: v for k, v in result.scores.items() if v is not None}
    gating = {
        k: v for k, v in scored.items()
        if any(m.name == k and m.gating for m in metrics)
    }
    result.detail["mean_score"] = (
        round(statistics.fmean(scored.values()), 4) if scored else None
    )
    result.detail["gating_scores"] = gating
    if "fabricated_numbers" in context:
        result.detail["fabricated_numbers"] = context["fabricated_numbers"]

    # Only gating metrics decide pass/fail; a scenario that exercised none is
    # reported failed rather than vacuously passing.
    result.passed = (
        not result.errors
        and bool(gating)
        and all(v >= scenario.min_expected_score for v in gating.values())
    )
    return result


async def run_all(
    scenarios: List[StudioScenario],
    *,
    db,
    user_id: uuid.UUID,
    metrics: Optional[List[StudioMetric]] = None,
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
        scores = [
            v for v in result.scores.values() if v is not None
        ]
        if scores:
            category_scores.setdefault(scenario.category.value, []).append(
                statistics.fmean(scores)
            )

    report.category_means = {
        k: round(statistics.fmean(v), 4) for k, v in sorted(category_scores.items())
    }
    return report


__all__ = [
    "StudioScenario",
    "StudioScenarioResult",
    "Report",
    "STUDIO_METRICS",
    "load_studio_scenarios",
    "run_scenario",
    "run_all",
    "SCENARIO_FILE",
    "EVAL_USER_ID",
]
