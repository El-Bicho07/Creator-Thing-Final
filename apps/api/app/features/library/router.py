from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user, get_db_with_user

router = APIRouter(prefix="/library", tags=["library"])


@router.get("/health")
async def library_health():
    return {"status": "ok", "feature": "library"}


@router.get("/assets")
async def list_content_assets(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user)
):
    """List content assets for authenticated user."""
    return {
        "assets": [],
        "message": "Library/Memory engine not yet implemented. Complete Phase 2."
    }


@router.get("/search")
async def search_memory(
    q: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user)
):
    """Semantic search across user's content memory."""
    return {
        "query": q,
        "results": [],
        "message": "Memory search not yet implemented. Complete Phase 2."
    }