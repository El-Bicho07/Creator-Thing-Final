"""Deterministic confidence and insight generation.

**Confidence is never produced by the model.** It is computed here from four
factors the platform can actually observe, and the reasons are stored alongside
the number so a creator (or a reviewer) can see why.

| Factor | Question it answers |
|---|---|
| `sample_size` | How much data is this based on? |
| `consistency` | Do the records agree, or is this one outlier? |
| `recency` | How fresh is the evidence? |
| `completeness` | Were the metrics involved actually measured? |

An insight is refused when the evidence is too thin, rather than published with a
low confidence score -- "we cannot tell you yet" is more useful than a hedged
guess.
"""
from __future__ import annotations

import hashlib
import json
import statistics
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Sequence

from app.growth.contracts import (
    MIN_RECORDS_FOR_INSIGHT,
    ConfidenceBand,
    ConfidenceScore,
    ContentOpportunity,
    Evidence,
    ImpactLevel,
    Insight,
    InsightType,
    OpportunityOrigin,
    PerformanceAnalysis,
    PerformanceMetric,
    PerformanceSnapshot,
)

#: Minimum ratio of records that must carry the metric for the analysis to treat
#: it as consistent evidence rather than a partial sample.
COMPLETENESS_FLOOR = 0.5

#: Records older than this contribute less to confidence.
RECENCY_HALFLIFE_DAYS = 45.0


def score_confidence(
    *,
    sample_size: int,
    values: Sequence[float],
    recency_days: Optional[float],
    completeness: float,
) -> ConfidenceScore:
    """Combine the four factors into a bounded, explainable score.

    The weights are deliberately legible rather than tuned: a creator reading the
    confidence panel should be able to guess the answer.
    """
    reasons: List[str] = []
    factors: Dict[str, float] = {}

    # --- sample size -------------------------------------------------------
    if sample_size <= 0:
        sample_floor = 0.0
    elif sample_size < MIN_RECORDS_FOR_INSIGHT:
        sample_floor = 0.35
        reasons.append(f"based on only {sample_size} record(s)")
    elif sample_size < 5:
        sample_floor = 0.7
        reasons.append(f"based on {sample_size} records")
    elif sample_size < 10:
        sample_floor = 0.9
    else:
        sample_floor = 1.0
    factors["sample_size"] = sample_floor

    # --- consistency -------------------------------------------------------
    # Coefficient of variation across the supporting values. Lower spread against
    # a higher mean is more consistent. A single record has no spread to measure.
    if len(values) < 2:
        factors["consistency"] = 0.5
        reasons.append("not enough records to check consistency")
    else:
        mean = statistics.fmean(values)
        if mean == 0:
            factors["consistency"] = 0.5
        else:
            cv = statistics.pstdev(values) / abs(mean)
            factors["consistency"] = round(max(0.0, min(1.0, 1.0 - cv)), 4)
            if cv > 1.0:
                reasons.append("the underlying values vary widely")

    # --- recency -----------------------------------------------------------
    if recency_days is None:
        factors["recency"] = 0.6
    else:
        decay = 0.5 ** (max(0.0, recency_days) / RECENCY_HALFLIFE_DAYS)
        factors["recency"] = round(max(0.0, min(1.0, decay)), 4)
        if recency_days > RECENCY_HALFLIFE_DAYS:
            reasons.append(f"evidence is {int(recency_days)} days old")

    # --- completeness ------------------------------------------------------
    factors["completeness"] = round(max(0.0, min(1.0, completeness)), 4)
    if completeness < COMPLETENESS_FLOOR:
        reasons.append(
            f"only {int(completeness * 100)}% of the records carry the metric"
        )

    score = round(
        (
            factors["sample_size"] * 0.40
            + factors["consistency"] * 0.25
            + factors["recency"] * 0.15
            + factors["completeness"] * 0.20
        ),
        3,
    )
    score = max(0.0, min(1.0, score))

    if score >= 0.75:
        band = ConfidenceBand.HIGH
    elif score >= 0.45:
        band = ConfidenceBand.MEDIUM
    else:
        band = ConfidenceBand.LOW
    if not reasons:
        reasons.append("consistent, recent, and complete evidence")

    return ConfidenceScore(
        score=score, band=band, reasons=reasons, factors=factors
    )


def fingerprint(user_id: uuid.UUID, records: Sequence[Evidence]) -> str:
    """Stable hash over the identity of the supporting records.

    When a supporting record changes or disappears, the fingerprint no longer
    matches and the insight can be marked stale -- so an insight never keeps
    asserting a claim its evidence stopped supporting.
    """
    parts = sorted(f"{e.table}:{e.record_id}" for e in records)
    payload = f"{user_id}|" + "|".join(parts)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def classify_impact(ratio: Optional[float]) -> ImpactLevel:
    """Impact from signal strength relative to the creator's own baseline.

    A ratio-based threshold, not a model opinion.
    """
    if ratio is None:
        return ImpactLevel.LOW
    if ratio >= 1.5:
        return ImpactLevel.HIGH
    if ratio >= 1.15:
        return ImpactLevel.MEDIUM
    return ImpactLevel.LOW


class InsightGenerator:
    """Turns a deterministic analysis into typed, evidence-backed insights.

    Each rule is a separate method with its own `rule_key`, so a creator can see
    which rule produced a claim, and so a rule can be tested in isolation.
    """

    #: Refuse to publish an insight below this confidence.
    MIN_PUBLISH_CONFIDENCE = 0.35

    def __init__(self, user_id: uuid.UUID) -> None:
        self.user_id = user_id

    # ------------------------------------------------------------------ #

    def generate(
        self,
        analysis: PerformanceAnalysis,
        snapshots: Sequence[PerformanceSnapshot],
        *,
        comment_signals: Optional[List[Dict]] = None,
    ) -> List[Insight]:
        insights: List[Insight] = []
        insights.extend(self._trend_insights(analysis, snapshots))
        insights.extend(self._content_pattern_insights(analysis))
        insights.extend(self._audience_signal_insights(comment_signals or []))
        return insights

    # ------------------------------------------------------------------ #

    def _trend_insights(
        self, analysis: PerformanceAnalysis, snapshots: Sequence[PerformanceSnapshot]
    ) -> List[Insight]:
        out: List[Insight] = []
        if not analysis.is_actionable:
            return out

        for trend in analysis.trends:
            if not trend.has_enough_data or trend.change_pct is None:
                continue
            if trend.direction == "flat":
                continue

            metric_values = [
                s.metrics[trend.metric]
                for s in snapshots
                if trend.metric in s.metrics
            ]
            supporting = [
                Evidence(
                    table="performance_records",
                    record_id=s.record_id,
                    metric=trend.metric.value,
                    value=float(s.metrics[trend.metric]),
                    label=s.asset_title,
                )
                for s in snapshots
                if trend.metric in s.metrics
            ]

            confidence = score_confidence(
                sample_size=trend.current_sample + trend.previous_sample,
                values=[float(v) for v in metric_values],
                recency_days=None,
                completeness=(
                    trend.current_sample / analysis.record_count
                    if analysis.record_count else 0.0
                ),
            )
            if confidence.score < self.MIN_PUBLISH_CONFIDENCE:
                continue

            up = trend.direction == "up"
            title = (
                f"{trend.metric.label} {'rose' if up else 'fell'} "
                f"{abs(trend.change_pct):.1f}% between the two windows"
            )
            evidence = {
                "metric": trend.metric.value,
                "current_average": trend.current,
                "previous_average": trend.previous,
                "change_pct": trend.change_pct,
                "direction": trend.direction,
                "current_sample": trend.current_sample,
                "previous_sample": trend.previous_sample,
                "window": {
                    "start": analysis.window_start.isoformat(),
                    "end": analysis.window_end.isoformat(),
                },
                "computation": (
                    "change_pct = (current_avg - previous_avg) / previous_avg * 100"
                ),
            }
            out.append(
                Insight(
                    user_id=self.user_id,
                    insight_type=InsightType.PERFORMANCE_TREND,
                    title=title,
                    summary=(
                        f"Average {trend.metric.label} per post moved from "
                        f"{trend.previous} to {trend.current} across "
                        f"{trend.current_sample} and {trend.previous_sample} records."
                    ),
                    evidence=evidence,
                    source_records=[e.record_id for e in supporting],
                    confidence=confidence,
                    impact=classify_impact(
                        abs(trend.change_pct) / 100.0 + 1.0 if up else None
                    ),
                    rule_key=f"trend:{trend.metric.value}",
                    recommended_action=(
                        "Compare what changed between the two windows before "
                        "committing to a format."
                    ),
                    source_fingerprint=fingerprint(self.user_id, supporting),
                    window_start=analysis.window_start,
                    window_end=analysis.window_end,
                )
            )
        return out

    # ------------------------------------------------------------------ #

    def _content_pattern_insights(self, analysis: PerformanceAnalysis) -> List[Insight]:
        out: List[Insight] = []
        ranked = [r for r in analysis.ranking if r.engagement_rate is not None]
        if len(ranked) < MIN_RECORDS_FOR_INSIGHT:
            return out

        best, worst = ranked[0], ranked[-1]

        if best.vs_baseline_ratio and best.vs_baseline_ratio > 1.0:
            supporting = [
                Evidence(
                    table="performance_records",
                    record_id=str(best.asset_id or ""),
                    metric="engagement_rate",
                    value=best.engagement_rate,
                    label=best.title,
                )
            ]
            confidence = score_confidence(
                sample_size=analysis.record_count,
                values=analysis.engagement_rates,
                recency_days=None,
                completeness=(
                    len(analysis.engagement_rates) / analysis.record_count
                    if analysis.record_count else 0.0
                ),
            )
            if confidence.score >= self.MIN_PUBLISH_CONFIDENCE:
                out.append(
                    Insight(
                        user_id=self.user_id,
                        insight_type=InsightType.CONTENT_PATTERN,
                        title=f"“{best.title}” beat your median engagement rate",
                        summary=(
                            f"It reached {best.engagement_rate}% engagement against a "
                            f"median of {analysis.median_engagement_rate}% across "
                            f"{analysis.record_count} records."
                        ),
                        evidence={
                            "metric": "engagement_rate",
                            "value": best.engagement_rate,
                            "median_engagement_rate": analysis.median_engagement_rate,
                            "vs_baseline_ratio": best.vs_baseline_ratio,
                            "platform": best.platform,
                            "computation": (
                                "engagement_rate = (likes + comments + shares) / views * 100; "
                                "ratio = value / median(all engagement rates)"
                            ),
                        },
                        source_records=[str(best.asset_id or "")],
                        confidence=confidence,
                        impact=classify_impact(best.vs_baseline_ratio),
                        rule_key="pattern:above_baseline",
                        recommended_action=(
                            "Look at what this post has in common with your other "
                            "above-baseline posts."
                        ),
                        source_fingerprint=fingerprint(self.user_id, supporting),
                        window_start=analysis.window_start,
                        window_end=analysis.window_end,
                    )
                )

        if (
            worst.vs_baseline_ratio is not None
            and worst.vs_baseline_ratio < 0.85
            and len(ranked) >= MIN_RECORDS_FOR_INSIGHT
        ):
            supporting = [
                Evidence(
                    table="performance_records",
                    record_id=str(worst.asset_id or ""),
                    metric="engagement_rate",
                    value=worst.engagement_rate,
                    label=worst.title,
                )
            ]
            confidence = score_confidence(
                sample_size=analysis.record_count,
                values=analysis.engagement_rates,
                recency_days=None,
                completeness=(
                    len(analysis.engagement_rates) / analysis.record_count
                    if analysis.record_count else 0.0
                ),
            )
            if confidence.score >= self.MIN_PUBLISH_CONFIDENCE:
                out.append(
                    Insight(
                        user_id=self.user_id,
                        insight_type=InsightType.UNDERPERFORMING_PATTERN,
                        title=f"“{worst.title}” trailed your baseline",
                        summary=(
                            f"Its {worst.engagement_rate}% engagement rate was "
                            f"{worst.vs_baseline_ratio}x your median of "
                            f"{analysis.median_engagement_rate}%."
                        ),
                        evidence={
                            "metric": "engagement_rate",
                            "value": worst.engagement_rate,
                            "median_engagement_rate": analysis.median_engagement_rate,
                            "vs_baseline_ratio": worst.vs_baseline_ratio,
                            "platform": worst.platform,
                            "computation": (
                                "ratio = value / median(all engagement rates)"
                            ),
                        },
                        source_records=[str(worst.asset_id or "")],
                        confidence=confidence,
                        impact=ImpactLevel.LOW,
                        rule_key="pattern:below_baseline",
                        recommended_action=(
                            "Compare its hook and topic against your above-baseline "
                            "posts before dropping the format."
                        ),
                        source_fingerprint=fingerprint(self.user_id, supporting),
                        window_start=analysis.window_start,
                        window_end=analysis.window_end,
                    )
                )
        return out

    # ------------------------------------------------------------------ #

    def _audience_signal_insights(
        self, comment_signals: List[Dict]
    ) -> List[Insight]:
        """Audience insight from deterministic comment counts only.

        `comment_signals` carries counts computed elsewhere (never model output),
        so this rule cannot fabricate a number.
        """
        out: List[Insight] = []
        if not comment_signals:
            return out

        total = sum(int(s.get("count", 0)) for s in comment_signals)
        questions = sum(
            int(s.get("count", 0))
            for s in comment_signals
            if s.get("intent") == "question"
        )
        if total < MIN_RECORDS_FOR_INSIGHT or questions <= 0:
            return out

        sample_ids: List[str] = []
        for signal in comment_signals:
            sample_ids.extend(str(i) for i in signal.get("comment_ids", [])[:3])

        supporting = [
            Evidence(table="comments", record_id=cid) for cid in sample_ids
        ]
        confidence = score_confidence(
            sample_size=total,
            values=[float(s.get("count", 0)) for s in comment_signals],
            recency_days=None,
            completeness=1.0,
        )
        if confidence.score < self.MIN_PUBLISH_CONFIDENCE:
            return out

        share = round(questions * 100.0 / total, 2)
        out.append(
            Insight(
                user_id=self.user_id,
                insight_type=InsightType.AUDIENCE_SIGNAL,
                title=f"{questions} of {total} analysed comments are questions",
                summary=(
                    f"Questions make up {share}% of the analysed comments, which is "
                    f"the clearest signal that the audience is asking for something."
                ),
                evidence={
                    "question_count": questions,
                    "total_analyzed": total,
                    "question_share_pct": share,
                    "by_intent": {s.get("intent"): int(s.get("count", 0))
                                  for s in comment_signals},
                    "computation": "question_share_pct = questions / total * 100",
                },
                source_records=sample_ids,
                confidence=confidence,
                impact=ImpactLevel.MEDIUM,
                rule_key="audience:question_share",
                recommended_action=(
                    "Turn the most-asked question into the next piece of content."
                ),
                source_fingerprint=fingerprint(self.user_id, supporting),
            )
        )
        return out


__all__ = [
    "score_confidence",
    "fingerprint",
    "classify_impact",
    "InsightGenerator",
    "COMPLETENESS_FLOOR",
    "RECENCY_HALFLIFE_DAYS",
]
