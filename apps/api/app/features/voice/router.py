"""Platform-level Voice API (`/api/voice`).

Like the Memory API, ownership comes from the authenticated identity only: there
is no `user_id` parameter, and PostgreSQL RLS is the authoritative boundary.
"""
from __future__ import annotations

import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user, get_db_with_user
from app.voice import VoiceEngine, VoiceProfile, get_voice_engine

router = APIRouter(prefix="/voice", tags=["voice"])


# --------------------------------------------------------------------------- #
# Schemas
# --------------------------------------------------------------------------- #

class VoiceSample(BaseModel):
    text: str = Field(..., min_length=1)


class VoiceProfileCreate(BaseModel):
    samples: list[VoiceSample] = Field(..., min_length=1)
    #: Omit for the canonical "Primary Style" profile.
    style_name: Optional[str] = Field(default=None, max_length=100)
    #: Words the creator has explicitly banned. Never auto-derived.
    forbidden_words: list[str] = Field(default_factory=list)


class VoiceProfileOut(BaseModel):
    id: Optional[uuid.UUID] = None
    style_name: str
    tone_fingerprint: dict[str, Any] = Field(default_factory=dict)
    writing_characteristics: dict[str, Any] = Field(default_factory=dict)
    vocabulary_patterns: dict[str, Any] = Field(default_factory=dict)
    formatting_rules: list[str] = Field(default_factory=list)
    forbidden_words: list[str] = Field(default_factory=list)
    pacing_score: Optional[float] = None
    vocabulary_richness: Optional[float] = None
    sample_count: int = 0
    confidence: float = 0.0
    is_primary: bool = False


class VoiceProfileSummary(BaseModel):
    id: Optional[uuid.UUID] = None
    style_name: str
    tone_fingerprint: dict[str, Any] = Field(default_factory=dict)
    writing_characteristics: dict[str, Any] = Field(default_factory=dict)
    vocabulary_patterns: dict[str, Any] = Field(default_factory=dict)
    formatting_rules: list[str] = Field(default_factory=list)
    forbidden_words: list[str] = Field(default_factory=list)
    pacing_score: Optional[float] = None
    vocabulary_richness: Optional[float] = None
    sample_count: int = 0
    confidence: float = 0.0
    created_at: Optional[Any] = None
    updated_at: Optional[Any] = None


class VoiceDraftCheck(BaseModel):
    draft: str = Field(..., min_length=1)
    style_name: Optional[str] = None


class VoiceMatchOut(BaseModel):
    overall_score: float
    tone_delta: dict[str, float] = Field(default_factory=dict)
    characteristics_delta: dict[str, float] = Field(default_factory=dict)
    rule_violations: list[str] = Field(default_factory=list)
    verdict: str


class VoiceMemoryHit(BaseModel):
    memory_id: uuid.UUID
    content_asset_id: uuid.UUID
    score: float
    text: str
    source: str
    source_type: str


# --------------------------------------------------------------------------- #
# Dependencies
# --------------------------------------------------------------------------- #

def voice_engine(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
) -> VoiceEngine:
    return get_voice_engine(db, uuid.UUID(current_user.id))


# --------------------------------------------------------------------------- #
# Routes
# --------------------------------------------------------------------------- #

@router.get("/health")
async def voice_health() -> dict:
    return {"status": "ok", "service": "voice"}


@router.post("/profile", response_model=VoiceProfileOut, status_code=201)
async def create_profile(
    body: VoiceProfileCreate,
    engine: VoiceEngine = Depends(voice_engine),
) -> VoiceProfileOut:
    """Create or update a named voice profile from sample writings."""
    profile = await engine.create_profile_from_samples(
        [s.text for s in body.samples],
        style_name=body.style_name,
        forbidden_words=body.forbidden_words,
    )
    stored = await engine.get_profile(profile.style_name)
    return VoiceProfileOut(
        id=stored["id"] if stored else None,
        style_name=profile.style_name,
        tone_fingerprint=profile.tone_fingerprint,
        writing_characteristics=profile.writing_characteristics,
        vocabulary_patterns=profile.vocabulary_patterns,
        formatting_rules=profile.formatting_rules,
        forbidden_words=profile.forbidden_words,
        pacing_score=stored["pacing_score"] if stored else None,
        vocabulary_richness=stored["vocabulary_richness"] if stored else None,
        sample_count=profile.sample_count,
        confidence=profile.confidence,
        is_primary=profile.style_name == VoiceEngine.PRIMARY_STYLE,
    )


@router.get("/profile", response_model=VoiceProfileSummary)
async def get_primary_profile(
    engine: VoiceEngine = Depends(voice_engine),
) -> VoiceProfileSummary:
    stored = await engine.get_profile()
    if stored is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No voice profile yet for the authenticated creator",
        )
    payload = dict(stored)
    payload["is_primary"] = payload["style_name"] == VoiceEngine.PRIMARY_STYLE
    return VoiceProfileSummary(**payload)


@router.get("/profile/{style_name}", response_model=VoiceProfileSummary)
async def get_named_profile(
    style_name: str,
    engine: VoiceEngine = Depends(voice_engine),
) -> VoiceProfileSummary:
    stored = await engine.get_profile(style_name)
    if stored is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Voice profile not found for the authenticated creator",
        )
    payload = dict(stored)
    payload["is_primary"] = style_name == VoiceEngine.PRIMARY_STYLE
    return VoiceProfileSummary(**payload)


@router.get("/profiles", response_model=list[VoiceProfileSummary])
async def list_profiles(
    engine: VoiceEngine = Depends(voice_engine),
) -> list[VoiceProfileSummary]:
    return [VoiceProfileSummary(**p) for p in await engine.list_profiles()]


@router.delete("/profile/{style_name}")
async def delete_profile(
    style_name: str,
    engine: VoiceEngine = Depends(voice_engine),
) -> dict:
    result = await engine.delete_profile(style_name)
    if not result["profiles_deleted"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Voice profile not found for the authenticated creator",
        )
    return result


@router.post("/validate", response_model=VoiceMatchOut)
async def validate_draft(
    body: VoiceDraftCheck,
    engine: VoiceEngine = Depends(voice_engine),
) -> VoiceMatchOut:
    """Score a draft against the creator's stored voice profile."""
    match = await engine.validate_draft(body.draft, body.style_name)
    if match.verdict == "no_profile":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Create a voice profile before validating drafts",
        )
    return VoiceMatchOut(**match.model_dump())


@router.get("/similar-memories", response_model=list[VoiceMemoryHit])
async def similar_memories(
    q: str,
    top_k: int = 5,
    engine: VoiceEngine = Depends(voice_engine),
) -> list[VoiceMemoryHit]:
    """Voice-aware memory retrieval over the unified pgvector store."""
    hits = await engine.similar_memories(q, top_k=top_k)
    return [VoiceMemoryHit(**h) for h in hits]


@router.get("/profile-summary")
async def profile_summary(
    style_name: Optional[str] = None,
    engine: VoiceEngine = Depends(voice_engine),
) -> dict:
    """Natural-language summary, generated through the shared LLM Gateway."""
    profile = await engine.get_profile(style_name)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Voice profile not found for the authenticated creator",
        )
    from app.voice.engine import VoiceProfile as VP

    summary = await engine.synthesize_profile_summary(
        VP(
            style_name=profile["style_name"],
            tone_fingerprint=profile["tone_fingerprint"] or {},
            writing_characteristics=profile["writing_characteristics"] or {},
            vocabulary_patterns=profile["vocabulary_patterns"] or {},
            formatting_rules=profile["formatting_rules"] or [],
            forbidden_words=profile["forbidden_words"] or [],
            sample_count=profile["sample_count"],
            confidence=profile["confidence"],
        )
    )
    return {"style_name": profile["style_name"], "summary": summary}