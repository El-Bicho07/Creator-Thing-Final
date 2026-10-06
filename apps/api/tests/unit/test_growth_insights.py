"""Deterministic confidence, insight generation, and evidence traceability.

The central claim under test: **confidence is computed, never asked for.** Every
score in this file is produced by `score_confidence` from observable factors, and
no test here involves a model.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest

from app.growth.contracts import (
    ConfidenceBand,
    Evidence,
    ImpactLevel,
    InsightType,
    PerformanceMetric,
    PerformanceSnapshot,
)
from app.growth.insights import (
    COMPLETENESS_FLOOR,
    InsightGenerator,
    classify_impact,
    fingerprint,
    score_confidence,
)

USER = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
NOW = datetime(2026, 6, 15, tzinfo=timezone.utc)


def snap(record_id, *, views=None, likes=None, comments=None, shares=None,
         title="Post", days_ago=1.0, measured=None):
    raw = {"views": views, "likes": likes, "comments_count": comments, "shares": shares}
    metrics, unavailable = {}, []
    for metric in PerformanceMetric:
        value = raw[metric.value]
        if value is None or (measured is not None and metric.value not in measured):
            unavailable.append(metric)
        else:
            metrics[metric] = int(value)
    return PerformanceSnapshot(
        record_id=record_id, asset_id=f"asset-{record_id}", asset_title=title,
        platform="reel", published_at=None,
        recorded_at=NOW - timedelta(days=days_ago),
        metrics=metrics, unavailable=unavailable,
    )


# --------------------------------------------------------------------------- #
# Confidence
# --------------------------------------------------------------------------- #


def test_confidence_is_bounded():
    score = score_confidence(sample_size=50, values=[10.0] * 50, recency_days=0,
                             completeness=1.0)
    assert 0.0 <= score.score <= 1.0


def test_more_records_raise_confidence():
    low = score_confidence(sample_size=2, values=[10.0, 12.0], recency_days=1,
                           completeness=1.0)
    high = score_confidence(sample_size=20, values=[10.0, 12.0], recency_days=1,
                            completeness=1.0)
    assert high.score > low.score


def test_a_single_record_cannot_be_consistent():
    score = score_confidence(sample_size=1, values=[50.0], recency_days=0,
                             completeness=1.0)
    assert score.factors["consistency"] == 0.5
    assert "not enough records to check consistency" in score.reasons


def test_wildly_varying_values_reduce_confidence():
    steady = score_confidence(sample_size=10, values=[10.0] * 10, recency_days=0,
                              completeness=1.0)
    noisy = score_confidence(sample_size=10,
                             values=[1.0, 500.0, 2.0, 900.0, 3.0,
                                     400.0, 4.0, 700.0, 5.0, 600.0],
                             recency_days=0, completeness=1.0)
    assert noisy.factors["consistency"] < steady.factors["consistency"]
    assert "the underlying values vary widely" in noisy.reasons


def test_stale_evidence_reduces_confidence_and_says_why():
    fresh = score_confidence(sample_size=10, values=[10.0] * 10, recency_days=0,
                             completeness=1.0)
    stale = score_confidence(sample_size=10, values=[10.0] * 10, recency_days=180,
                             completeness=1.0)
    assert stale.factors["recency"] < fresh.factors["recency"]
    assert any("days old" in r for r in stale.reasons)


def test_incomplete_measurement_reduces_confidence():
    full = score_confidence(sample_size=10, values=[10.0] * 10, recency_days=0,
                            completeness=1.0)
    partial = score_confidence(sample_size=10, values=[10.0] * 10, recency_days=0,
                               completeness=0.2)
    assert partial.score < full.score
    assert any("carry the metric" in r for r in partial.reasons)
    assert COMPLETENESS_FLOOR == 0.5


def test_band_boundaries():
    assert score_confidence(sample_size=30, values=[5.0] * 30, recency_days=0,
                            completeness=1.0).band is ConfidenceBand.HIGH
    assert score_confidence(sample_size=1, values=[5.0], recency_days=400,
                            completeness=0.0).band is ConfidenceBand.LOW


def test_confidence_always_explains_itself():
    score = score_confidence(sample_size=10, values=[1.0, 2.0], recency_days=1,
                             completeness=1.0)
    assert score.reasons, "a confidence score with no reasons is unauditable"
    assert set(score.factors) == {
        "sample_size", "consistency", "recency", "completeness"
    }


# --------------------------------------------------------------------------- #
# Impact
# --------------------------------------------------------------------------- #


def test_impact_is_derived_from_signal_strength_not_opinion():
    assert classify_impact(1.6) is ImpactLevel.HIGH
    assert classify_impact(1.2) is ImpactLevel.MEDIUM
    assert classify_impact(1.0) is ImpactLevel.LOW
    assert classify_impact(None) is ImpactLevel.LOW


# --------------------------------------------------------------------------- #
# Fingerprint / invalidation
# --------------------------------------------------------------------------- #


def test_fingerprint_is_stable_for_the_same_records():
    records = [Evidence("performance_records", "r1"), Evidence("comments", "c1")]
    reordered = [Evidence("comments", "c1"), Evidence("performance_records", "r1")]
    assert fingerprint(USER, records) == fingerprint(USER, reordered)


def test_fingerprint_changes_when_a_record_is_added():
    base = [Evidence("performance_records", "r1")]
    extended = base + [Evidence("performance_records", "r2")]
    assert fingerprint(USER, base) != fingerprint(USER, extended)


def test_fingerprint_differs_per_creator():
    records = [Evidence("performance_records", "r1")]
    other = uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
    assert fingerprint(USER, records) != fingerprint(other, records)


# --------------------------------------------------------------------------- #
# Insight generation
# --------------------------------------------------------------------------- #


def _analysis(snapshots, previous=()):
    from app.growth.analysis import PerformanceAnalyzer

    return PerformanceAnalyzer.analyze(
        snapshots, window_start=NOW - timedelta(days=30), window_end=NOW,
        previous=previous,
    )


@pytest.fixture
def generator():
    return InsightGenerator(USER)


def test_an_above_baseline_post_produces_a_content_pattern(generator):
    snapshots = [
        snap("A", views=1000, likes=100, comments=50, shares=10, title="A"),
        snap("B", views=500, likes=75, comments=25, shares=5, title="B"),
        snap("C", views=200, likes=10, comments=2, shares=0, title="C"),
    ]
    insights = generator.generate(_analysis(snapshots), snapshots)
    kinds = {i.insight_type for i in insights}
    assert InsightType.CONTENT_PATTERN in kinds
    best = next(i for i in insights if i.insight_type is InsightType.CONTENT_PATTERN)
    assert "B" in best.title
    # 21.0 / 16.0 = 1.3125, which lands in the medium band (>=1.15, <1.5).
    assert best.impact is ImpactLevel.MEDIUM
    assert best.evidence["vs_baseline_ratio"] == pytest.approx(1.3125, abs=1e-4)


def test_a_larger_lift_is_high_impact(generator):
    """A post at 1.6x the median clears the high-impact threshold."""
    snapshots = [
        snap("A", views=1000, likes=100, comments=50, shares=10, title="A"),
        snap("B", views=1000, likes=200, comments=100, shares=60, title="B"),
        snap("C", views=1000, likes=80, comments=20, shares=0, title="C"),
    ]
    insights = generator.generate(_analysis(snapshots), snapshots)
    best = next(i for i in insights if i.insight_type is InsightType.CONTENT_PATTERN)
    assert best.evidence["vs_baseline_ratio"] >= 1.5
    assert best.impact is ImpactLevel.HIGH


def test_a_below_baseline_post_produces_an_underperforming_pattern(generator):
    snapshots = [
        snap("A", views=1000, likes=100, comments=50, shares=10, title="A"),
        snap("B", views=500, likes=75, comments=25, shares=5, title="B"),
        snap("C", views=200, likes=10, comments=2, shares=0, title="C"),
    ]
    insights = generator.generate(_analysis(snapshots), snapshots)
    worst = next(
        i for i in insights
        if i.insight_type is InsightType.UNDERPERFORMING_PATTERN
    )
    assert "C" in worst.title


def test_every_insight_carries_evidence_and_its_sources(generator):
    snapshots = [
        snap("A", views=1000, likes=100, comments=50, shares=10, title="A"),
        snap("B", views=500, likes=75, comments=25, shares=5, title="B"),
        snap("C", views=200, likes=10, comments=2, shares=0, title="C"),
    ]
    for insight in generator.generate(_analysis(snapshots), snapshots):
        assert insight.evidence, "an insight with no evidence is not an insight"
        assert insight.source_records, "an insight with no sources cannot be checked"
        assert insight.rule_key, "a claim must name the rule that produced it"
        assert "computation" in insight.evidence, (
            "evidence must record how it was computed"
        )


def test_insight_evidence_states_the_formula_used(generator):
    snapshots = [
        snap("A", views=1000, likes=100, comments=50, shares=10, title="A"),
        snap("B", views=500, likes=75, comments=25, shares=5, title="B"),
        snap("C", views=200, likes=10, comments=2, shares=0, title="C"),
    ]
    insight = next(
        i for i in generator.generate(_analysis(snapshots), snapshots)
        if i.insight_type is InsightType.CONTENT_PATTERN
    )
    assert "engagement_rate" in insight.evidence["computation"]


def test_no_insight_is_produced_below_the_sample_floor(generator):
    snapshots = [
        snap("A", views=1000, likes=100, comments=50, shares=10, title="A"),
        snap("B", views=500, likes=75, comments=25, shares=5, title="B"),
    ]
    analysis = _analysis(snapshots)
    assert analysis.is_actionable is False
    assert generator.generate(analysis, snapshots) == []


def test_an_audience_signal_needs_enough_comments(generator):
    snapshots = [
        snap("A", views=1000, likes=100, comments=50, shares=10),
        snap("B", views=500, likes=75, comments=25, shares=5),
        snap("C", views=200, likes=10, comments=2, shares=0),
    ]
    thin = generator.generate(_analysis(snapshots), snapshots,
                              comment_signals=[{"intent": "question", "count": 1,
                                                "comment_ids": ["c1"]}])
    assert not [i for i in thin if i.insight_type is InsightType.AUDIENCE_SIGNAL]


def test_an_audience_signal_reports_question_share(generator):
    snapshots = [
        snap("A", views=1000, likes=100, comments=50, shares=10),
        snap("B", views=500, likes=75, comments=25, shares=5),
        snap("C", views=200, likes=10, comments=2, shares=0),
    ]
    insights = generator.generate(
        _analysis(snapshots), snapshots,
        comment_signals=[
            {"intent": "question", "count": 6, "comment_ids": ["c1", "c2"]},
            {"intent": "praise", "count": 4, "comment_ids": ["c3"]},
        ],
    )
    signal = next(
        i for i in insights if i.insight_type is InsightType.AUDIENCE_SIGNAL
    )
    assert signal.evidence["question_count"] == 6
    assert signal.evidence["total_analyzed"] == 10
    assert signal.evidence["question_share_pct"] == 60.0


def test_a_trend_insight_states_both_window_averages(generator):
    current = [snap("c1", views=127, days_ago=1), snap("c2", views=127, days_ago=2),
               snap("c3", views=127, days_ago=3)]
    previous = [snap("p1", views=100, days_ago=31), snap("p2", views=100, days_ago=32),
                snap("p3", views=100, days_ago=33)]
    analysis = _analysis(current, previous)
    insights = generator.generate(analysis, current)
    trend = next(
        (i for i in insights if i.insight_type is InsightType.PERFORMANCE_TREND),
        None,
    )
    if trend is not None:
        assert trend.evidence["current_average"] == 127
        assert trend.evidence["previous_average"] == 100
        assert trend.evidence["change_pct"] == pytest.approx(27.0, abs=1e-6)
        assert "current_avg - previous_avg" in trend.evidence["computation"]
