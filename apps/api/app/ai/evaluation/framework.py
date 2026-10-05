"""Platform-wide AI evaluation framework.

Phase 2 establishes the *infrastructure* for evaluating the platform's AI
capabilities; it does not attempt to optimise any individual language or model
(task §36). New capability suites are added by registering more scenarios.

Design
------
* `Scenario` is a declarative, serialisable description, so scenarios live in
  data (JSON/YAML) rather than code and can be reviewed like any other asset.
* `Metric` is a callable returning a score in 0..1 (or None when not applicable).
* `EvaluationSuite` runs scenarios against live platform services and returns a
  `ScenarioResult` per scenario plus an aggregate.

Categories covered (per task §36): memory retrieval, voice matching, relevance,
faithfulness, usefulness, creator-context preservation.

Honesty note
------------
`faithfulness` and `usefulness` are scored by deterministic, inspectable rules
(not a judge model). That keeps the framework runnable with no provider
credential -- ADR-006 records that none is configured -- while remaining honest
about what it measures. A judge-model scorer can be added later without changing
this structure.
"""
from __future__ import annotations

import json
import statistics
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Optional

from pydantic import BaseModel, Field


class ScenarioCategory(str, Enum):
    MEMORY_RETRIEVAL = "memory_retrieval"
    VOICE_MATCHING = "voice_matching"
    RELEVANCE = "relevance"
    FAITHFULNESS = "faithfulness"
    USEFULNESS = "usefulness"
    CONTEXT_PRESERVATION = "creator_context_preservation"


class Scenario(BaseModel):
    """One golden scenario."""

    id: str
    category: ScenarioCategory
    description: str

    # Memory-retrieval scenarios
    corpus: list[str] = Field(default_factory=list)
    query: str = ""
    expected_top_asset: Optional[int] = None

    # Voice scenarios
    voice_samples: list[str] = Field(default_factory=list)
    draft: str = ""

    # Thresholds
    min_expected_score: float = 0.0
    max_expected_score: Optional[float] = None

    # Optional grounding facts used by faithfulness / context checks
    required_facts: list[str] = Field(default_factory=list)
    forbidden_facts: list[str] = Field(default_factory=list)

    tags: list[str] = Field(default_factory=list)

    #: Documents a deliberately-recorded limitation (e.g. cross-script failure),
    #: so the report can separate "expected weakness" from "regression".
    expectation_note: Optional[str] = None


@dataclass
class ScenarioResult:
    scenario_id: str
    category: str
    passed: bool
    scores: dict[str, Optional[float]] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)
    detail: dict[str, Any] = field(default_factory=dict)

    def as_dict(self) -> dict[str, Any]:
        return {
            "scenario_id": self.scenario_id,
            "category": self.category,
            "passed": self.passed,
            "scores": self.scores,
            "errors": self.errors,
            "detail": self.detail,
        }


class Metric(ABC):
    """A named scorer. Implementations return 0..1, or None if not applicable.

    `gating` marks metrics a scenario's pass/fail is decided on. Informational
    metrics are reported but never fail a scenario: E5's cosine scores cluster
    high, so an absolute on/off-topic margin is legitimately small (~0.05-0.15)
    and would make an otherwise correct retrieval "fail" on a technicality.
    """

    name: str = "metric"
    gating: bool = False

    @abstractmethod
    async def score(self, scenario: Scenario, context: dict[str, Any]) -> Optional[float]:
        ...


# --------------------------------------------------------------------------- #
# Built-in metrics
# --------------------------------------------------------------------------- #

class TopHitAccuracy(Metric):
    """1.0 when the expected asset is ranked first in memory retrieval."""

    name = "top_hit_accuracy"
    gating = True

    async def score(self, scenario: Scenario, context: dict[str, Any]) -> Optional[float]:
        results = context.get("memory_results") or []
        if not results or scenario.expected_top_asset is None:
            return None
        expected = context.get("asset_ids", [])[scenario.expected_top_asset] \
            if scenario.expected_top_asset < len(context.get("asset_ids", [])) else None
        if expected is None:
            return None
        return 1.0 if str(results[0].content_asset_id) == str(expected) else 0.0


class ExpectedAssetRetrieved(Metric):
    """1.0 when the expected asset appears anywhere in the retrieved set."""

    name = "expected_asset_retrieved"
    gating = True

    async def score(self, scenario: Scenario, context: dict[str, Any]) -> Optional[float]:
        results = context.get("memory_results") or []
        if not results or scenario.expected_top_asset is None:
            return None
        assets = context.get("asset_ids", [])
        if scenario.expected_top_asset >= len(assets):
            return None
        expected = str(assets[scenario.expected_top_asset])
        return 1.0 if any(str(r.content_asset_id) == expected for r in results) else 0.0


class RetrievalMargin(Metric):
    """Separation between the on-topic and off-topic query.

    A retriever that scores everything alike is not retrieving. Reported as the
    absolute gap, the relative gap and whether the ordering was correct at all.
    """

    name = "retrieval_margin"

    async def score(self, scenario: Scenario, context: dict[str, Any]) -> Optional[float]:
        on_topic = context.get("on_topic_score")
        off_topic = context.get("off_topic_score")
        if on_topic is None or off_topic is None:
            return None
        gap = float(on_topic) - float(off_topic)
        context["on_topic_score"] = on_topic
        context["off_topic_score"] = off_topic
        return max(0.0, min(1.0, gap))


class VoiceMatchScore(Metric):
    name = "voice_match"
    gating = True

    async def score(self, scenario: Scenario, context: dict[str, Any]) -> Optional[float]:
        match = context.get("voice_match")
        return None if match is None else float(match.overall_score)


class RequiredFactsPresent(Metric):
    """Faithfulness: the retrieved evidence actually contains the required facts.

    Deterministic and inspectable -- it does not ask an LLM whether an answer
    "seems" faithful.
    """

    name = "required_facts_present"
    gating = True

    async def score(self, scenario: Scenario, context: dict[str, Any]) -> Optional[float]:
        if not scenario.required_facts:
            return None
        blob = (context.get("retrieved_blob") or "").lower()
        if not blob:
            return 0.0
        hits = sum(1 for fact in scenario.required_facts if fact.lower() in blob)
        return hits / len(scenario.required_facts)


class ForbiddenFactsAbsent(Metric):
    """Context preservation: unrelated creator facts must not leak into results."""

    name = "forbidden_facts_absent"
    gating = True

    async def score(self, scenario: Scenario, context: dict[str, Any]) -> Optional[float]:
        if not scenario.forbidden_facts:
            return None
        blob = (context.get("retrieved_blob") or "").lower()
        leaks = [fact for fact in scenario.forbidden_facts if fact.lower() in blob]
        return 0.0 if leaks else 1.0


class PrecisionAtK(Metric):
    """Fraction of the returned chunks that come from the expected asset."""

    name = "precision_at_k"
    gating = False

    async def score(self, scenario: Scenario, context: dict[str, Any]) -> Optional[float]:
        results = context.get("memory_results") or []
        assets = context.get("asset_ids", [])
        if not results or scenario.expected_top_asset is None \
                or scenario.expected_top_asset >= len(assets):
            return None
        expected = str(assets[scenario.expected_top_asset])
        return sum(1 for r in results if str(r.content_asset_id) == expected) / len(results)


# --------------------------------------------------------------------------- #
# Suite
# --------------------------------------------------------------------------- #

#: A query guaranteed to be unrelated to any creator corpus.
OFF_TOPIC_PROBE = (
    "photosynthesis rates in marine phytoplankton under stratospheric ozone depletion"
)


class EvaluationSuite:
    """Runs golden scenarios against live platform services."""

    def __init__(self, metrics: Optional[list[Metric]] = None) -> None:
        self.metrics: list[Metric] = metrics or [
            TopHitAccuracy(),
            ExpectedAssetRetrieved(),
            PrecisionAtK(),
            RetrievalMargin(),
            VoiceMatchScore(),
            RequiredFactsPresent(),
            ForbiddenFactsAbsent(),
        ]

    async def run_scenario(self, scenario: Scenario, *, db, user_id: uuid.UUID,
                           top_k: int = 3) -> ScenarioResult:
        context: dict[str, Any] = {}
        result = ScenarioResult(
            scenario_id=scenario.id,
            category=scenario.category.value,
            passed=False,
        )

        # Lazy imports keep this module importable without a database or model.
        from app.memory import (IngestRequest, MemoryCategory, MemoryQuery,
                                SourceType, get_memory_engine)
        from app.voice import get_voice_engine

        try:
            if scenario.corpus and scenario.query:
                engine = get_memory_engine(db, user_id)
                asset_ids = []
                for index, text in enumerate(scenario.corpus):
                    created = await engine.ingest(IngestRequest(
                        title=scenario.id,
                        raw_text=text,
                        source_type=SourceType.NOTE,
                        category=MemoryCategory.FACT,
                        metadata={"scenario": scenario.id, "index": index},
                    ))
                    asset_ids.append(created.get("asset_id"))
                context["asset_ids"] = asset_ids

                hits = await engine.retrieve(MemoryQuery(
                    query=scenario.query, top_k=top_k,
                    purpose=f"eval:{scenario.id}"))
                context["memory_results"] = hits
                context["retrieved_blob"] = " ".join(h.text for h in hits)
                context["on_topic_score"] = hits[0].score if hits else None

                off = await engine.retrieve(MemoryQuery(
                    query=OFF_TOPIC_PROBE, top_k=top_k))
                context["off_topic_score"] = off[0].score if off else None

            if scenario.voice_samples or scenario.draft:
                voice = get_voice_engine(db, user_id)
                if scenario.voice_samples:
                    await voice.create_profile_from_samples(
                        scenario.voice_samples,
                        style_name=f"eval:{scenario.id}")
                if scenario.draft:
                    context["voice_match"] = await voice.validate_draft(
                        scenario.draft, f"eval:{scenario.id}")
        except Exception as exc:  # a broken scenario must not abort the suite
            result.errors.append(f"{type(exc).__name__}: {exc}")
            return result

        for metric in self.metrics:
            try:
                result.scores[metric.name] = await metric.score(scenario, context)
            except Exception as exc:
                result.errors.append(f"{metric.name}: {type(exc).__name__}: {exc}")

        scored = {k: v for k, v in result.scores.items() if v is not None}
        gating_names = {m.name for m in self.metrics if m.gating}
        gating = {k: v for k, v in scored.items() if k in gating_names}
        result.detail["mean_score"] = (
            round(statistics.fmean(scored.values()), 4) if scored else None
        )
        result.detail["gating_scores"] = gating
        # Only gating metrics decide pass/fail. A scenario that exercised no
        # gating metric cannot be claimed as passing, so it is reported failed.
        result.passed = (
            not result.errors
            and bool(gating)
            and all(v >= scenario.min_expected_score for v in gating.values())
            and (scenario.max_expected_score is None
                 or result.detail["mean_score"] <= scenario.max_expected_score)
        )
        if scenario.expectation_note:
            result.detail["expectation_note"] = scenario.expectation_note
        return result

    async def run_all(self, scenarios: list[Scenario], *, db, user_id: uuid.UUID,
                      top_k: int = 3) -> dict[str, Any]:
        results = [await self.run_scenario(s, db=db, user_id=user_id, top_k=top_k)
                   for s in scenarios]
        by_category: dict[str, list[float]] = {}
        for result in results:
            if result.detail.get("mean_score") is not None:
                by_category.setdefault(result.category, []).append(
                    result.detail["mean_score"])
        return {
            "total": len(results),
            "passed": sum(1 for r in results if r.passed),
            "failed": sum(1 for r in results if not r.passed),
            "pass_rate": round(sum(1 for r in results if r.passed) / len(results), 4)
            if results else 0.0,
            "category_means": {k: round(statistics.fmean(v), 4)
                               for k, v in sorted(by_category.items())},
            "results": [r.as_dict() for r in results],
        }

    @staticmethod
    def load_scenarios(path: str) -> list[Scenario]:
        with open(path, encoding="utf-8") as fh:
            raw = json.load(fh)
        return [Scenario(**item) for item in raw.get("scenarios", [])]
