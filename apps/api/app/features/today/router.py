from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user, get_db_with_user

router = APIRouter(prefix="/today", tags=["today"])


@router.get("/health")
async def today_health():
    return {"status": "ok", "feature": "today"}


@router.get("/plan")
async def get_daily_plan(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user)
):
    """Get today's content plan for authenticated user."""
    return {
        "date": "2024-01-15",
        "recommended_plan": [],
        "fallback_ideas": [],
        "total_estimated_minutes": 0,
        "message": "Creative Producer not yet implemented. Complete Phase 2."
    }