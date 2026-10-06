"""Deterministic performance analysis.

This module is the reason the Analytics Copilot can be trusted. Every number that
reaches a creator is computed here, in Python, and is reproducible from the
records it cites.

The hard rule: **the LLM never does arithmetic here.** It receives a
`PerformanceAnalysis` and may only explain it.

Three behaviours are deliberate and load-bearing:

1. **A metric that was never measured is absent, not zero.** `performance_records`
   defaults every numeric column to 0, which conflates "measured zero" with
   "unknown". `metrics_measured` makes availability explicit; an unmeasured metric
   is dropped from `available_metrics` and reported as unavailable.

2. **No percentage change from an empty baseline.** Two posts in the window and
   none before it is not "infinite growth". `change_pct` is `None` and `direction`
   is `unknown`.

3. **Below the sample floor, the analysis says so** rather than producing a
   confident trend from noise.
"""
from __future__ import annotations

import statistics
from datetime import datetime, timedelta, timezone
from typing import Dict, Iterable, List, Optional, Sequence

from app.growth.contracts import (
    ENGAGEMENT_METRICS,
    MIN_RECORDS_FOR_INSIGHT,
    MIN_RECORDS_FOR_TREND,
    UNSUPPORTED_METRICS,
    ContentRanking,
    MetricSummary,
    PerformanceAnalysis,
    PerformanceMetric,
    PerformanceSnapshot,
    TrendResult,
)

#: Tolerance, in ratio points, below which a change is reported as flat rather
#: than as noise-amplified growth. 27% from 12 views is not a 27% improvement.
FLAT_CHANGE_RATIO = 0.02


def _aware(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


class PerformanceAnalyzer:
    """Aggregates snapshots into a `PerformanceAnalysis`. Pure and testable."""

    # ------------------------------------------------------------------ #
    # Snapshots
    # ------------------------------------------------------------------ #

    @staticmethod
    def snapshot_from_row(row) -> PerformanceSnapshot:
        """Normalize one `performance_records` row.

        `metrics_measured` decides availability. NULL means every supplied metric
        was measured, which is the correct reading of rows written before Phase 5.
        """
        measured = row.get("metrics_measured") if hasattr(row, "get") else None
        raw: Dict[str, Optional[int]] = {
            "views": row.get("views"),
            "likes": row.get("likes"),
            "comments_count": row.get("comments_count"),
            "shares": row.get("shares"),
        }

        metrics: Dict[PerformanceMetric, int] = {}
        unavailable: List[PerformanceMetric] = []
        for metric in PerformanceMetric:
            value = raw.get(metric.value)
            if value is None:
                unavailable.append(metric)
                continue
            if measured is not None and metric.value not in measured:
                unavailable.append(metric)
                continue
            metrics[metric] = int(value)

        return PerformanceSnapshot(
            record_id=str(row["id"]),
            asset_id=str(row["asset_id"]) if row.get("asset_id") else None,
            asset_title=row.get("asset_title"),
            platform=row.get("platform") or "unknown",
            published_at=row.get("published_at"),
            recorded_at=_aware(row["recorded_at"]),
            metrics=metrics,
            unavailable=unavailable,
        )

    # ------------------------------------------------------------------ #
    # Aggregation
    # ------------------------------------------------------------------ #

    @staticmethod
    def engagement_total(snapshot: PerformanceSnapshot) -> int:
        """likes + comments + shares.

        Views are reach, not engagement. Including them would make a widely
        distributed post look more engaging than a deeply appreciated one.
        """
        return sum(snapshot.metrics.get(m, 0) for m in ENGAGEMENT_METRICS)

    @classmethod
    def engagement_rate(cls, snapshot: PerformanceSnapshot) -> Optional[float]:
        """Engagement as a percentage of views.

        Returns None unless **every** input was actually measured.

        The strictness matters. `performance_records` defaults each numeric column
        to 0, so a record with views=100 and unmeasured likes reads as "0 likes" and
        would produce a 0% engagement rate -- an assertion that nobody engaged,
        which was never measured. That record would then rank last and drag the
        creator's median down, corrupting every comparison built on top of it.

        So a partial record yields no rate at all, rather than a plausible wrong
        one.
        """
        views = snapshot.metrics.get(PerformanceMetric.VIEWS)
        if views is None or views <= 0:
            return None
        missing = [m for m in ENGAGEMENT_METRICS if m not in snapshot.metrics]
        if missing:
            return None
        return round(cls.engagement_total(snapshot) * 100.0 / views, 4)

    @classmethod
    def summarize(
        cls, metric: PerformanceMetric, snapshots: Sequence[PerformanceSnapshot]
    ) -> Optional[MetricSummary]:
        values = [s.metrics[metric] for s in snapshots if metric in s.metrics]
        if not values:
            return None
        return MetricSummary(
            metric=metric,
            total=sum(values),
            average=statistics.fmean(values),
            median=statistics.median(values),
            minimum=min(values),
            maximum=max(values),
            sample_size=len(values),
        )

    # ------------------------------------------------------------------ #
    # Trend
    # ------------------------------------------------------------------ #

    @staticmethod
    def compare_windows(
        metric: PerformanceMetric,
        current: Sequence[PerformanceSnapshot],
        previous: Sequence[PerformanceSnapshot],
    ) -> TrendResult:
        """Percentage change between two windows.

        Returns `change_pct=None` when the comparison cannot be made honestly:
        no previous sample, or a previous average of zero (dividing by zero is
        not an infinite growth rate, it is an undefined one).
        """
        current_values = [s.metrics[metric] for s in current if metric in s.metrics]
        previous_values = [s.metrics[metric] for s in previous if metric in s.metrics]

        current_avg = statistics.fmean(current_values) if current_values else 0.0
        previous_avg = statistics.fmean(previous_values) if previous_values else 0.0

        change_pct: Optional[float] = None
        direction = "unknown"

        if current_values and previous_values:
            if previous_avg == 0:
                direction = "up" if current_avg > 0 else "flat"
            else:
                change_pct = round((current_avg - previous_avg) * 100.0 / previous_avg, 4)
                if abs(change_pct / 100.0) < FLAT_CHANGE_RATIO:
                    direction = "flat"
                else:
                    direction = "up" if change_pct > 0 else "down"

        return TrendResult(
            metric=metric,
            current=round(current_avg, 4),
            previous=round(previous_avg, 4),
            change_pct=change_pct,
            direction=direction,
            current_sample=len(current_values),
            previous_sample=len(previous_values),
            has_enough_data=len(current_values) >= MIN_RECORDS_FOR_TREND
            and len(previous_values) >= MIN_RECORDS_FOR_TREND,
        )

    # ------------------------------------------------------------------ #
    # Ranking
    # ------------------------------------------------------------------ #

    @classmethod
    def rank_content(
        cls, snapshots: Sequence[PerformanceSnapshot]
    ) -> List[ContentRanking]:
        """Rank against the creator's OWN median, not a platform average.

        A platform-wide benchmark would be a number this platform cannot compute
        and has no right to assert.
        """
        rates = [
            rate
            for rate in (cls.engagement_rate(s) for s in snapshots)
            if rate is not None
        ]
        baseline = statistics.median(rates) if rates else None

        rows: List[ContentRanking] = []
        for snapshot in snapshots:
            rate = cls.engagement_rate(snapshot)
            ratio: Optional[float] = None
            if rate is not None and baseline not in (None, 0):
                ratio = round(rate / baseline, 4)
            rows.append(
                ContentRanking(
                    asset_id=snapshot.asset_id,
                    title=snapshot.asset_title or "Untitled",
                    platform=snapshot.platform,
                    engagement_rate=rate,
                    views=snapshot.metrics.get(PerformanceMetric.VIEWS),
                    engagement_total=cls.engagement_total(snapshot),
                    vs_baseline_ratio=ratio,
                )
            )

        # Rank only what is actually comparable: a post with no engagement rate
        # has no position in an engagement ranking.
        rows.sort(
            key=lambda r: (
                r.engagement_rate is not None,
                r.engagement_rate or 0.0,
            ),
            reverse=True,
        )
        for index, row in enumerate(rows, start=1):
            row.rank = index if row.engagement_rate is not None else 0
        return rows

    # ------------------------------------------------------------------ #
    # The analysis itself
    # ------------------------------------------------------------------ #

    @classmethod
    def analyze(
        cls,
        snapshots: Sequence[PerformanceSnapshot],
        *,
        window_start: datetime,
        window_end: datetime,
        previous: Sequence[PerformanceSnapshot] = (),
    ) -> PerformanceAnalysis:
        snapshots = list(snapshots)
        previous = list(previous)

        available: List[PerformanceMetric] = [
            metric for metric in PerformanceMetric
            if any(metric in s.metrics for s in snapshots)
        ]
        unavailable: List[PerformanceMetric] = [
            metric for metric in PerformanceMetric
            if metric not in available
        ]

        summaries = {
            metric: summary
            for metric in available
            if (summary := cls.summarize(metric, snapshots)) is not None
        }

        trends = [
            cls.compare_windows(metric, snapshots, previous)
            for metric in available
        ]

        ranking = cls.rank_content(snapshots)
        rates = [r.engagement_rate for r in ranking if r.engagement_rate is not None]

        gaps: List[str] = []
        if len(snapshots) < MIN_RECORDS_FOR_INSIGHT:
            gaps.append(
                f"only {len(snapshots)} performance record(s) in this window; "
                f"{MIN_RECORDS_FOR_INSIGHT} are needed before trends mean anything"
            )
        if not available:
            gaps.append("no measured performance metrics in this window")
        if unavailable:
            gaps.append(
                "not measured in this window: "
                + ", ".join(m.label for m in unavailable)
            )
        if not any(t.previous_sample for t in trends):
            gaps.append(
                "no earlier window to compare against, so no growth rate can be stated"
            )

        return PerformanceAnalysis(
            window_start=window_start,
            window_end=window_end,
            record_count=len(snapshots),
            available_metrics=available,
            unavailable_metrics=unavailable,
            unsupported_metrics=list(UNSUPPORTED_METRICS),
            summaries=summaries,
            trends=trends,
            ranking=ranking,
            median_engagement_rate=(
                round(statistics.median(rates), 4) if rates else None
            ),
            engagement_rates=rates,
            data_gaps=gaps,
        )


def split_window(
    snapshots: Iterable[PerformanceSnapshot], *, now: datetime, days: int
) -> tuple[List[PerformanceSnapshot], List[PerformanceSnapshot], datetime, datetime]:
    """Split snapshots into a current window and the equally-sized window before it.

    Windows are half-open on the end (`end - delta <= t < end`) so a record on the
    boundary belongs to exactly one window and cannot be double-counted.
    """
    snapshots = list(snapshots)
    end = _aware(now)
    start = end - timedelta(days=days)
    previous_start = start - timedelta(days=days)

    current = [s for s in snapshots if start <= s.recorded_at < end]
    prior = [
        s for s in snapshots if previous_start <= s.recorded_at < start
    ]
    return current, prior, start, end


__all__ = ["PerformanceAnalyzer", "split_window", "FLAT_CHANGE_RATIO"]
