"""Deterministic analytics correctness.

Every arithmetic assertion in this file is checked against a hand-computed
fixture. None of it depends on a model, because the whole point of the boundary is
that the backend owns the numbers.

The canonical fixture is the one named in the task:

    Content A: 1000 views, 100 likes, 50 comments   (+ 10 shares)
    Content B:  500 views,  75 likes, 25 comments   (+  5 shares)

    A: (100 + 50 + 10) / 1000 * 100 = 16.00%
    B: ( 75 + 25 +  5) /  500 * 100 = 21.00%
"""
from __future__ import annotations

import statistics
from datetime import datetime, timedelta, timezone

import pytest

from app.growth.analysis import PerformanceAnalyzer, split_window
from app.growth.contracts import (
    MIN_RECORDS_FOR_INSIGHT,
    PerformanceMetric,
)

NOW = datetime(2026, 6, 15, 12, 0, tzinfo=timezone.utc)


def snapshot(
    *,
    record_id: str = "r1",
    views=None,
    likes=None,
    comments=None,
    shares=None,
    title: str = "Post",
    days_ago: float = 1.0,
    platform: str = "reel",
    measured=None,
):
    """A snapshot built the way the repository builds one.

    Passing `measured` reproduces the `metrics_measured` column: a metric left out
    is treated as unmeasured rather than zero.
    """
    raw = {"views": views, "likes": likes,
           "comments_count": comments, "shares": shares}
    metrics = {}
    unavailable = []
    for metric in PerformanceMetric:
        value = raw[metric.value]
        if value is None or (measured is not None and metric.value not in measured):
            unavailable.append(metric)
            continue
        metrics[metric] = int(value)

    from app.growth.contracts import PerformanceSnapshot

    return PerformanceSnapshot(
        record_id=record_id,
        asset_id=f"asset-{record_id}",
        asset_title=title,
        platform=platform,
        published_at=None,
        recorded_at=NOW - timedelta(days=days_ago),
        metrics=metrics,
        unavailable=unavailable,
    )


A = snapshot(record_id="A", views=1000, likes=100, comments=50, shares=10, title="A")
B = snapshot(record_id="B", views=500, likes=75, comments=25, shares=5, title="B")
C = snapshot(record_id="C", views=200, likes=10, comments=2, shares=0, title="C")


# --------------------------------------------------------------------------- #
# Engagement arithmetic
# --------------------------------------------------------------------------- #


def test_engagement_excludes_views():
    """Views are reach. Counting them would make wide posts look engaging."""
    assert PerformanceAnalyzer.engagement_total(A) == 160
    assert PerformanceAnalyzer.engagement_total(B) == 105


def test_engagement_rate_is_hand_computed():
    assert PerformanceAnalyzer.engagement_rate(A) == 16.0
    assert PerformanceAnalyzer.engagement_rate(B) == 21.0
    assert PerformanceAnalyzer.engagement_rate(C) == 6.0


def test_engagement_rate_is_none_without_views():
    """A rate against an unmeasured denominator is the easiest fabrication here."""
    s = snapshot(views=None, likes=100, comments=50, shares=10)
    assert PerformanceAnalyzer.engagement_rate(s) is None


def test_engagement_rate_is_none_when_views_is_zero():
    assert PerformanceAnalyzer.engagement_rate(snapshot(views=0, likes=5)) is None


# --------------------------------------------------------------------------- #
# Aggregation
# --------------------------------------------------------------------------- #


def test_summary_statistics_match_hand_computation():
    summary = PerformanceAnalyzer.summarize(PerformanceMetric.VIEWS, [A, B, C])
    assert summary is not None
    assert summary.total == 1700
    assert summary.average == pytest.approx(566.6667, abs=1e-3)
    assert summary.median == 500
    assert summary.minimum == 200
    assert summary.maximum == 1000
    assert summary.sample_size == 3


def test_summary_is_none_when_the_metric_was_never_measured():
    snapshots = [snapshot(views=10, measured=["views"])]
    assert PerformanceAnalyzer.summarize(PerformanceMetric.LIKES, snapshots) is None


def test_summary_ignores_records_missing_the_metric():
    """A record with no views must not be counted as a record with zero views."""
    mixed = [
        A,
        snapshot(record_id="D", views=None, likes=5, measured=["likes"]),
    ]
    summary = PerformanceAnalyzer.summarize(PerformanceMetric.VIEWS, mixed)
    assert summary.sample_size == 1
    assert summary.total == 1000, "the unmeasured record must not add a zero"
    assert summary.minimum == 1000


# --------------------------------------------------------------------------- #
# Trend
# --------------------------------------------------------------------------- #


def test_trend_percentage_change_is_hand_computed():
    current = [snapshot(record_id="c1", views=127, days_ago=1),
               snapshot(record_id="c2", views=127, days_ago=2)]
    previous = [snapshot(record_id="p1", views=100, days_ago=31),
                snapshot(record_id="p2", views=100, days_ago=32)]
    trend = PerformanceAnalyzer.compare_windows(
        PerformanceMetric.VIEWS, current, previous
    )
    assert trend.change_pct == pytest.approx(27.0, abs=1e-6)
    assert trend.direction == "up"
    assert trend.has_enough_data is True


def test_no_percentage_change_without_a_previous_window():
    """Two posts and no baseline is not infinite growth."""
    trend = PerformanceAnalyzer.compare_windows(
        PerformanceMetric.VIEWS, [A, B], []
    )
    assert trend.change_pct is None
    assert trend.direction == "unknown"
    assert trend.has_enough_data is False


def test_percentage_change_is_undefined_against_a_zero_baseline():
    trend = PerformanceAnalyzer.compare_windows(
        PerformanceMetric.VIEWS,
        [snapshot(record_id="c", views=50), snapshot(record_id="c2", views=60)],
        [snapshot(record_id="p", views=0), snapshot(record_id="p2", views=0)],
    )
    assert trend.change_pct is None
    assert trend.direction == "up", "a rise from zero is real, just not a percentage"


def test_a_tiny_change_is_reported_flat():
    current = [snapshot(record_id="c", views=101), snapshot(record_id="c2", views=101)]
    previous = [snapshot(record_id="p", views=100), snapshot(record_id="p2", views=100)]
    trend = PerformanceAnalyzer.compare_windows(
        PerformanceMetric.VIEWS, current, previous
    )
    assert trend.change_pct == pytest.approx(1.0, abs=1e-6)
    assert trend.direction == "flat", "a 1% move is noise, not a trend"


def test_a_large_drop_is_reported_down():
    current = [snapshot(record_id="c", views=50), snapshot(record_id="c2", views=50)]
    previous = [snapshot(record_id="p", views=100), snapshot(record_id="p2", views=100)]
    trend = PerformanceAnalyzer.compare_windows(
        PerformanceMetric.VIEWS, current, previous
    )
    assert trend.direction == "down"
    assert trend.change_pct == pytest.approx(-50.0, abs=1e-6)


# --------------------------------------------------------------------------- #
# Ranking
# --------------------------------------------------------------------------- #


def test_ranking_orders_by_engagement_rate():
    ranked = PerformanceAnalyzer.rank_content([A, B, C])
    assert [r.title for r in ranked] == ["B", "A", "C"]
    assert [r.rank for r in ranked] == [1, 2, 3]


def test_ranking_ratio_is_against_the_creators_own_median():
    ranked = {r.title: r for r in PerformanceAnalyzer.rank_content([A, B, C])}
    # median of [21.0, 16.0, 6.0] is 16.0
    assert ranked["B"].vs_baseline_ratio == pytest.approx(21.0 / 16.0, abs=1e-4)
    assert ranked["A"].vs_baseline_ratio == pytest.approx(1.0, abs=1e-6)
    assert ranked["C"].vs_baseline_ratio == pytest.approx(6.0 / 16.0, abs=1e-4)


def test_a_post_with_no_measurable_rate_is_unranked_not_ranked_last():
    unranked = snapshot(record_id="D", views=None, likes=10, measured=["likes"])
    ranked = PerformanceAnalyzer.rank_content([A, B, unranked])
    tail = ranked[-1]
    assert tail.engagement_rate is None
    assert tail.rank == 0, "no engagement rate means no position in the ranking"


# --------------------------------------------------------------------------- #
# Analysis
# --------------------------------------------------------------------------- #


def _analyze(snapshots, previous=()):
    return PerformanceAnalyzer.analyze(
        snapshots, window_start=NOW - timedelta(days=30), window_end=NOW,
        previous=previous,
    )


def test_analysis_reports_data_gaps_below_the_sample_floor():
    analysis = _analyze([A, B])
    assert analysis.is_actionable is False
    assert any("only 2 performance record" in gap for gap in analysis.data_gaps)


def test_analysis_is_actionable_at_the_sample_floor():
    assert _analyze([A, B, C]).is_actionable is True


def test_availability_is_computed_across_the_whole_window():
    """One record carrying a metric makes it available for the window."""
    analysis = _analyze([snapshot(views=100, measured=["views"]), A, B])
    assert PerformanceMetric.LIKES in analysis.available_metrics, (
        "A and B both measured likes, so likes are available in this window"
    )
    assert analysis.unavailable_metrics == []


def test_analysis_reports_a_metric_nobody_measured():
    """When no record carries it, the metric is unavailable and says so."""
    views_only = [
        snapshot(record_id=f"v{i}", views=100, measured=["views"]) for i in range(3)
    ]
    analysis = _analyze(views_only)
    assert PerformanceMetric.VIEWS in analysis.available_metrics
    assert PerformanceMetric.LIKES in analysis.unavailable_metrics
    assert "not measured" in " ".join(analysis.data_gaps)


def test_a_partially_measured_record_yields_no_engagement_rate():
    """Regression: unmeasured likes must not read as zero likes.

    A 0% rate would assert that nobody engaged, rank the post worst, and drag the
    creator's median down.
    """
    partial = snapshot(views=100, measured=["views"])
    assert PerformanceAnalyzer.engagement_rate(partial) is None
    assert PerformanceAnalyzer.engagement_total(partial) == 0

    analysis = _analyze([partial, A, B, C])
    assert 0.0 not in analysis.engagement_rates, (
        "a fabricated 0% rate contaminated the engagement distribution"
    )
    assert analysis.median_engagement_rate == pytest.approx(16.0, abs=1e-6)


def test_analysis_always_lists_metrics_the_platform_lacks():
    analysis = _analyze([A, B, C])
    assert "watch_time" in analysis.unsupported_metrics
    assert "retention" in analysis.unsupported_metrics
    assert "reach" in analysis.unsupported_metrics


def test_analysis_notes_when_no_comparison_window_exists():
    analysis = _analyze([A, B, C])
    assert any("no earlier window" in gap for gap in analysis.data_gaps)


# --------------------------------------------------------------------------- #
# Window splitting
# --------------------------------------------------------------------------- #


def test_windows_do_not_double_count_a_boundary_record():
    on_start = snapshot(record_id="boundary", views=10, days_ago=30)
    current, previous, start, end = split_window(
        [on_start, A], now=NOW, days=30
    )
    assert start == NOW - timedelta(days=30)
    assert any(s.record_id == "boundary" for s in current)
    assert all(s.record_id != "boundary" for s in previous)


def test_records_outside_both_windows_are_dropped():
    old = snapshot(record_id="ancient", views=1, days_ago=200)
    current, previous, _, _ = split_window([old], now=NOW, days=30)
    assert current == []
    assert previous == []


def test_previous_window_is_the_same_length_as_the_current_one():
    prior = snapshot(record_id="p", views=1, days_ago=45)
    _, previous, _, _ = split_window([prior], now=NOW, days=30)
    assert len(previous) == 1, "a record 45 days back belongs to the prior 30-day window"


# --------------------------------------------------------------------------- #
# The number allow-list the Copilot gate depends on
# --------------------------------------------------------------------------- #


def test_analysis_numbers_contains_the_values_the_gate_allows():
    analysis = _analyze([A, B, C])
    numbers = analysis.numbers()
    assert "16" in numbers, "median engagement rate must be speakable"
    assert "21" in numbers
    assert "6" in numbers


def test_analysis_numbers_excludes_values_that_were_never_computed():
    analysis = _analyze([A, B, C])
    assert "999999" not in analysis.numbers()
