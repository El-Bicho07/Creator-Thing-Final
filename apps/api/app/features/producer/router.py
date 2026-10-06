"""Producer API — `/api/producer`.

The Producer is a decision layer, so these endpoints are about deciding and
handing off, not about creating content. Every generation request in this router
is answered by Studio; none of them generates anything.

Ownership is derived from the authenticated identity only. There is no `user_id`
parameter anywhere, and no endpoint accepts one.
"""
from __future__ import annotations

import uuid
from datetime import date
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user, get_db_with_user
from app.core.logging import get_logger
from app.producer import ProducerError, ProducerService
from app.producer.contracts import (
    ExecuteResponse,
    ProducerRecommendation,
    RecommendationKind,
    RecommendResponse,
)

router = APIRouter(prefix="/producer", tags=["producer"])
logger = get_logger(__name__)


# --------------------------------------------------------------------------- #
# Schemas
# --------------------------------------------------------------------------- #

class RecommendRequest(BaseModel):
    """Ask what the Producer would recommend, WITHOUT persisting.

    The preview path exists so a creator can inspect the reasoning before
    accepting anything, and so a UI can show "why" without side effects.
    """

    model_config = ConfigDict(extra="forbid")

    plan_date: Optional[date] = None
    time_budget_minutes: int = Field(default=120, ge=15, le=720)


class ExecuteRequest(BaseModel):
    """Accept a Today item and hand it to Studio."""

    model_config = ConfigDict(extra="forbid")

    item_id: uuid.UUID
    #: Continue an existing Studio session instead of starting one.
    studio_session_id: Optional[uuid.UUID] = None


# --------------------------------------------------------------------------- #
# Dependency
# --------------------------------------------------------------------------- #

def _producer(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
) -> ProducerService:
    return ProducerService(db, uuid.UUID(current_user.id))


_STATUS_MAP = {
    "not_found": status.HTTP_404_NOT_FOUND,
    "not_executable": status.HTTP_409_CONFLICT,
    "capability_unavailable": status.HTTP_409_CONFLICT,
    "already_completed": status.HTTP_409_CONFLICT,
}


def _producer_http_error(exc: ProducerError) -> HTTPException:
    code = _STATUS_MAP.get(exc.status, status.HTTP_502_BAD_GATEWAY)
    return HTTPException(status_code=code, detail=str(exc))


# --------------------------------------------------------------------------- #
# Routes
# --------------------------------------------------------------------------- #

@router.get("/health")
async def producer_health():
    """Unauthenticated liveness probe."""
    return {
        "status": "ok",
        "feature": "producer",
        "phase": 4,
        "recommendation_kinds": [k.value for k in RecommendationKind],
    }


@router.post("/recommend", response_model=RecommendResponse)
async def recommend(
    body: RecommendRequest,
    producer: ProducerService = Depends(_producer),
) -> Dict[str, Any]:
    """Preview the Producer's recommendations with full reasoning.

    Persists nothing. An empty list is a legitimate answer meaning "nothing worth
    doing today", and the response says so explicitly rather than returning filler.
    """
    day = body.plan_date or date.today()
    recommendations, context_summary, run = await producer.recommend_only(
        day, time_budget_minutes=body.time_budget_minutes
    )

    return RecommendResponse(
        date=day,
        recommendations=recommendations,
        total=len(recommendations),
        context=context_summary,
        run=run,
        has_action=bool(recommendations),
        message=(
            ""
            if recommendations
            else "The Producer found nothing worth recommending today. "
                 "Complete your profile, add memories, or start a draft in Studio."
        ),
    )


@router.post("/execute", response_model=ExecuteResponse)
async def execute(
    body: ExecuteRequest,
    producer: ProducerService = Depends(_producer),
) -> Dict[str, Any]:
    """Hand an accepted Today item to Studio.

    This endpoint does NOT generate content. It prepares a Studio session and the
    capability input, then returns where the creator should go. Studio remains
    responsible for generation, critique and refinement.
    """
    try:
        handoff = await producer.execute(
            body.item_id, studio_session_id=body.studio_session_id
        )
    except ProducerError as exc:
        raise _producer_http_error(exc) from exc

    return ExecuteResponse(
        item_id=str(handoff.item_id),
        studio_session_id=str(handoff.session_id),
        capability=handoff.capability,
        input=handoff.input,
        session_created=handoff.created,
        studio_url=f"/studio?session={handoff.session_id}",
        message=(
            "Session prepared. Studio will generate the content -- nothing is "
            "created here and nothing is published automatically."
        ),
    )
