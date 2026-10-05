from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user, get_db_with_user

router = APIRouter(prefix="/growth", tags=["growth"])


@router.get("/health")
async def growth_health():
    return {"status": "ok", "feature": "growth"}


@router.get("/analytics")
async def get_growth_analytics(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user)
):
    """Get growth analytics for authenticated user."""
    return {
        "metrics": {},
        "comment_themes": [],
        "content_opportunities": [],
        "message": "Growth analytics not yet implemented. Complete Phase 5."
    }