"""Today API — `/api/today`.

Replaces the Phase 1 stub. Ownership is derived from the authenticated identity
only: there is no `user_id` parameter anywhere in this router, so a client cannot
ask for another creator's plan. PostgreSQL RLS is the authoritative boundary.

Today is an execution surface, not an analytics dashboard. The endpoints here
manage planned work and its state; analytics belong to a later phase.
"""
from __future__ import annotations

import uuid
from datetime import date
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user, get_db_with_user
from app.core.logging import get_logger
from app.producer import (
    ActionKind,
    InvalidTransition,
    ProducerService,
    TodayItem,
    TodayItemStatus,
    TodayRepository,
)
from app.producer.contracts import (
    CarryoverItem,
    CarryoverResponse,
    PlanResultResponse,
    TodayPlanResponse,
)
from app.producer.context import ProducerContextAssembler

router = APIRouter(prefix="/today", tags=["today"])
logger = get_logger(__name__)


# --------------------------------------------------------------------------- #
# Schemas
# --------------------------------------------------------------------------- #

class ItemCreateRequest(BaseModel):
    """A creator-added Today item."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., min_length=1, max_length=255)
    platform: str = Field(default="reel", max_length=40)
    estimated_minutes: int = Field(default=30, ge=5, le=600)
    reason: Optional[str] = Field(None, max_length=2_000)
    action_kind: Optional[ActionKind] = None
    idea_id: Optional[uuid.UUID] = None

    @field_validator("title")
    @classmethod
    def _strip(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("title must not be blank")
        return cleaned


class ItemUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: Optional[str] = Field(None, min_length=1, max_length=255)
    reason: Optional[str] = Field(None, max_length=2_000)
    platform: Optional[str] = Field(None, max_length=40)
    estimated_minutes: Optional[int] = Field(None, ge=5, le=600)


class StatusChangeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: TodayItemStatus


class PlanRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    time_budget_minutes: int = Field(default=120, ge=15, le=720)
    #: Run through the job system instead of inline. Planning is several Gateway
    #: calls plus assembly, so async is the honest default for a full plan.
    asynchronous: bool = False


# --------------------------------------------------------------------------- #
# Dependencies
# --------------------------------------------------------------------------- #

def _repo(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
) -> TodayRepository:
    return TodayRepository(db, uuid.UUID(current_user.id))


def _producer(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
) -> ProducerService:
    return ProducerService(db, uuid.UUID(current_user.id))


def _assembler(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
) -> ProducerContextAssembler:
    """Assembled independently of the service, so a read endpoint does not need
    to construct a Producer just to look at context."""
    return ProducerContextAssembler(db, uuid.UUID(current_user.id))


def _plan_date(value: Optional[str]) -> date:
    if not value:
        return date.today()
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="plan_date must be an ISO date (YYYY-MM-DD)",
        )


def _item_payload(item: TodayItem) -> Dict[str, Any]:
    return item.model_dump(mode="json")


# --------------------------------------------------------------------------- #
# Routes
# --------------------------------------------------------------------------- #

@router.get("/health")
async def today_health():
    """Unauthenticated liveness probe."""
    return {
        "status": "ok",
        "feature": "today",
        "phase": 4,
        "states": [s.value for s in TodayItemStatus],
    }


@router.get("", response_model=TodayPlanResponse)
async def get_today(
    plan_date: Optional[str] = Query(
        None, alias="date", description="ISO date; defaults to today."
    ),
    repo: TodayRepository = Depends(_repo),
) -> Dict[str, Any]:
    """The plan for a day.

    Reads persisted state. It never regenerates a plan as a side effect of a page
    load, because a creator refreshing Today must not get a reshuffled day.
    """
    day = _plan_date(plan_date)
    items = await repo.list_for_date(day)

    # Studio owns generation state. Reflect it here so the two surfaces cannot
    # disagree about whether work is finished, rather than duplicating the check.
    for item in items:
        if item.studio_session_id and item.status in (
            TodayItemStatus.PLANNED, TodayItemStatus.IN_PROGRESS
        ):
            await repo.sync_progress_from_studio(item.studio_session_id)
    items = await repo.list_for_date(day)

    return TodayPlanResponse(
        date=day,
        items=items,
        total=len(items),
        total_estimated_minutes=sum(
            i.estimated_minutes for i in items
            if i.status in (TodayItemStatus.PLANNED, TodayItemStatus.IN_PROGRESS)
        ),
        priority_item_id=str(items[0].id) if items else None,
        counts={
            state.value: sum(1 for i in items if i.status is state)
            for state in TodayItemStatus
        },
    )


@router.post("/plan", status_code=status.HTTP_201_CREATED, response_model=PlanResultResponse)
async def create_plan(
    body: PlanRequest,
    plan_date: Optional[str] = Query(None, alias="date"),
    producer: ProducerService = Depends(_producer),
    repo: TodayRepository = Depends(_repo),
) -> Dict[str, Any]:
    """Run the Producer and persist today's plan.

    Duplicate-safe: work already planned today is reported as skipped rather than
    added twice. A creator with too little context gets a plan with no items and
    an explanation, not an invented one.
    """
    day = _plan_date(plan_date)

    if body.asynchronous:
        run = await producer.plan_as_job(day, time_budget_minutes=body.time_budget_minutes)
        items = await repo.list_for_date(day)
        return PlanResultResponse(
            date=day,
            items=items,
            total=len(items),
            total_estimated_minutes=sum(
                i.estimated_minutes for i in items
                if i.status in (TodayItemStatus.PLANNED, TodayItemStatus.IN_PROGRESS)
            ),
            notes=run.notes,
            run=run,
            job_id=str(run.job_id) if run.job_id else None,
            job_status=run.status,
        )

    plan, run = await producer.plan(day, time_budget_minutes=body.time_budget_minutes)
    return PlanResultResponse(
        date=day,
        items=plan.items,
        total=len(plan.items),
        total_estimated_minutes=plan.total_estimated_minutes,
        notes=plan.notes,
        run=run,
    )


@router.get("/items/{item_id}", response_model=TodayItem)
async def get_item(
    item_id: uuid.UUID,
    repo: TodayRepository = Depends(_repo),
) -> Dict[str, Any]:
    item = await repo.get(item_id)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Today item not found"
        )
    return _item_payload(item)


@router.post("/items", status_code=status.HTTP_201_CREATED, response_model=TodayItem)
async def create_item(
    body: ItemCreateRequest,
    plan_date: Optional[str] = Query(None, alias="date"),
    repo: TodayRepository = Depends(_repo),
) -> Dict[str, Any]:
    """Add work the creator decided on themselves.

    `source='creator'` means the Producer will never overwrite or remove it.
    """
    day = _plan_date(plan_date)
    item = await repo.create_manual(
        title=body.title,
        plan_date=day,
        platform=body.platform,
        estimated_minutes=body.estimated_minutes,
        reason=body.reason,
        action_kind=body.action_kind,
        idea_id=body.idea_id,
    )
    return _item_payload(item)


@router.patch("/items/{item_id}", response_model=TodayItem)
async def update_item(
    item_id: uuid.UUID,
    body: ItemUpdateRequest,
    repo: TodayRepository = Depends(_repo),
) -> Dict[str, Any]:
    """Partial update. Status changes go through the transition endpoint."""
    if await repo.get(item_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Today item not found"
        )
    item = await repo.update(
        item_id,
        title=body.title,
        reason=body.reason,
        platform=body.platform,
        estimated_minutes=body.estimated_minutes,
    )
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Today item not found"
        )
    return _item_payload(item)


@router.patch("/items/{item_id}/status", response_model=TodayItem)
async def change_status(
    item_id: uuid.UUID,
    body: StatusChangeRequest,
    repo: TodayRepository = Depends(_repo),
) -> Dict[str, Any]:
    """Move an item through the state machine.

    An illegal transition returns 409 with the legal moves, rather than silently
    succeeding or raising a constraint error.
    """
    try:
        item = await repo.transition(item_id, body.status)
    except LookupError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Today item not found"
        )
    except InvalidTransition as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        )
    return _item_payload(item)


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item_id: uuid.UUID,
    repo: TodayRepository = Depends(_repo),
):
    """Explicit creator action. Nothing is removed automatically.

    No return annotation: FastAPI turns `-> None` into a response model, which
    conflicts with a 204. Studio's delete endpoints follow the same convention.
    """
    if not await repo.delete(item_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Today item not found"
        )
    return None


@router.get("/carryover", response_model=CarryoverResponse)
async def get_carryover(
    assembler: ProducerContextAssembler = Depends(_assembler),
) -> Dict[str, Any]:
    """Unfinished work from previous days.

    Surfaced so a creator can see what slipped rather than discovering it when the
    Producer re-suggests it.
    """
    context = await assembler.assemble(date.today())
    return CarryoverResponse(
        items=[
            CarryoverItem(
                id=str(i["id"]),
                plan_date=i["plan_date"],
                title=i["title"],
                status=i["status"],
                action_kind=i["action_kind"],
                reason=i["reason"],
            )
            for i in context.open_carryover
        ],
        days_since_last_plan=context.days_since_last_plan,
    )
