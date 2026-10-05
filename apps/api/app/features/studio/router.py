from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user, get_db_with_user

router = APIRouter(prefix="/studio", tags=["studio"])


@router.get("/health")
async def studio_health():
    return {"status": "ok", "feature": "studio"}


@router.get("/sessions")
async def list_studio_sessions(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user)
):
    """List studio sessions for authenticated user."""
    return {
        "sessions": [],
        "message": "Studio pipeline not yet implemented. Complete Phase 3."
    }


@router.post("/sessions")
async def create_studio_session(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user)
):
    """Create new studio session."""
    return {
        "session_id": "new",
        "message": "Studio pipeline not yet implemented. Complete Phase 3."
    }