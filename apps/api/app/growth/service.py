"""GrowthService: orchestration for the Learn step.

One place that knows the order of operations, so the boundary stays honest:

    raw performance
        -> normalized snapshots
        -> deterministic analysis        <- every number is born here
        -> deterministic insights        <- every confidence is born here
        -> opportunities / lessons
        -> Copilot (interpretation only)

Phase 5 owns "understand". It does not own planning (Phase 4) or creating
(Phase 3). Anything that leaves this module for a creator's day goes through the
existing Today/Producer architecture rather than a second planner.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Sequence

from app.growth.analysis import PerformanceAnalyzer, split_window
from app.growth.comments import CommentAnalyzer
from app.growth.contracts import (
    CommentCategory,
    ConfidenceResponse,
    ContentOpportunity,
    ExperimentVerdict,
    GrowthOverviewResponse,
    Insight,
    InsightType,
    MetricValue,
    PerformanceAnalysis,
    PerformanceMetric,
    RankingEntry,
    TrendResponse,
)
from app.growth.copilot import AnalyticsCopilot
from app.growth.experiments import ExperimentEvaluator, LessonGenerator
from app.growth.insights import InsightGenerator
from app.growth.opportunities import OpportunityDetector
from app.growth.persistence import GrowthRepository

DEFAULT_WINDOW_DAYS = 30


def _aware(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _now() -> datetime:
    return datetime.now(timezone.utc)


class GrowthService:
    """Everything the Growth API needs, in dependency order."""

    def __init__(self, db, user_id: uuid.UUID) -> None:
        self._db = db
        self.user_id = uuid.UUID(str(user_id))
        self.repo = GrowthRepository(db, self.user_id)
        self.analyzer = PerformanceAnalyzer()
        self.insight_generator = InsightGenerator(self.user_id)
        self.opportunity_detector = OpportunityDetector(self.user_id)
        self.evaluator = ExperimentEvaluator()
        self.lesson_generator = LessonGenerator()

    # ================================================================== #
    # Analysis
    # ================================================================== #

    async def analyze(
        self,
        *,
        window_days: int = DEFAULT_WINDOW_DAYS,
        now: Optional[datetime] = None,
    ) -> PerformanceAnalysis:
        """Build the deterministic analysis. No AI is involved."""
        snapshots = await self.repo.list_performance()
        current, previous, start, end = split_window(
            snapshots, now=now or _now(), days=window_days
        )
        return self.analyzer.analyze(
            current, window_start=start, window_end=end, previous=previous
        )

    # ================================================================== #
    # Insights
    # ================================================================== #

    async def generate_insights(
        self,
        analysis: PerformanceAnalysis,
        *,
        window_days: int = DEFAULT_WINDOW_DAYS,
        now: Optional[datetime] = None,
        persist: bool = True,
    ) -> List[Insight]:
        """Derive insights from the analysis. Confidence is computed, not asked for."""
        snapshots = await self.repo.list_performance()
        current, _, _, _ = split_window(
            snapshots, now=now or _now(), days=window_days
        )
        signals = await self._comment_signals()
        insights = self.insight_generator.generate(
            analysis, current, comment_signals=signals
        )
        if persist and insights:
            # Re-deriving a rule replaces its previous claim rather than appending a
            # duplicate, so the insight list stays a current view.
            await self.repo.supersede_insights(
                sorted({i.rule_key for i in insights})
            )
            await self.repo.save_insights(insights)
            # Attach the generated ids so opportunities can reference them.
            stored = await self.repo.list_insights(limit=len(insights))
            by_key = {
                (r["rule_key"], r["title"]): uuid.UUID(str(r["id"])) for r in stored
            }
            for insight in insights:
                insight.id = by_key.get((insight.rule_key, insight.title))
        return insights

    async def _comment_signals(self) -> List[Dict[str, Any]]:
        """Deterministic comment counts grouped by intent.

        Counts come from stored classifications, never from a model response.
        """
        rows = await self.repo.list_comments(limit=500, unanalyzed_only=False)
        grouped: Dict[str, Dict[str, Any]] = {}
        for row in rows:
            classification = row.get("classification") or {}
            intent = classification.get("intent")
            if not intent:
                continue
            bucket = grouped.setdefault(
                intent, {"intent": intent, "count": 0, "comment_ids": []}
            )
            bucket["count"] += 1
            bucket["comment_ids"].append(str(row["id"]))
        return sorted(grouped.values(), key=lambda g: -g["count"])

    # ================================================================== #
    # Comments
    # ================================================================== #

    async def analyze_comments(
        self,
        *,
        asset_id: Optional[uuid.UUID] = None,
        limit: int = 25,
        gateway=None,
        model: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Classify pending comments.

        The deterministic heuristic always runs; `degraded` reports whether the
        result came from it alone. Bulk analysis belongs in a job, so `limit` is
        capped and no full-corpus pass happens here.
        """
        rows = await self.repo.list_comments(
            asset_id=asset_id, limit=limit, unanalyzed_only=True
        )
        if not rows:
            return {
                "analyzed": 0, "skipped_duplicate": 0, "categories": {},
                "intents": {}, "questions_extracted": 0, "degraded": False,
            }

        analyzer = CommentAnalyzer(gateway=gateway, model=model)
        categories: Dict[str, int] = {}
        intents: Dict[str, int] = {}
        questions = 0
        degraded_any = False
        stored: List[Any] = []

        for row in rows:
            classification = await analyzer.analyze(
                str(row["id"]), row["comment_text"]
            )
            await self.repo.save_classification(
                classification, questions=classification.extracted_questions
            )
            stored.append(classification)
            categories[classification.category.value] = (
                categories.get(classification.category.value, 0) + 1
            )
            intents[classification.intent.value] = (
                intents.get(classification.intent.value, 0) + 1
            )
            questions += len(classification.extracted_questions)
            degraded_any = degraded_any or classification.degraded

        await self._persist_comment_insight(stored)

        return {
            "analyzed": len(stored),
            "skipped_duplicate": 0,
            "categories": categories,
            "intents": intents,
            "questions_extracted": questions,
            "degraded": degraded_any,
        }

    async def _persist_comment_insight(self, classifications) -> None:
        """Persist one aggregated insight per audience question.

        This is what makes the loop start from *audience signal* rather than only
        from numbers.
        """
        asked = [
            c for c in classifications
            if c.category is CommentCategory.QUESTION or c.intent.value in
            ("request", "pain_point", "question")
        ]
        if not asked:
            return
        questions: List[str] = []
        for c in asked:
            questions.extend(c.extracted_questions)
        if not questions:
            return

        top = questions[0]
        confidence = 0.4 + min(0.4, 0.05 * len(asked))
        await self.repo.save_comment_insight(
            category="question",
            summary=f"Audience asked: “{top}”",
            extracted_questions=questions[:10],
            actionable_idea=f"Answer directly: “{top}”",
            comment_ids=[c.comment_id for c in asked],
            confidence=round(confidence, 3),
            demand_score_value=None,
            evidence={
                "question_count": len(questions),
                "comments_analyzed": len(asked),
                "computation": (
                    "confidence = 0.4 + 0.05 per contributing comment, capped at "
                    "0.8; deterministic, not model-assigned"
                ),
            },
        )

    # ================================================================== #
    # Opportunities
    # ================================================================== #

    async def detect_opportunities(
        self, classifications: Optional[Sequence] = None
    ) -> List[ContentOpportunity]:
        """Group analysed comments into ranked opportunities."""
        if classifications is None:
            rows = await self.repo.list_comments(limit=500)
            from app.growth.comments import classify_heuristic

            classifications = []
            for row in rows:
                stored = row.get("classification") or {}
                if not stored:
                    continue
                from app.growth.contracts import CommentIntent

                try:
                    classifications.append(
                        type(
                            "_C", (), {
                                "comment_id": str(row["id"]),
                                "text": row["comment_text"],
                                "category": CommentCategory(stored.get("category")),
                                "intent": CommentIntent(stored.get("intent")),
                                "actionable": bool(stored.get("actionable")),
                                "extracted_questions": list(stored.get("questions") or []),
                                "summary": stored.get("summary"),
                                "degraded": bool(stored.get("degraded")),
                            },
                        )()
                    )
                except (ValueError, TypeError):
                    continue
        return self.opportunity_detector.detect(classifications)

    async def persist_opportunities(
        self, opportunities: Sequence[ContentOpportunity]
    ) -> List[uuid.UUID]:
        return [await self.repo.save_opportunity(o) for o in opportunities]

    # ================================================================== #
    # Copilot
    # ================================================================== #

    async def ask_copilot(
        self,
        question: str,
        *,
        window_days: int = DEFAULT_WINDOW_DAYS,
        gateway=None,
        model: Optional[str] = None,
    ) -> Any:
        """Answer a creator question from their own data.

        Memory is consulted for historical learning, but performance records remain
        the source of truth for current metrics. A remembered "tutorials worked"
        never becomes a number in the answer.
        """
        analysis = await self.analyze(window_days=window_days)

        creator_context = await self.repo.creator_context()
        lessons = await self.repo.active_lessons(limit=5)
        insights = await self.repo.list_insights(limit=5)

        memory_block = await self._memory_block(question)

        copilot = AnalyticsCopilot(gateway=gateway, model=model)
        return await copilot.ask(
            question,
            analysis,
            creator_context=creator_context,
            memory_block=memory_block,
            lessons=lessons,
            insights=insights,
        )

    async def _memory_block(self, question: str) -> str:
        """Bounded memory retrieval.

        Through the Phase 2 Memory Engine only. Growth never touches `chunks`,
        never imports an embedding library, and cannot choose a model.
        """
        try:
            from app.memory import MemoryQuery, get_memory_engine

            hits = await get_memory_engine(self._db, self.user_id).retrieve(
                MemoryQuery(query=question, top_k=4)
            )
            return "\n".join(f"- {hit.text}" for hit in hits)[:2_000]
        except Exception:
            # Memory is context, not the source of truth. Its absence must not
            # prevent an answer.
            return ""

    # ================================================================== #
    # Experiments
    # ================================================================== #

    async def evaluate_experiment(
        self,
        experiment_id: uuid.UUID,
    ) -> Dict[str, Any]:
        """Run the deterministic comparison and record the verdict."""
        experiment = await self.repo.get_experiment(experiment_id)
        if experiment is None:
            raise LookupError("experiment not found")

        metric_name = experiment.get("outcome_metric")
        if not metric_name:
            return {
                "experiment_id": str(experiment_id),
                "verdict": ExperimentVerdict.INCONCLUSIVE,
                "observed_value": None,
                "baseline_value": None,
                "change_pct": None,
                "explanation": (
                    "This experiment has no outcome metric, so it cannot be "
                    "evaluated. Set one before concluding."
                ),
                "has_enough_data": False,
            }
        try:
            metric = PerformanceMetric(metric_name)
        except ValueError:
            return {
                "experiment_id": str(experiment_id),
                "verdict": ExperimentVerdict.INCONCLUSIVE,
                "observed_value": None,
                "baseline_value": None,
                "change_pct": None,
                "explanation": (
                    f"“{metric_name}” is not a metric this platform collects, so "
                    "the experiment cannot be evaluated."
                ),
                "has_enough_data": False,
            }

        variant_id = experiment.get("variant_asset_id")
        baseline_id = experiment.get("baseline_asset_id")
        if not variant_id or not baseline_id:
            return {
                "experiment_id": str(experiment_id),
                "verdict": ExperimentVerdict.INCONCLUSIVE,
                "observed_value": None,
                "baseline_value": None,
                "change_pct": None,
                "explanation": (
                    "Both a variant and a baseline asset are required to evaluate "
                    "this experiment."
                ),
                "has_enough_data": False,
            }

        variant = await self.repo.performance_for_asset(
            uuid.UUID(str(variant_id)), metric=metric
        )
        baseline = await self.repo.performance_for_asset(
            uuid.UUID(str(baseline_id)), metric=metric
        )
        evaluation = self.evaluator.evaluate(
            metric=metric, variant=variant, baseline=baseline
        )

        lesson_id: Optional[uuid.UUID] = None
        if evaluation["verdict"] is not ExperimentVerdict.INCONCLUSIVE:
            lesson = self.lesson_generator.from_experiment(
                hypothesis=experiment["hypothesis"],
                evaluation=evaluation,
                experiment_id=experiment_id,
            )
            if lesson:
                stored = await self.repo.save_lesson(
                    insight_summary=lesson["insight_summary"],
                    actionable_rule=lesson["actionable_rule"],
                    confidence=lesson["confidence"],
                    evidence=lesson["evidence"],
                    source_records=[str(experiment_id)],
                    insight_id=None,
                    source_feature="growth_experiment",
                )
                lesson_id = stored

        await self.repo.complete_experiment(
            experiment_id,
            observed_value=evaluation["observed_value"],
            baseline_value=evaluation["baseline_value"],
            verdict=evaluation["verdict"],
            summary=evaluation["explanation"],
            lesson_id=lesson_id,
        )
        return {"experiment_id": str(experiment_id), **evaluation}

    # ================================================================== #
    # Overview
    # ================================================================== #

    async def overview(
        self, *, window_days: int = DEFAULT_WINDOW_DAYS
    ) -> GrowthOverviewResponse:
        """What changed. Numbers first, interpretation second."""
        analysis = await self.analyze(window_days=window_days)
        ranked = [r for r in analysis.ranking if r.engagement_rate is not None]

        unanalyzed = len(
            await self.repo.list_comments(limit=500, unanalyzed_only=True)
        )

        return GrowthOverviewResponse(
            window_start=analysis.window_start,
            window_end=analysis.window_end,
            record_count=analysis.record_count,
            available_metrics=[
                MetricValue(
                    metric=m.value,
                    value=(
                        analysis.summaries[m].average if m in analysis.summaries
                        else None
                    ),
                    available=True,
                    unit="count",
                )
                for m in analysis.available_metrics
            ],
            unsupported_metrics=list(analysis.unsupported_metrics),
            engagement_rate=MetricValue(
                metric="engagement_rate",
                value=analysis.median_engagement_rate,
                available=analysis.median_engagement_rate is not None,
                unit="percent",
            ),
            median_engagement_rate=analysis.median_engagement_rate,
            trends=[
                TrendResponse(
                    metric=t.metric.value,
                    current=t.current,
                    previous=t.previous,
                    change_pct=t.change_pct,
                    direction=t.direction,
                    current_sample=t.current_sample,
                    previous_sample=t.previous_sample,
                    has_enough_data=t.has_enough_data,
                )
                for t in analysis.trends
            ],
            top_performers=[
                RankingEntry(
                    asset_id=r.asset_id, title=r.title, platform=r.platform,
                    engagement_rate=r.engagement_rate, views=r.views,
                    engagement_total=r.engagement_total,
                    vs_baseline_ratio=r.vs_baseline_ratio, rank=r.rank,
                )
                for r in ranked[:5]
            ],
            underperformers=[
                RankingEntry(
                    asset_id=r.asset_id, title=r.title, platform=r.platform,
                    engagement_rate=r.engagement_rate, views=r.views,
                    engagement_total=r.engagement_total,
                    vs_baseline_ratio=r.vs_baseline_ratio, rank=r.rank,
                )
                for r in reversed(ranked[-3:]) if r.engagement_rate is not None
            ],
            insight_count=len(await self.repo.list_insights(limit=200)),
            opportunity_count=await self.repo.count_opportunities(),
            lesson_count=await self.repo.count_lessons(),
            experiment_count=await self.repo.count_experiments(),
            unanalyzed_comments=unanalyzed,
            data_gaps=analysis.data_gaps,
            has_enough_data=analysis.is_actionable,
        )


__all__ = ["GrowthService", "DEFAULT_WINDOW_DAYS"]
