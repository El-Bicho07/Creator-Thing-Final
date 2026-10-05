from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user, get_db_with_user
from app.core.errors import ResourceNotFoundError

router = APIRouter(prefix="/start", tags=["start"])


@router.get("/health")
async def start_health():
    return {"status": "ok", "feature": "start"}


@router.get("/profile")
async def get_creator_profile(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user)
):
    """Get creator profile for authenticated user."""
    from sqlalchemy import select
    from app.core.db import Base
    from sqlalchemy import Column, String, Text, JSON, DateTime, ForeignKey
    from sqlalchemy.dialects.postgresql import UUID
    import uuid
    from datetime import datetime

    class CreatorProfile(Base):
        __tablename__ = "creator_profiles"
        id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
        user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
        full_name = Column(String(100), nullable=False)
        niche = Column(String(100), nullable=False)
        target_audience = Column(Text, nullable=False)
        primary_platform = Column(String(50), nullable=False)
        content_goals = Column(JSON, nullable=False, default=list)
        created_at = Column(DateTime, default=datetime.utcnow)
        updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    result = await db.execute(
        select(CreatorProfile).where(CreatorProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise ResourceNotFoundError("Creator profile not found. Complete onboarding first.")

    return {
        "id": str(profile.id),
        "full_name": profile.full_name,
        "niche": profile.niche,
        "target_audience": profile.target_audience,
        "primary_platform": profile.primary_platform,
        "content_goals": profile.content_goals,
        "created_at": profile.created_at.isoformat() if profile.created_at else None,
    }