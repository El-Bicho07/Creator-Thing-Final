"""FastAPI routes for Coach & Learning domain (Phase 6).

All endpoints require authentication and execute against the caller's RLS-scoped
database session. Client-supplied user IDs are strictly ignored.
"""
from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.coach.contracts import (
    CoachFeedbackRequest,
    CoachFeedbackResponse,
    CoachGoalCreate,
    CoachGoalResponse,
    CoachGoalUpdate,
    CoachRecommendation,
    CreatorCorrectionRequest,
    GoalCategory,
    GoalStatus,
    LearningCategory,
    LearningRecordCreate,
    LearningRecordResponse,
    LearningRecordUpdate,
    LearningStatus,
)
from app.coach.service import CoachService
from app.core.auth import CurrentUser, get_current_user, get_db_with_user

router = APIRouter(tags=["coach"])


def _get_service(db: AsyncSession, user: CurrentUser) -> CoachService:
    user_uuid = user.id if isinstance(user.id, UUID) else UUID(str(user.id))
    return CoachService(db, user_uuid)


@router.get("/coach/health", status_code=status.HTTP_200_OK)
async def coach_health() -> dict:
    return {"status": "ok", "service": "coach_and_learning", "phase": 6}


# --- Goals ------------------------------------------------------------------ #

@router.post(
    "/coach/goals",
    response_model=CoachGoalResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_goal(
    req: CoachGoalCreate,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
) -> CoachGoalResponse:
    service = _get_service(db, user)
    return await service.create_goal(req)


@router.get("/coach/goals", response_model=List[CoachGoalResponse])
async def list_goals(
    status_filter: Optional[GoalStatus] = Query(None, alias="status"),
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
) -> List[CoachGoalResponse]:
    service = _get_service(db, user)
    return await service.list_goals(status_filter)


@router.get("/coach/goals/{goal_id}", response_model=CoachGoalResponse)
async def get_goal(
    goal_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
) -> CoachGoalResponse:
    service = _get_service(db, user)
    goal = await service.get_goal(goal_id)
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Goal {goal_id} not found"
        )
    return goal


@router.patch("/coach/goals/{goal_id}", response_model=CoachGoalResponse)
async def update_goal(
    goal_id: UUID,
    req: CoachGoalUpdate,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
) -> CoachGoalResponse:
    service = _get_service(db, user)
    updated = await service.update_goal(goal_id, req)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Goal {goal_id} not found"
        )
    return updated


@router.post("/coach/goals/{goal_id}/evaluate", response_model=CoachGoalResponse)
async def evaluate_goal_progress(
    goal_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
) -> CoachGoalResponse:
    service = _get_service(db, user)
    evaluated = await service.evaluate_goal_progress(goal_id)
    if not evaluated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Goal {goal_id} not found"
        )
    return evaluated


# --- Feedback & Sessions --------------------------------------------------- #

@router.post("/coach/feedback", response_model=CoachFeedbackResponse)
async def provide_feedback(
    req: CoachFeedbackRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
) -> CoachFeedbackResponse:
    service = _get_service(db, user)
    try:
        return await service.provide_feedback(req)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get(
    "/coach/sessions/{session_id}/feedback",
    response_model=List[CoachFeedbackResponse],
)
async def list_session_feedback(
    session_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
) -> List[CoachFeedbackResponse]:
    service = _get_service(db, user)
    return await service.repo.list_feedback_for_session(session_id)


@router.post(
    "/coach/goals/{goal_id}/recommend",
    response_model=CoachRecommendation,
)
async def recommend_producer_action(
    goal_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
) -> CoachRecommendation:
    service = _get_service(db, user)
    rec = await service.recommend_producer_action(goal_id)
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Goal {goal_id} not found"
        )
    return rec


# --- Learning Records ------------------------------------------------------- #

@router.post(
    "/learning",
    response_model=LearningRecordResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_learning(
    req: LearningRecordCreate,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
) -> LearningRecordResponse:
    service = _get_service(db, user)
    return await service.create_learning(req)


@router.get("/learning", response_model=List[LearningRecordResponse])
async def list_learnings(
    category: Optional[LearningCategory] = Query(None),
    status_filter: Optional[LearningStatus] = Query(None, alias="status"),
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
) -> List[LearningRecordResponse]:
    service = _get_service(db, user)
    return await service.list_learnings(category, status_filter)


@router.get("/learning/{learning_id}", response_model=LearningRecordResponse)
async def get_learning(
    learning_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
) -> LearningRecordResponse:
    service = _get_service(db, user)
    record = await service.get_learning(learning_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learning record {learning_id} not found"
        )
    return record


@router.patch("/learning/{learning_id}", response_model=LearningRecordResponse)
async def update_learning(
    learning_id: UUID,
    req: LearningRecordUpdate,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
) -> LearningRecordResponse:
    service = _get_service(db, user)
    updated = await service.update_learning(learning_id, req)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learning record {learning_id} not found"
        )
    return updated


@router.post("/learning/correct", response_model=LearningRecordResponse)
async def apply_creator_correction(
    req: CreatorCorrectionRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
) -> LearningRecordResponse:
    service = _get_service(db, user)
    corrected = await service.apply_creator_correction(req)
    if not corrected:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learning record {req.learning_id} not found"
        )
    return corrected