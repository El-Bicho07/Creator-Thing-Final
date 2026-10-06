"""Growth + Analytics Copilot API — `/api/growth` and `/api/analytics`.

Phase 5 implements the "Learn" step. These endpoints are about understanding and
recommending; none of them generates content. Generation stays with Studio.

Ownership is derived from the authenticated identity only. There is no `user_id`
parameter anywhere in this router, and no endpoint accepts one.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user, get_db_with_user
from app.core.logging import get_logger
from app.growth import GrowthService
from app.growth.contracts import (
    AddCommentRequest,
    AnalyzeCommentsRequest,
    AnalyzeCommentsResponse,
    CommentInsightResponse,
    CommentResponse,
    CopilotRequest,
    CopilotResponse,
    CreateCommentInsightResponse,
    CreateOpportunityRequest,
    CreatePerformanceRequest,
    ExperimentCreateRequest,
    ExperimentResponse,
    GrowthOverviewResponse,
    InsightResponse,
    LessonEvaluationResponse,
    LessonResponse,
    OpportunityResponse,
    PerformanceRecordResponse,
)

router = APIRouter(prefix="/growth", tags=["growth"])
copilot_router = APIRouter(prefix="/analytics", tags=["analytics"])
logger = get_logger(__name__)


class AddCommentResponse(BaseModel):
    """A comment id, and whether it was newly stored or already present."""

    model_config = ConfigDict(extra="forbid")

    id: str
    duplicate: bool


def _service(db: AsyncSession, user: CurrentUser) -> GrowthService:
    return GrowthService(db, uuid.UUID(str(user.id)))


def _confidence(payload: Dict[str, Any]):
    from app.growth.contracts import ConfidenceResponse

    raw = payload.get("confidence_reasons") or {}
    score = payload.get("confidence")
    if score is None:
        return None
    return ConfidenceResponse(
        score=float(score),
        band=payload.get("band") or _band(float(score)),
        reasons=list(raw.get("reasons") or []),
        factors=dict(raw.get("factors") or {}),
    )


def _band(score: float) -> str:
    if score >= 0.75:
        return "high"
    if score >= 0.45:
        return "medium"
    return "low"


def _insight_response(row: Dict[str, Any]) -> InsightResponse:
    return InsightResponse(
        id=str(row["id"]),
        insight_type=row["insight_type"],
        title=row["title"],
        summary=row["summary"],
        evidence=dict(row.get("evidence") or {}),
        source_records=list(row.get("source_records") or []),
        confidence=_confidence(row) or _confidence({}),
        impact=row["impact"],
        rule_key=row["rule_key"],
        recommended_action=row.get("recommended_action"),
        is_stale=bool(row.get("is_stale")),
        window_start=row.get("window_start"),
        window_end=row.get("window_end"),
        created_at=row.get("created_at"),
    )


# --------------------------------------------------------------------------- #
# Liveness
# --------------------------------------------------------------------------- #

@router.get("/health")
async def growth_health():
    return {"status": "ok", "feature": "growth", "phase": 5}


# --------------------------------------------------------------------------- #
# Overview
# --------------------------------------------------------------------------- #

@router.get("/overview", response_model=GrowthOverviewResponse)
async def get_overview(
    window_days: int = Query(default=30, ge=1, le=365),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
):
    """What changed. Numbers first, interpretation second.

    Returns a valid response even with no data, carrying `has_enough_data=false`
    and `data_gaps`, so the client can tell "nothing happened" from "we don't know".
    """
    return await _service(db, current_user).overview(window_days=window_days)


@router.get("/performance", response_model=List[PerformanceRecordResponse])
async def list_performance(
    limit: int = Query(default=50, ge=1, le=500),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
):
    """The creator's own performance records. Unavailable metrics read as null.

    Reads through the repository rather than repeating its query, so the title
    fallback (a creator may record performance for a post the platform never
    generated) cannot drift between the two.
    """
    from app.growth.analysis import PerformanceAnalyzer
    from app.growth.contracts import PerformanceMetric

    repo = _service(db, current_user).repo
    snapshots = await repo.list_performance(limit=limit)
    newest_first = sorted(
        snapshots, key=lambda s: s.recorded_at, reverse=True
    )[:limit]

    return [
        PerformanceRecordResponse(
            id=snapshot.record_id,
            asset_id=snapshot.asset_id,
            asset_title=snapshot.asset_title,
            platform=snapshot.platform,
            # An unmeasured metric is null, never a zero the creator never
            # recorded.
            views=snapshot.value(PerformanceMetric.VIEWS),
            likes=snapshot.value(PerformanceMetric.LIKES),
            comments_count=snapshot.value(PerformanceMetric.COMMENTS),
            shares=snapshot.value(PerformanceMetric.SHARES),
            published_at=snapshot.published_at,
            recorded_at=snapshot.recorded_at,
            engagement_rate=PerformanceAnalyzer.engagement_rate(snapshot),
        )
        for snapshot in newest_first
    ]


@router.post("/performance", status_code=status.HTTP_201_CREATED,
             response_model=PerformanceRecordResponse)
async def record_performance(
    body: CreatePerformanceRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
):
    """Record one performance observation.

    `metrics_measured` distinguishes "measured, and it was zero" from "never
    measured". Omitting it means every supplied metric was measured.
    """
    from app.growth.contracts import PerformanceMetric

    supplied = set(body.values)
    unknown = supplied - {m.value for m in PerformanceMetric}
    if unknown:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Unsupported metric(s): {sorted(unknown)}. This platform records "
                f"{sorted({m.value for m in PerformanceMetric})}."
            ),
        )
    if body.metrics_measured is not None:
        not_supplied = set(body.metrics_measured) - supplied
        if not_supplied:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "metrics_measured lists metrics that were not supplied: "
                    f"{sorted(not_supplied)}"
                ),
            )

    service = _service(db, current_user)
    record_id = await service.repo.record_performance(
        platform=body.platform,
        values=body.values,
        asset_id=uuid.UUID(body.asset_id) if body.asset_id else None,
        asset_title=body.title,
        published_at=body.published_at,
        metrics_measured=body.metrics_measured,
    )
    row = (await db.execute(
        __import__("sqlalchemy").text("""
            SELECT id, asset_id, platform, views, likes, comments_count, shares,
                   published_at, recorded_at, metrics_measured, metadata
            FROM performance_records WHERE id = :i AND user_id = :u
        """),
        {"i": str(record_id), "u": str(service.user_id)},
    )).mappings().first()
    return PerformanceRecordResponse(
        id=str(row["id"]), asset_id=str(row["asset_id"]) if row["asset_id"] else None,
        asset_title=body.title, platform=row["platform"],
        views=row["views"], likes=row["likes"],
        comments_count=row["comments_count"], shares=row["shares"],
        published_at=row["published_at"], recorded_at=row["recorded_at"],
    )


# --------------------------------------------------------------------------- #
# Insights
# --------------------------------------------------------------------------- #

@router.get("/insights", response_model=List[InsightResponse])
async def list_insights(
    window_days: int = Query(default=30, ge=1, le=365),
    include_stale: bool = Query(default=False),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
):
    return [
        _insight_response(row)
        for row in await _service(db, current_user).repo.list_insights(
            limit=200, include_stale=include_stale
        )
    ]


@router.post("/insights/generate", status_code=status.HTTP_201_CREATED,
             response_model=List[InsightResponse])
async def generate_insights(
    window_days: int = Query(default=30, ge=1, le=365),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
):
    """Re-run the deterministic insight rules.

    Cheap by construction: rules read already-stored records and never call a
    provider, so this is safe to press repeatedly.
    """
    service = _service(db, current_user)
    analysis = await service.analyze(window_days=window_days)
    await service.generate_insights(analysis, window_days=window_days)
    return [
        _insight_response(row)
        for row in await service.repo.list_insights(limit=200)
    ]


# --------------------------------------------------------------------------- #
# Comments
# --------------------------------------------------------------------------- #

@router.get("/comments", response_model=List[CommentResponse])
async def list_comments(
    asset_id: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
):
    rows = await _service(db, current_user).repo.list_comments(
        asset_id=uuid.UUID(asset_id) if asset_id else None, limit=limit
    )
    out: List[CommentResponse] = []
    for row in rows:
        stored = row.get("classification") or {}
        out.append(
            CommentResponse(
                id=str(row["id"]),
                asset_id=str(row["asset_id"]) if row["asset_id"] else None,
                comment_text=row["comment_text"],
                author_hash=row["author_hash"],
                posted_at=row["posted_at"],
                category=stored.get("category"),
                intent=stored.get("intent"),
                actionable=bool(stored.get("actionable")),
                sentiment=row.get("sentiment"),
                summary=stored.get("summary"),
                analyzed_at=row.get("analyzed_at"),
            )
        )
    return out


@router.post("/comments", status_code=status.HTTP_200_OK,
             response_model=AddCommentResponse)
async def add_comment(
    body: AddCommentRequest,
    response: Response,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
):
    """Add an audience comment.

    Identical text is deduplicated rather than re-analysed, which is what stops the
    same comment being re-billed to the provider on every request.
    """
    service = _service(db, current_user)
    result = await service.repo.add_comment(
        text_value=body.comment_text,
        asset_id=uuid.UUID(body.asset_id) if body.asset_id else None,
        author_hash=body.author_hash,
        posted_at=body.posted_at,
    )
    # A duplicate must not report 201: nothing was created. The status is set on the
    # response because the decorator's status_code is only a default.
    response.status_code = status.HTTP_200_OK if result["duplicate"] \
        else status.HTTP_201_CREATED
    return AddCommentResponse(id=result["id"], duplicate=result["duplicate"])


@router.post("/comments/analyze", response_model=AnalyzeCommentsResponse)
async def analyze_comments(
    body: AnalyzeCommentsRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
):
    """Classify pending comments.

    Bounded by `limit`. Bulk analysis of a large corpus is a JobService operation,
    not a request.
    """
    return await _service(db, current_user).analyze_comments(
        asset_id=uuid.UUID(body.asset_id) if body.asset_id else None,
        limit=body.limit,
    )


@router.get("/comment-insights", response_model=List[CommentInsightResponse])
async def list_comment_insights(
    limit: int = Query(default=50, ge=1, le=200),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
):
    rows = await _service(db, current_user).repo.list_comment_insights(limit=limit)
    return [
        CommentInsightResponse(
            id=str(row["id"]),
            category=row.get("category"),
            summary=row["summary"],
            extracted_questions=list(row.get("extracted_questions") or []),
            actionable_idea=row.get("actionable_idea"),
            comment_ids=[str(i) for i in (row.get("comment_ids") or [])],
            confidence=(
                _confidence({"confidence": float(row["confidence"])})
                if row.get("confidence") is not None else None
            ),
            demand_score=row.get("demand_score"),
        )
        for row in rows
    ]


@router.post("/comment-insights", status_code=status.HTTP_201_CREATED,
             response_model=CreateCommentInsightResponse)
async def create_comment_insight(
    body: AnalyzeCommentsRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
):
    """Analyze comments and persist the resulting audience insight."""
    service = _service(db, current_user)
    result = await service.analyze_comments(limit=body.limit)
    rows = await service.repo.list_comment_insights(limit=1)
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "NO_AUDIENCE_SIGNAL",
                "message": (
                    "No audience questions were found in the analysed comments, "
                    "so there is nothing to record yet."
                ),
            },
        )
    row = rows[0]
    return CreateCommentInsightResponse(
        id=str(row["id"]), category=row.get("category"), summary=row["summary"],
        extracted_questions=list(row.get("extracted_questions") or []),
        actionable_idea=row.get("actionable_idea"),
        comment_ids=[str(i) for i in (row.get("comment_ids") or [])],
    )


# --------------------------------------------------------------------------- #
# Opportunities
# --------------------------------------------------------------------------- #

@router.get("/opportunities", response_model=List[OpportunityResponse])
async def list_opportunities(
    limit: int = Query(default=50, ge=1, le=200),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
):
    """Content opportunities, strongest demand first.

    Stored on the existing `ideas` table, which is why Phase 4's Producer already
    picks them up as context.
    """
    rows = await _service(db, current_user).repo.list_opportunities(limit=limit)
    return [
        OpportunityResponse(
            id=str(row["id"]),
            title=row["title"],
            angle=row.get("angle") or "",
            target_format=row.get("target_format") or "reel",
            demand_score=row.get("demand_score"),
            origin=row.get("origin") or "comment",
            status=row.get("status") or "backlog",
            evidence=dict(row.get("evidence") or {}),
            source_comment_ids=[
                str(i) for i in (row.get("source_comment_ids") or [])
            ],
            insight_id=str(row["insight_id"]) if row.get("insight_id") else None,
        )
        for row in rows
    ]


@router.post("/opportunities/detect", status_code=status.HTTP_201_CREATED,
             response_model=List[OpportunityResponse])
async def detect_opportunities(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
):
    """Group analyzed comments into ranked opportunities.

    Produces the upstream half only. The opportunity names a topic, a format and an
    angle; Studio still does the creating.
    """
    service = _service(db, current_user)
    detected = await service.detect_opportunities()
    if not detected:
        return []
    await service.persist_opportunities(detected)
    return await list_opportunities(limit=200, current_user=current_user, db=db)


@router.post("/opportunities", status_code=status.HTTP_201_CREATED,
             response_model=OpportunityResponse)
async def create_opportunity(
    body: CreateOpportunityRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
):
    """Turn specific comments into one opportunity, manually."""
    from app.growth.contracts import ContentOpportunity, OpportunityOrigin

    service = _service(db, current_user)
    comment_ids = []
    for raw in body.comment_ids:
        try:
            comment_ids.append(uuid.UUID(raw))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid comment id: {raw}",
            )

    owned = {
        str(r["id"])
        for r in await service.repo.list_comments(limit=500)
    }
    unknown = [c for c in body.comment_ids if c not in owned]
    if unknown:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or more comment ids are not yours.",
        )

    opportunity = ContentOpportunity(
        title=body.title,
        angle=body.angle,
        target_format=body.target_format,
        demand_score=0.0,
        origin=OpportunityOrigin.COMMENT,
        evidence={"source": "manual"},
        source_comment_ids=comment_ids,
    )
    new_id = await service.repo.save_opportunity(opportunity)
    return OpportunityResponse(
        id=str(new_id), title=opportunity.title, angle=opportunity.angle,
        target_format=opportunity.target_format, demand_score=0.0,
        origin=opportunity.origin, evidence=opportunity.evidence,
        source_comment_ids=comment_ids,
    )


# --------------------------------------------------------------------------- #
# Lessons
# --------------------------------------------------------------------------- #

@router.get("/lessons", response_model=List[LessonResponse])
async def list_lessons(
    limit: int = Query(default=50, ge=1, le=200),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
):
    """Durable learnings, each carrying the evidence it was derived from."""
    rows = await _service(db, current_user).repo.list_lessons(limit=limit)
    return [
        LessonResponse(
            id=str(row["id"]),
            source_feature=row["source_feature"],
            insight_summary=row["insight_summary"],
            actionable_rule=row["actionable_rule"],
            applied_count=row.get("applied_count") or 0,
            confidence=(
                _confidence({"confidence": float(row["confidence"])})
                if row.get("confidence") is not None else None
            ),
            insight_id=str(row["insight_id"]) if row.get("insight_id") else None,
            evidence=dict(row.get("evidence") or {}),
            created_at=row.get("created_at"),
        )
        for row in rows
    ]


@router.post("/lessons", status_code=status.HTTP_201_CREATED,
             response_model=LessonResponse)
async def create_lesson(
    insight_id: str,
    actionable_rule: Optional[str] = Query(default=None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
):
    """Promote an insight to a durable lesson.

    Confidence comes from the insight. A lesson cannot be created with a
    confidence the evidence does not support.
    """
    service = _service(db, current_user)
    try:
        row = await service.repo.get_insight(uuid.UUID(insight_id))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid insight id: {insight_id}",
        )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Insight not found.")

    stored = await service.repo.save_lesson(
        insight_summary=row["summary"],
        actionable_rule=actionable_rule or row.get("recommended_action") or row["summary"],
        confidence=float(row["confidence"]),
        evidence=dict(row.get("evidence") or {}),
        source_records=[str(i) for i in (row.get("source_records") or [])],
        insight_id=uuid.UUID(str(row["id"])),
    )
    return LessonResponse(
        id=str(stored), source_feature="growth",
        insight_summary=row["summary"],
        actionable_rule=actionable_rule or row.get("recommended_action") or row["summary"],
        confidence=_confidence(row),
        insight_id=str(row["id"]),
        evidence=dict(row.get("evidence") or {}),
    )


# --------------------------------------------------------------------------- #
# Experiments
# --------------------------------------------------------------------------- #

def _experiment_response(row: Dict[str, Any]) -> ExperimentResponse:
    return ExperimentResponse(
        id=str(row["id"]),
        hypothesis=row["hypothesis"],
        status=row["status"],
        outcome_metric=row.get("outcome_metric"),
        observed_value=(
            float(row["observed_value"]) if row.get("observed_value") is not None else None
        ),
        baseline_value=(
            float(row["baseline_value"]) if row.get("baseline_value") is not None else None
        ),
        result_verdict=row.get("result_verdict"),
        result_summary=row.get("result_summary"),
        variant_asset_id=(
            str(row["variant_asset_id"]) if row.get("variant_asset_id") else None
        ),
        baseline_asset_id=(
            str(row["baseline_asset_id"]) if row.get("baseline_asset_id") else None
        ),
        insight_id=str(row["insight_id"]) if row.get("insight_id") else None,
        lesson_id=str(row["lesson_id"]) if row.get("lesson_id") else None,
        started_at=row.get("started_at"),
        completed_at=row.get("completed_at"),
        created_at=row.get("created_at"),
    )


@router.get("/experiments", response_model=List[ExperimentResponse])
async def list_experiments(
    limit: int = Query(default=50, ge=1, le=200),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
):
    rows = await _service(db, current_user).repo.list_experiments(limit=limit)
    return [_experiment_response(row) for row in rows]


@router.post("/experiments", status_code=status.HTTP_201_CREATED,
             response_model=ExperimentResponse)
async def create_experiment(
    body: ExperimentCreateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
):
    """State a hypothesis.

    The outcome metric must be one the platform actually collects, so an
    experiment cannot be set up to conclude on a number nobody recorded.
    """
    from app.growth.contracts import PerformanceMetric

    if body.outcome_metric:
        if body.outcome_metric not in {m.value for m in PerformanceMetric}:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"“{body.outcome_metric}” is not a metric this platform "
                    f"collects. Use one of "
                    f"{sorted({m.value for m in PerformanceMetric})}."
                ),
            )

    service = _service(db, current_user)
    experiment_id = await service.repo.create_experiment(
        hypothesis=body.hypothesis,
        outcome_metric=body.outcome_metric,
        variant_asset_id=uuid.UUID(body.variant_asset_id) if body.variant_asset_id else None,
        baseline_asset_id=uuid.UUID(body.baseline_asset_id) if body.baseline_asset_id else None,
        insight_id=uuid.UUID(body.insight_id) if body.insight_id else None,
    )
    return _experiment_response(await service.repo.get_experiment(experiment_id))


@router.post("/experiments/{experiment_id}/evaluate",
             response_model=LessonEvaluationResponse)
async def evaluate_experiment(
    experiment_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
):
    """Compare the variant against the baseline, deterministically.

    A confirmed result produces a lesson. An inconclusive one produces nothing,
    because a lesson from noise is worse than no lesson.
    """
    service = _service(db, current_user)
    try:
        parsed = uuid.UUID(experiment_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid experiment id: {experiment_id}",
        )
    try:
        evaluation = await service.evaluate_experiment(parsed)
    except LookupError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Experiment not found.")
    return LessonEvaluationResponse(**evaluation)


# --------------------------------------------------------------------------- #
# Analytics Copilot
# --------------------------------------------------------------------------- #

@copilot_router.post("/copilot", response_model=CopilotResponse)
async def ask_copilot(
    body: CopilotRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
):
    """Ask what happened, why it matters, and what to do next.

    Every number in the answer is checked against the deterministic analysis before
    it is returned. An answer that asserts an unsourced figure is discarded and
    replaced with a data-only answer.

    With insufficient data the response says so, rather than guessing.
    """
    return await _service(db, current_user).ask_copilot(
        body.question, window_days=body.window_days
    )


class CopilotMetricsResponse(BaseModel):
    """What the Copilot may talk about, and what it may not."""

    model_config = ConfigDict(extra="forbid")

    supported_metrics: List[dict]
    unsupported_metrics: List[str]
    note: str


@copilot_router.get("/copilot/metrics", response_model=CopilotMetricsResponse)
async def copilot_metrics(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
):
    """What the Copilot is allowed to talk about, and what it is not.

    Publishing the unsupported list means the client can show a creator that
    retention is not tracked here, instead of letting them wonder.
    """
    from app.growth.contracts import UNSUPPORTED_METRICS, PerformanceMetric

    return {
        "supported_metrics": [
            {"name": m.value, "label": m.label} for m in PerformanceMetric
        ],
        "unsupported_metrics": list(UNSUPPORTED_METRICS),
        "note": (
            "Numbers are computed by the platform. The model interprets them and "
            "never creates them."
        ),
    }
