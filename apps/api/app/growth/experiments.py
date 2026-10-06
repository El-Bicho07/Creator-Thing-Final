"""Experiments and lessons.

The loop Phase 5 supports, kept deliberately small:

    hypothesis -> experiment -> content -> performance -> result -> lesson

There is no variant matrix, no traffic assignment, and no significance testing.
A solo creator runs one hypothesis against their own baseline; anything more would
be an experimentation platform, which is not what Phase 5 is for.

Evaluation is deterministic. "Did this work?" is a comparison of two numbers the
platform already holds, so it is computed, never generated.
"""
from __future__ import annotations

import statistics
from datetime import datetime
from typing import Any, Dict, List, Optional, Sequence

from app.growth.contracts import (
    ExperimentVerdict,
    PerformanceMetric,
    PerformanceSnapshot,
)
from app.growth.insights import score_confidence

#: Relative change below which an experiment is called inconclusive rather than
#: supported. Two posts five views apart is not evidence.
MIN_EFFECT_RATIO = 0.10

#: Records needed on each side before a verdict is offered at all.
MIN_OBSERVATIONS = 1


class ExperimentEvaluator:
    """Deterministic comparison of a variant against a baseline."""

    def __init__(self) -> None:
        pass

    def evaluate(
        self,
        *,
        metric: PerformanceMetric,
        variant: Sequence[PerformanceSnapshot],
        baseline: Sequence[PerformanceSnapshot],
    ) -> Dict[str, Any]:
        """Return observed, baseline, change and a verdict -- all computed."""
        variant_values = [
            float(s.metrics[metric]) for s in variant if metric in s.metrics
        ]
        baseline_values = [
            float(s.metrics[metric]) for s in baseline if metric in s.metrics
        ]

        observed = round(statistics.fmean(variant_values), 4) if variant_values else None
        baseline_avg = (
            round(statistics.fmean(baseline_values), 4) if baseline_values else None
        )

        change_pct: Optional[float] = None
        if observed is not None and baseline_avg:
            change_pct = round((observed - baseline_avg) * 100.0 / baseline_avg, 4)

        enough = (
            len(variant_values) >= MIN_OBSERVATIONS
            and len(baseline_values) >= MIN_OBSERVATIONS
        )

        verdict = ExperimentVerdict.INCONCLUSIVE
        explanation: str

        if not enough:
            explanation = (
                "Not enough measured records on both sides to judge this "
                f"hypothesis (variant {len(variant_values)}, "
                f"baseline {len(baseline_values)})."
            )
        elif change_pct is None:
            verdict = ExperimentVerdict.INCONCLUSIVE
            explanation = (
                f"Both sides measure 0 {metric.label}, so a percentage change is "
                "undefined."
            )
        elif abs(change_pct) / 100.0 < MIN_EFFECT_RATIO:
            verdict = ExperimentVerdict.INCONCLUSIVE
            explanation = (
                f"The difference ({change_pct}%) is inside the "
                f"{int(MIN_EFFECT_RATIO * 100)}% noise band, so this is not a "
                "result either way."
            )
        elif change_pct > 0:
            verdict = ExperimentVerdict.SUPPORTED
            explanation = (
                f"{metric.label} moved from {baseline_avg} to {observed} "
                f"({change_pct}%), which supports the hypothesis."
            )
        else:
            verdict = ExperimentVerdict.NOT_SUPPORTED
            explanation = (
                f"{metric.label} moved from {baseline_avg} to {observed} "
                f"({change_pct}%), which does not support the hypothesis."
            )

        return {
            "observed_value": observed,
            "baseline_value": baseline_avg,
            "change_pct": change_pct,
            "verdict": verdict,
            "explanation": explanation,
            "has_enough_data": enough,
            "variant_sample": len(variant_values),
            "baseline_sample": len(baseline_values),
        }

    # ------------------------------------------------------------------ #

    def confidence(self, evaluation: Dict[str, Any]) -> Any:
        """Deterministic confidence for a result.

        Never a model-assigned number.
        """
        return score_confidence(
            sample_size=evaluation["variant_sample"] + evaluation["baseline_sample"],
            values=[
                float(v)
                for v in (
                    evaluation.get("observed_value"),
                    evaluation.get("baseline_value"),
                )
                if v is not None
            ],
            recency_days=None,
            completeness=1.0,
        )


class LessonGenerator:
    """Turns an evaluated experiment or a high-confidence insight into a lesson.

    Not every insight becomes a lesson. `MIN_CONFIDENCE` enforces that a durable
    rule needs durable evidence -- otherwise a creator accumulates a list of
    confident-sounding platitudes and stops reading them.
    """

    MIN_CONFIDENCE = 0.5

    def from_experiment(
        self,
        *,
        hypothesis: str,
        evaluation: Dict[str, Any],
        experiment_id,
    ) -> Optional[Dict[str, Any]]:
        verdict = evaluation["verdict"]
        if verdict is ExperimentVerdict.INCONCLUSIVE:
            return None

        supported = verdict is ExperimentVerdict.SUPPORTED
        summary = (
            f"Hypothesis {'held' if supported else 'did not hold'}: {hypothesis}"
        )
        rule = (
            f"{'Repeat' if supported else 'Do not repeat'} this approach: "
            f"{hypothesis.strip()}"
        )
        # Confidence is computed from the same factors the evaluator uses. This
        # previously called a `self.confidence()` that did not exist, so every
        # confirmed experiment raised AttributeError instead of producing a lesson.
        confidence = score_confidence(
            sample_size=evaluation["variant_sample"] + evaluation["baseline_sample"],
            values=[
                float(v)
                for v in (
                    evaluation.get("observed_value"),
                    evaluation.get("baseline_value"),
                )
                if v is not None
            ],
            recency_days=None,
            completeness=1.0,
        )
        if confidence.score < self.MIN_CONFIDENCE:
            return None

        return {
            "insight_summary": summary,
            "actionable_rule": rule,
            "confidence": confidence.score,
            "reasons": confidence.reasons,
            "evidence": {
                "experiment_id": str(experiment_id),
                "verdict": verdict.value,
                "observed_value": evaluation.get("observed_value"),
                "baseline_value": evaluation.get("baseline_value"),
                "change_pct": evaluation.get("change_pct"),
                "computation": (
                    "mean(metric) per side; change_pct = "
                    "(variant_mean - baseline_mean) / baseline_mean * 100"
                ),
            },
        }

    # ------------------------------------------------------------------ #

    def from_insight(self, insight) -> Optional[Dict[str, Any]]:
        """Promote an insight to a durable rule when its evidence is strong."""
        if insight.confidence.score < self.MIN_CONFIDENCE:
            return None
        rule = insight.recommended_action or insight.summary
        return {
            "insight_summary": insight.summary,
            "actionable_rule": rule,
            "confidence": insight.confidence.score,
            "reasons": insight.confidence.reasons,
            "evidence": {
                "insight_id": str(insight.id) if insight.id else None,
                "rule_key": insight.rule_key,
                "insight_evidence": insight.evidence,
            },
            "source_records": insight.source_records,
        }


__all__ = [
    "ExperimentEvaluator",
    "LessonGenerator",
    "MIN_EFFECT_RATIO",
    "MIN_OBSERVATIONS",
]
