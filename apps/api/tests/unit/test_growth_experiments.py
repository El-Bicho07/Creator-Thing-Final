"""Experiments and lessons.

Phase 5 supports a deliberately small loop:

    hypothesis -> experiment -> performance -> result -> lesson

The property under test is that a verdict is **computed**, never generated, and
that an inconclusive result produces no lesson -- because a lesson drawn from noise
teaches a creator something false with the authority of a rule.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from app.growth.contracts import ExperimentVerdict, PerformanceMetric, PerformanceSnapshot
from app.growth.experiments import (
    MIN_EFFECT_RATIO,
    ExperimentEvaluator,
    LessonGenerator,
)

NOW = datetime(2026, 6, 15, tzinfo=timezone.utc)


def snap(record_id, *, views=100, likes=10, comments=2, shares=1):
    return PerformanceSnapshot(
        record_id=record_id, asset_id=f"asset-{record_id}",
        asset_title=record_id, platform="reel", published_at=None,
        recorded_at=NOW - timedelta(days=1),
        metrics={
            PerformanceMetric.VIEWS: views, PerformanceMetric.LIKES: likes,
            PerformanceMetric.COMMENTS: comments, PerformanceMetric.SHARES: shares,
        },
        unavailable=[],
    )


@pytest.fixture
def evaluator():
    return ExperimentEvaluator()


# --------------------------------------------------------------------------- #
# Verdicts
# --------------------------------------------------------------------------- #


def test_a_clear_lift_is_supported(evaluator):
    result = evaluator.evaluate(
        metric=PerformanceMetric.VIEWS,
        variant=[snap("v", views=200)],
        baseline=[snap("b", views=100)],
    )
    assert result["verdict"] is ExperimentVerdict.SUPPORTED
    assert result["observed_value"] == 200
    assert result["baseline_value"] == 100
    assert result["change_pct"] == pytest.approx(100.0, abs=1e-6)


def test_a_clear_drop_is_not_supported(evaluator):
    result = evaluator.evaluate(
        metric=PerformanceMetric.VIEWS,
        variant=[snap("v", views=50)],
        baseline=[snap("b", views=100)],
    )
    assert result["verdict"] is ExperimentVerdict.NOT_SUPPORTED
    assert result["change_pct"] == pytest.approx(-50.0, abs=1e-6)


def test_a_difference_inside_the_noise_band_is_inconclusive(evaluator):
    """Two posts five views apart is not evidence either way."""
    result = evaluator.evaluate(
        metric=PerformanceMetric.VIEWS,
        variant=[snap("v", views=101)],
        baseline=[snap("b", views=100)],
    )
    assert result["verdict"] is ExperimentVerdict.INCONCLUSIVE
    assert "noise band" in result["explanation"]


def test_the_noise_band_boundary_is_exact(evaluator):
    """The band is +/-10%, so the boundary sits at 1100 views against 1000."""
    assert MIN_EFFECT_RATIO == 0.10
    just_inside = evaluator.evaluate(
        metric=PerformanceMetric.VIEWS,
        variant=[snap("v", views=1099)], baseline=[snap("b", views=1000)],
    )
    just_outside = evaluator.evaluate(
        metric=PerformanceMetric.VIEWS,
        variant=[snap("v", views=1101)], baseline=[snap("b", views=1000)],
    )
    assert just_inside["verdict"] is ExperimentVerdict.INCONCLUSIVE
    assert just_outside["verdict"] is ExperimentVerdict.SUPPORTED


def test_no_baseline_yields_no_verdict(evaluator):
    result = evaluator.evaluate(
        metric=PerformanceMetric.VIEWS, variant=[snap("v", views=100)], baseline=[],
    )
    assert result["verdict"] is ExperimentVerdict.INCONCLUSIVE
    assert result["has_enough_data"] is False
    assert "Not enough measured records" in result["explanation"]


def test_two_zero_sides_report_an_undefined_change_not_infinity(evaluator):
    result = evaluator.evaluate(
        metric=PerformanceMetric.VIEWS,
        variant=[snap("v", views=0)], baseline=[snap("b", views=0)],
    )
    assert result["change_pct"] is None
    assert result["verdict"] is ExperimentVerdict.INCONCLUSIVE
    assert "undefined" in result["explanation"]


def test_the_explanation_states_the_computed_values(evaluator):
    result = evaluator.evaluate(
        metric=PerformanceMetric.VIEWS,
        variant=[snap("v", views=200)], baseline=[snap("b", views=100)],
    )
    assert "200" in result["explanation"]
    assert "100" in result["explanation"]


def test_records_missing_the_metric_do_not_count_as_zero(evaluator):
    partial = PerformanceSnapshot(
        record_id="p", asset_id="a", asset_title="p", platform="reel",
        published_at=None, recorded_at=NOW,
        metrics={PerformanceMetric.VIEWS: 100},
        unavailable=[PerformanceMetric.LIKES],
    )
    result = evaluator.evaluate(
        metric=PerformanceMetric.LIKES,
        variant=[partial], baseline=[snap("b", likes=10)],
    )
    assert result["verdict"] is ExperimentVerdict.INCONCLUSIVE
    assert result["variant_sample"] == 0


def test_evaluation_confidence_is_computed(evaluator):
    result = evaluator.evaluate(
        metric=PerformanceMetric.VIEWS,
        variant=[snap("v", views=200), snap("v2", views=200)],
        baseline=[snap("b", views=100), snap("b2", views=100)],
    )
    confidence = evaluator.confidence(result)
    assert 0.0 <= confidence.score <= 1.0
    assert set(confidence.factors) == {
        "sample_size", "consistency", "recency", "completeness"
    }


# --------------------------------------------------------------------------- #
# Lessons
# --------------------------------------------------------------------------- #


@pytest.fixture
def lessons():
    return LessonGenerator()


def test_a_supported_experiment_produces_a_lesson(lessons, evaluator):
    evaluation = evaluator.evaluate(
        metric=PerformanceMetric.VIEWS,
        variant=[snap("v", views=200), snap("v2", views=210)],
        baseline=[snap("b", views=100), snap("b2", views=95)],
    )
    lesson = lessons.from_experiment(
        hypothesis="Tutorials outperform", evaluation=evaluation,
        experiment_id="exp-1",
    )
    assert lesson is not None
    assert "Tutorials outperform" in lesson["insight_summary"]
    assert lesson["actionable_rule"].startswith("Repeat")
    assert lesson["evidence"]["computation"], "a lesson must record its arithmetic"


def test_a_refuted_experiment_produces_a_do_not_repeat_lesson(lessons, evaluator):
    evaluation = evaluator.evaluate(
        metric=PerformanceMetric.VIEWS,
        variant=[snap("v", views=50), snap("v2", views=48)],
        baseline=[snap("b", views=100), snap("b2", views=100)],
    )
    lesson = lessons.from_experiment(
        hypothesis="Longer videos work", evaluation=evaluation, experiment_id="e",
    )
    assert lesson is not None
    assert lesson["actionable_rule"].startswith("Do not repeat")


def test_an_inconclusive_experiment_produces_no_lesson(lessons, evaluator):
    evaluation = evaluator.evaluate(
        metric=PerformanceMetric.VIEWS,
        variant=[snap("v", views=101)], baseline=[snap("b", views=100)],
    )
    assert lessons.from_experiment(
        hypothesis="x", evaluation=evaluation, experiment_id="e",
    ) is None, "a lesson drawn from noise teaches something false"


def test_a_thin_result_yields_a_medium_confidence_lesson_that_says_so(lessons):
    """A lesson is allowed on thin evidence, but it must disclose the weakness.

    Refusing outright would discard a real 100% swing; publishing it at high
    confidence would overstate it. The lesson carries the reason instead.
    """
    from app.growth.contracts import ConfidenceBand

    assert lessons.MIN_CONFIDENCE == 0.5
    thin = {
        "verdict": ExperimentVerdict.SUPPORTED,
        "observed_value": 200.0, "baseline_value": 100.0, "change_pct": 100.0,
        "variant_sample": 1, "baseline_sample": 1,
    }
    lesson = lessons.from_experiment(
        hypothesis="x", evaluation=thin, experiment_id="e",
    )
    assert lesson is not None
    assert lesson["confidence"] < 0.75
    assert any("only 2 record" in r for r in lesson["reasons"]), (
        "a thin lesson must say how thin it is"
    )


def test_a_weak_insight_is_not_promoted_to_a_lesson(lessons):
    from app.growth.contracts import (
        ConfidenceBand, ConfidenceScore, ImpactLevel, Insight, InsightType,
    )
    import uuid

    weak = Insight(
        user_id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        insight_type=InsightType.PERFORMANCE_TREND, title="t", summary="s",
        evidence={"metric": "views"}, source_records=["r1"],
        confidence=ConfidenceScore(score=0.2, band=ConfidenceBand.LOW,
                                   reasons=["only 1 record"]),
        impact=ImpactLevel.LOW, rule_key="trend:views",
    )
    assert lessons.from_insight(weak) is None


def test_a_strong_insight_becomes_an_actionable_rule(lessons):
    from app.growth.contracts import (
        ConfidenceBand, ConfidenceScore, ImpactLevel, Insight, InsightType,
    )
    import uuid

    strong = Insight(
        user_id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        insight_type=InsightType.CONTENT_PATTERN, title="t", summary="s",
        evidence={"metric": "engagement_rate"},
        source_records=["r1", "r2", "r3"],
        confidence=ConfidenceScore(score=0.8, band=ConfidenceBand.HIGH),
        impact=ImpactLevel.HIGH, rule_key="pattern:above_baseline",
        recommended_action="Repeat the educational format",
    )
    lesson = lessons.from_insight(strong)
    assert lesson is not None
    assert lesson["actionable_rule"] == "Repeat the educational format"
    assert lesson["source_records"] == ["r1", "r2", "r3"]
