"""Growth persistence.

Every statement is scoped by `user_id` and runs inside the caller's RLS session,
so `WHERE user_id = :u` here is a convenience -- PostgreSQL policy is the actual
authorization boundary. That is the Phase 2 architecture, unchanged.

No raw `chunks` SQL. Growth reads performance, comments, ideas and lessons
directly, and reaches Memory only through the Phase 2 Memory Engine APIs.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Sequence

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.growth.contracts import (
    CommentCategory,
    CommentClassification,
    CommentIntent,
    ContentOpportunity,
    ExperimentStatus,
    ExperimentVerdict,
    Insight,
    InsightType,
    OpportunityOrigin,
    PerformanceMetric,
    PerformanceSnapshot,
)


class GrowthRepository:
    """Creator-scoped reads and writes across the Growth domain."""

    def __init__(self, db: AsyncSession, user_id: uuid.UUID) -> None:
        self._db = db
        self._user_id = uuid.UUID(str(user_id))

    # ================================================================== #
    # Performance
    # ================================================================== #

    async def record_performance(
        self,
        *,
        platform: str,
        values: Dict[str, int],
        asset_id: Optional[uuid.UUID] = None,
        asset_title: Optional[str] = None,
        published_at: Optional[datetime] = None,
        metrics_measured: Optional[List[str]] = None,
    ) -> uuid.UUID:
        """Record one performance observation.

        `metrics_measured` is what separates "measured, and it was zero" from
        "never measured". Without it a default 0 is indistinguishable from a real
        zero, and a Copilot would state a fabricated metric.
        """
        measured = metrics_measured if metrics_measured is not None else list(values)
        row_id = await self._db.execute(
            text("""
                INSERT INTO performance_records
                    (user_id, asset_id, platform, views, likes, comments_count,
                     shares, published_at, metadata, metrics_measured)
                VALUES (:u, :a, :p, :v, :l, :c, :s, :pub,
                        CAST(:meta AS jsonb), CAST(:measured AS jsonb))
                RETURNING id
            """),
            {
                "u": str(self._user_id),
                "a": str(asset_id) if asset_id else None,
                "p": platform,
                "v": int(values.get(PerformanceMetric.VIEWS.value, 0)),
                "l": int(values.get(PerformanceMetric.LIKES.value, 0)),
                "c": int(values.get(PerformanceMetric.COMMENTS.value, 0)),
                "s": int(values.get(PerformanceMetric.SHARES.value, 0)),
                "pub": published_at,
                "meta": _json({"asset_title": asset_title} if asset_title else {}),
                "measured": _json(measured),
            },
        )
        # Commit explicitly. Without it the INSERT stays in the session's open
        # transaction and `rls_scoped_session` discards it on close, so the record
        # is visible for the rest of the request and silently gone afterwards.
        await self._db.commit()
        return uuid.UUID(str(row_id.scalar_one()))

    async def list_performance(
        self, *, limit: int = 500
    ) -> List[PerformanceSnapshot]:
        """All records for this creator, oldest first.

        Bounded. A creator with tens of thousands of records would need
        aggregation in SQL or a materialized rollup; that is a Phase 5
        performance concern, not a reason to load everything now.
        """
        rows = (await self._db.execute(
            text("""
                SELECT p.id, p.asset_id, p.platform, p.views, p.likes,
                       p.comments_count, p.shares, p.published_at,
                       p.recorded_at, p.metadata, p.metrics_measured,
                       COALESCE(a.title, p.metadata->>'asset_title') AS asset_title
                FROM performance_records p
                LEFT JOIN content_assets a ON a.id = p.asset_id
                WHERE p.user_id = :u
                ORDER BY p.recorded_at ASC
                LIMIT :limit
            """),
            {"u": str(self._user_id), "limit": limit},
        )).mappings().all()

        from app.growth.analysis import PerformanceAnalyzer

        return [
            PerformanceAnalyzer.snapshot_from_row({
                "id": row["id"],
                "asset_id": row["asset_id"],
                "asset_title": row["asset_title"],
                "platform": row["platform"],
                "views": row["views"],
                "likes": row["likes"],
                "comments_count": row["comments_count"],
                "shares": row["shares"],
                "published_at": row["published_at"],
                "recorded_at": row["recorded_at"],
                "metrics_measured": row["metrics_measured"],
            })
            for row in rows
        ]

    async def performance_for_asset(
        self, asset_id: uuid.UUID, *, metric: PerformanceMetric
    ) -> List[PerformanceSnapshot]:
        rows = (await self._db.execute(
            text("""
                SELECT p.id, p.asset_id, p.platform, p.views, p.likes,
                       p.comments_count, p.shares, p.published_at,
                       p.recorded_at, p.metadata, p.metrics_measured,
                       COALESCE(a.title, p.metadata->>'asset_title') AS asset_title
                FROM performance_records p
                LEFT JOIN content_assets a ON a.id = p.asset_id
                WHERE p.user_id = :u AND p.asset_id = :a
                ORDER BY p.recorded_at ASC
            """),
            {"u": str(self._user_id), "a": str(asset_id)},
        )).mappings().all()

        from app.growth.analysis import PerformanceAnalyzer

        snapshots = [
            PerformanceAnalyzer.snapshot_from_row({
                "id": row["id"],
                "asset_id": row["asset_id"],
                "asset_title": row["asset_title"],
                "platform": row["platform"],
                "views": row["views"],
                "likes": row["likes"],
                "comments_count": row["comments_count"],
                "shares": row["shares"],
                "published_at": row["published_at"],
                "recorded_at": row["recorded_at"],
                "metrics_measured": row["metrics_measured"],
            })
            for row in rows
        ]
        return [s for s in snapshots if metric in s.metrics]

    # ================================================================== #
    # Comments
    # ================================================================== #

    async def add_comment(
        self,
        *,
        text_value: str,
        asset_id: Optional[uuid.UUID] = None,
        author_hash: Optional[str] = None,
        posted_at: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Insert a comment, or return the existing one if identical.

        Duplicate detection is what stops the same comment being re-analysed --
        and re-billed to the provider -- on every request.
        """
        from app.growth.comments import content_hash

        digest = content_hash(text_value)
        existing = (await self._db.execute(
            text("""
                SELECT id FROM comments
                WHERE user_id = :u AND content_hash = :h
            """),
            {"u": str(self._user_id), "h": digest},
        )).first()
        if existing:
            return {"id": str(existing[0]), "duplicate": True}

        row = (await self._db.execute(
            text("""
                INSERT INTO comments
                    (user_id, asset_id, comment_text, author_hash, posted_at,
                     content_hash)
                VALUES (:u, :a, :t, :ah, :p, :h)
                RETURNING id
            """),
            {
                "u": str(self._user_id),
                "a": str(asset_id) if asset_id else None,
                "t": text_value,
                "ah": author_hash,
                "p": posted_at,
                "h": digest,
            },
        )).first()
        # Commit explicitly. Without it the row survives for the rest of the
        # request and is discarded when the RLS session closes, so the API would
        # return 201 with an id that no subsequent read could find.
        await self._db.commit()
        return {"id": str(row[0]), "duplicate": False}

    async def list_comments(
        self, *, asset_id: Optional[uuid.UUID] = None, limit: int = 100,
        unanalyzed_only: bool = False,
    ) -> List[Dict[str, Any]]:
        clauses = ["user_id = :u"]
        params: Dict[str, Any] = {"u": str(self._user_id), "limit": limit}
        if asset_id:
            clauses.append("asset_id = :a")
            params["a"] = str(asset_id)
        if unanalyzed_only:
            clauses.append("analyzed_at IS NULL")
        params["order"] = 1 if unanalyzed_only else 2

        rows = (await self._db.execute(
            text(f"""
                SELECT id, asset_id, comment_text, author_hash, posted_at,
                       sentiment, analyzed_at, classification
                FROM comments
                WHERE {' AND '.join(clauses)}
                ORDER BY posted_at DESC NULLS LAST, id
                LIMIT :limit
            """),
            params,
        )).mappings().all()
        return [dict(row) for row in rows]

    async def count_comments(self) -> int:
        value = (await self._db.execute(
            text("SELECT COUNT(*) FROM comments WHERE user_id = :u"),
            {"u": str(self._user_id)},
        )).scalar()
        return int(value or 0)

    async def save_classification(
        self,
        classification: CommentClassification,
        *,
        questions: Sequence[str],
    ) -> None:
        await self._db.execute(
            text("""
                UPDATE comments
                SET sentiment = :s,
                    analyzed_at = NOW(),
                    classification = CAST(:c AS jsonb)
                WHERE id = :i AND user_id = :u
            """),
            {
                "s": {
                    CommentCategory.COMPLAINT: "negative",
                    CommentCategory.QUESTION: "neutral",
                    CommentCategory.SPAM: None,
                }.get(classification.category, "positive"),
                "c": _json({
                    "category": classification.category.value,
                    "intent": classification.intent.value,
                    "actionable": classification.actionable,
                    "confidence": classification.heuristic_confidence,
                    "degraded": classification.degraded,
                    "summary": classification.summary,
                    "questions": list(questions),
                }),
                "i": classification.comment_id,
                "u": str(self._user_id),
            },
        )
        await self._db.commit()

    # ================================================================== #
    # Comment insights
    # ================================================================== #

    async def save_comment_insight(
        self,
        *,
        category: str,
        summary: str,
        extracted_questions: List[str],
        actionable_idea: Optional[str],
        comment_ids: List[str],
        confidence: Optional[float],
        demand_score_value: Optional[float],
        evidence: Dict[str, Any],
    ) -> uuid.UUID:
        row = (await self._db.execute(
            text("""
                INSERT INTO comment_insights
                    (user_id, category, summary, extracted_questions,
                     actionable_idea, comment_ids, confidence, demand_score,
                     evidence)
                VALUES (:u, :c, :s, CAST(:q AS jsonb), :a, CAST(:ids AS jsonb),
                        :conf, :ds, CAST(:e AS jsonb))
                RETURNING id
            """),
            {
                "u": str(self._user_id),
                "c": category,
                "s": summary,
                "q": _json(extracted_questions),
                "a": actionable_idea,
                "ids": _json(comment_ids),
                "conf": confidence,
                "ds": demand_score_value,
                "e": _json(evidence),
            },
        )).scalar_one()
        await self._db.commit()
        return uuid.UUID(str(row))

    async def list_comment_insights(
        self, *, limit: int = 50
    ) -> List[Dict[str, Any]]:
        rows = (await self._db.execute(
            text("""
                SELECT id, category, summary, extracted_questions,
                       actionable_idea, comment_ids, confidence, demand_score
                FROM comment_insights
                WHERE user_id = :u
                ORDER BY created_at DESC
                LIMIT :limit
            """),
            {"u": str(self._user_id), "limit": limit},
        )).mappings().all()
        return [dict(row) for row in rows]

    # ================================================================== #
    # Insights
    # ================================================================== #

    async def supersede_insights(self, rule_keys: Sequence[str]) -> int:
        """Mark previous claims from the same rules stale before re-deriving.

        Without this, pressing "generate" repeatedly appended a fresh copy of every
        rule each time, so the insight list grew without bound and the creator saw
        the same claim five times. Insights are a *current* view backed by evidence,
        not an append-only log: re-running a rule replaces its previous output.
        """
        if not rule_keys:
            return 0
        result = await self._db.execute(
            text("""
                UPDATE growth_insights
                SET is_stale = TRUE
                WHERE user_id = :u AND is_stale = FALSE
                  AND rule_key = ANY(CAST(:keys AS text[]))
            """),
            {"u": str(self._user_id), "keys": list(rule_keys)},
        )
        await self._db.commit()
        return int(result.rowcount or 0)

    async def save_insights(self, insights: Sequence[Insight]) -> List[uuid.UUID]:
        ids: List[uuid.UUID] = []
        for insight in insights:
            row = (await self._db.execute(
                text("""
                    INSERT INTO growth_insights
                        (user_id, insight_type, title, summary, evidence,
                         source_records, confidence, confidence_reasons,
                         impact, recommended_action, source_fingerprint,
                         window_start, window_end, rule_key)
                    VALUES (:u, :t, :ti, :s, CAST(:e AS jsonb),
                            CAST(:sr AS jsonb), :c, CAST(:cr AS jsonb), :im,
                            :ra, :fp, :ws, :we, :rk)
                    RETURNING id
                """),
                {
                    "u": str(insight.user_id),
                    "t": insight.insight_type.value,
                    "ti": insight.title[:255],
                    "s": insight.summary,
                    "e": _json(insight.evidence),
                    "sr": _json(insight.source_records),
                    "c": insight.confidence.score,
                    "cr": _json({
                        "reasons": insight.confidence.reasons,
                        "factors": insight.confidence.factors,
                    }),
                    "im": insight.impact.value,
                    "ra": insight.recommended_action,
                    "fp": insight.source_fingerprint,
                    "ws": insight.window_start,
                    "we": insight.window_end,
                    "rk": insight.rule_key,
                },
            )).scalar_one()
            ids.append(uuid.UUID(str(row)))
        await self._db.commit()
        return ids

    async def list_insights(
        self, *, limit: int = 50, include_stale: bool = False
    ) -> List[Dict[str, Any]]:
        clause = "" if include_stale else " AND is_stale = FALSE"
        rows = (await self._db.execute(
            text(f"""
                SELECT id, insight_type, title, summary, evidence, source_records,
                       confidence, confidence_reasons, impact, recommended_action,
                       is_stale, window_start, window_end, rule_key, created_at
                FROM growth_insights
                WHERE user_id = :u{clause}
                ORDER BY created_at DESC
                LIMIT :limit
            """),
            {"u": str(self._user_id), "limit": limit},
        )).mappings().all()
        return [dict(row) for row in rows]

    async def get_insight(self, insight_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        row = (await self._db.execute(
            text("""
                SELECT id, insight_type, title, summary, evidence, source_records,
                       confidence, confidence_reasons, impact, recommended_action,
                       is_stale, window_start, window_end, rule_key, created_at
                FROM growth_insights
                WHERE id = :i AND user_id = :u
            """),
            {"i": str(insight_id), "u": str(self._user_id)},
        )).mappings().first()
        return dict(row) if row else None

    async def mark_insight_stale(self, insight_id: uuid.UUID) -> None:
        await self._db.execute(
            text("UPDATE growth_insights SET is_stale = TRUE "
                 "WHERE id = :i AND user_id = :u"),
            {"i": str(insight_id), "u": str(self._user_id)},
        )
        await self._db.commit()

    async def delete_insights(self) -> int:
        result = await self._db.execute(
            text("DELETE FROM growth_insights WHERE user_id = :u"),
            {"u": str(self._user_id)},
        )
        await self._db.commit()
        return int(result.rowcount or 0)

    async def invalidate_insights_for_record(
        self, *, table: str, record_ids: Sequence[str]
    ) -> int:
        """Mark insights stale when a supporting record disappears.

        Without this an insight keeps asserting a claim whose evidence is gone --
        the failure the fingerprint exists to prevent.
        """
        if not record_ids:
            return 0
        result = await self._db.execute(
            text("""
                UPDATE growth_insights
                SET is_stale = TRUE
                WHERE user_id = :u
                  AND is_stale = FALSE
                  AND source_records ?| CAST(:ids AS text[])
            """),
            {"u": str(self._user_id), "ids": list(record_ids)},
        )
        await self._db.commit()
        return int(result.rowcount or 0)

    # ================================================================== #
    # Opportunities (stored on `ideas`, reused not duplicated)
    # ================================================================== #

    async def save_opportunity(
        self,
        opportunity: ContentOpportunity,
        *,
        insight_id: Optional[uuid.UUID] = None,
    ) -> uuid.UUID:
        row = (await self._db.execute(
            text("""
                INSERT INTO ideas
                    (user_id, title, angle, target_format, status, origin,
                     demand_score, evidence, source_comment_ids, insight_id)
                VALUES (:u, :t, :a, :f, 'backlog', :o, :d,
                        CAST(:e AS jsonb), CAST(:ids AS jsonb), :i)
                RETURNING id
            """),
            {
                "u": str(self._user_id),
                "t": opportunity.title,
                "a": opportunity.angle,
                "f": opportunity.target_format,
                "o": opportunity.origin.value,
                "d": opportunity.demand_score,
                "e": _json(opportunity.evidence),
                "ids": _json(opportunity.source_comment_ids),
                "i": str(insight_id) if insight_id else None,
            },
        )).scalar_one()
        await self._db.commit()
        return uuid.UUID(str(row))

    async def list_opportunities(
        self, *, limit: int = 50
    ) -> List[Dict[str, Any]]:
        rows = (await self._db.execute(
            text("""
                SELECT id, title, angle, target_format, status, origin,
                       demand_score, evidence, source_comment_ids, insight_id,
                       created_at
                FROM ideas
                WHERE user_id = :u AND origin <> 'manual'
                ORDER BY demand_score DESC NULLS LAST, created_at DESC
                LIMIT :limit
            """),
            {"u": str(self._user_id), "limit": limit},
        )).mappings().all()
        return [dict(row) for row in rows]

    async def count_opportunities(self) -> int:
        value = (await self._db.execute(
            text("SELECT COUNT(*) FROM ideas WHERE user_id = :u AND origin <> 'manual'"),
            {"u": str(self._user_id)},
        )).scalar()
        return int(value or 0)

    # ================================================================== #
    # Lessons
    # ================================================================== #

    async def save_lesson(
        self,
        *,
        insight_summary: str,
        actionable_rule: str,
        confidence: float,
        evidence: Dict[str, Any],
        source_records: List[str],
        insight_id: Optional[uuid.UUID],
        source_feature: str = "growth",
    ) -> uuid.UUID:
        row = (await self._db.execute(
            text("""
                INSERT INTO lessons
                    (user_id, source_feature, insight_summary, actionable_rule,
                     evidence, source_records, confidence, insight_id)
                VALUES (:u, :sf, :s, :r, CAST(:e AS jsonb), CAST(:sr AS jsonb),
                        :c, :i)
                RETURNING id
            """),
            {
                "u": str(self._user_id),
                "sf": source_feature,
                "s": insight_summary,
                "r": actionable_rule,
                "e": _json(evidence),
                "sr": _json(source_records),
                "c": confidence,
                "i": str(insight_id) if insight_id else None,
            },
        )).scalar_one()
        await self._db.commit()
        return uuid.UUID(str(row))

    async def list_lessons(self, *, limit: int = 50) -> List[Dict[str, Any]]:
        rows = (await self._db.execute(
            text("""
                SELECT id, source_feature, insight_summary, actionable_rule,
                       applied_count, confidence, insight_id, evidence, created_at
                FROM lessons
                WHERE user_id = :u
                ORDER BY created_at DESC
                LIMIT :limit
            """),
            {"u": str(self._user_id), "limit": limit},
        )).mappings().all()
        return [dict(row) for row in rows]

    async def count_lessons(self) -> int:
        value = (await self._db.execute(
            text("SELECT COUNT(*) FROM lessons WHERE user_id = :u"),
            {"u": str(self._user_id)},
        )).scalar()
        return int(value or 0)

    # ================================================================== #
    # Experiments
    # ================================================================== #

    async def create_experiment(
        self,
        *,
        hypothesis: str,
        outcome_metric: Optional[str] = None,
        variant_asset_id: Optional[uuid.UUID] = None,
        baseline_asset_id: Optional[uuid.UUID] = None,
        insight_id: Optional[uuid.UUID] = None,
    ) -> uuid.UUID:
        row = (await self._db.execute(
            text("""
                INSERT INTO experiments
                    (user_id, hypothesis, outcome_metric, variant_asset_id,
                     baseline_asset_id, insight_id, status)
                VALUES (:u, :h, :m, :v, :b, :i, 'planned')
                RETURNING id
            """),
            {
                "u": str(self._user_id),
                "h": hypothesis,
                "m": outcome_metric,
                "v": str(variant_asset_id) if variant_asset_id else None,
                "b": str(baseline_asset_id) if baseline_asset_id else None,
                "i": str(insight_id) if insight_id else None,
            },
        )).scalar_one()
        await self._db.commit()
        return uuid.UUID(str(row))

    async def get_experiment(self, experiment_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        row = (await self._db.execute(
            text("""
                SELECT id, hypothesis, status, outcome_metric, observed_value,
                       baseline_value, result_verdict, result_summary,
                       variant_asset_id, baseline_asset_id, insight_id, lesson_id,
                       started_at, completed_at, created_at
                FROM experiments
                WHERE id = :i AND user_id = :u
            """),
            {"i": str(experiment_id), "u": str(self._user_id)},
        )).mappings().first()
        return dict(row) if row else None

    async def list_experiments(self, *, limit: int = 50) -> List[Dict[str, Any]]:
        rows = (await self._db.execute(
            text("""
                SELECT id, hypothesis, status, outcome_metric, observed_value,
                       baseline_value, result_verdict, result_summary,
                       variant_asset_id, baseline_asset_id, insight_id, lesson_id,
                       started_at, completed_at, created_at
                FROM experiments
                WHERE user_id = :u
                ORDER BY created_at DESC
                LIMIT :limit
            """),
            {"u": str(self._user_id), "limit": limit},
        )).mappings().all()
        return [dict(row) for row in rows]

    async def count_experiments(self) -> int:
        value = (await self._db.execute(
            text("SELECT COUNT(*) FROM experiments WHERE user_id = :u"),
            {"u": str(self._user_id)},
        )).scalar()
        return int(value or 0)

    async def complete_experiment(
        self,
        experiment_id: uuid.UUID,
        *,
        observed_value: Optional[float],
        baseline_value: Optional[float],
        verdict: ExperimentVerdict,
        summary: str,
        lesson_id: Optional[uuid.UUID] = None,
    ) -> None:
        await self._db.execute(
            text("""
                UPDATE experiments
                SET status = 'completed', observed_value = :o,
                    baseline_value = :b, result_verdict = :v,
                    result_summary = :s, lesson_id = :l,
                    completed_at = NOW(), started_at = COALESCE(started_at, NOW())
                WHERE id = :i AND user_id = :u
            """),
            {
                "o": observed_value,
                "b": baseline_value,
                "v": verdict.value,
                "s": summary,
                "l": str(lesson_id) if lesson_id else None,
                "i": str(experiment_id),
                "u": str(self._user_id),
            },
        )
        await self._db.commit()

    # ================================================================== #

    async def creator_context(self) -> Dict[str, Any]:
        """Bounded creator facts for prompt context.

        A fixed number of fields, never the whole database. The Copilot answers
        questions about *this* creator; it does not need their entire history in
        the prompt to do it.
        """
        row = (await self._db.execute(
            text("""
                SELECT full_name, niche, target_audience, primary_platform,
                       content_goals
                FROM creator_profiles WHERE user_id = :u
            """),
            {"u": str(self._user_id)},
        )).mappings().first()
        if not row:
            return {}
        return {
            "full_name": row["full_name"],
            "niche": row["niche"],
            "target_audience": row["target_audience"],
            "primary_platform": row["primary_platform"],
            "content_goals": list(row["content_goals"] or []),
        }

    async def active_lessons(self, *, limit: int = 5) -> List[Dict[str, Any]]:
        rows = (await self._db.execute(
            text("""
                SELECT insight_summary, actionable_rule, confidence
                FROM lessons
                WHERE user_id = :u
                ORDER BY created_at DESC
                LIMIT :limit
            """),
            {"u": str(self._user_id), "limit": limit},
        )).mappings().all()
        return [dict(row) for row in rows]


def _json(payload: Any) -> str:
    import json

    return json.dumps(payload)


__all__ = ["GrowthRepository"]
