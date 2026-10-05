from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user, get_db_with_user

router = APIRouter(prefix="/coach", tags=["coach"])


@router.get("/health")
async def coach_health():
    return {"status": "ok", "feature": "coach"}


@router.get("/scorecard")
async def get_scorecard(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user)
):
    """Get content scorecard for authenticated user."""
    return {
        "hook_strength": 0,
        "pacing_flow": 0,
        "voice_match": 0,
        "value_delivery": 0,
        "overall": 0,
        "message": "Coach scorecard not yet implemented. Complete Phase 6."
    }