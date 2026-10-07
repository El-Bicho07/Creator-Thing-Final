"""Pydantic contracts for Coach & Learning domain (Phase 6)."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class GoalCategory(str, Enum):
    SKILL = "skill"
    WORKFLOW = "workflow"
    AUDIENCE = "audience"
    CONTENT = "content"
    MONETIZATION = "monetization"
    HOOK_RETENTION = "hook_retention"
    STORYTELLING = "storytelling"
    AUDIENCE_ENGAGEMENT = "audience_engagement"
    CTA_CONVERSION = "cta_conversion"
    WORKFLOW_CONSISTENCY = "workflow_consistency"
    CONTENT_PACING = "content_pacing"
    GENERAL_IMPROVEMENT = "general_improvement"


class GoalStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"


class ProgressStatus(str, Enum):
    IMPROVING = "improving"
    STABLE = "stable"
    NEEDS_ATTENTION = "needs_attention"
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"


class SessionStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class LearningCategory(str, Enum):
    CREATOR_PREFERENCE = "creator_preference"
    CONTENT_STRENGTH = "content_strength"
    CONTENT_WEAKNESS = "content_weakness"
    WORKFLOW_PATTERN = "workflow_pattern"
    AUDIENCE_PATTERN = "audience_pattern"
    SKILL_PROGRESS = "skill_progress"
    LESSON = "lesson"


class LearningStatus(str, Enum):
    CANDIDATE = "candidate"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"
    SUPERSEDED = "superseded"


class LearningSource(str, Enum):
    EXPLICIT_INPUT = "explicit_input"
    COACHING_SESSION = "coaching_session"
    GROWTH_INSIGHT = "growth_insight"
    COMMENT_ANALYSIS = "comment_analysis"
    EXPERIMENT = "experiment"
    PERFORMANCE_RECORD = "performance_record"


# --- Goals ------------------------------------------------------------------ #

class CoachGoalCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    category: GoalCategory = GoalCategory.SKILL
    target_date: Optional[datetime] = None


class CoachGoalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    description: Optional[str] = None
    category: Optional[GoalCategory] = None
    target_date: Optional[datetime] = None
    status: Optional[GoalStatus] = None
    progress_status: Optional[ProgressStatus] = None
    progress_evidence: Optional[List[Dict[str, Any]]] = None


class CoachGoalResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    description: Optional[str] = None
    category: GoalCategory
    target_date: Optional[datetime] = None
    status: GoalStatus
    progress_status: ProgressStatus
    progress_evidence: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


# --- Sessions & Feedback ---------------------------------------------------- #

class CoachSessionCreate(BaseModel):
    topic: str = Field(..., min_length=3, max_length=255)
    goal_id: Optional[UUID] = None
    context_snapshot: Dict[str, Any] = Field(default_factory=dict)


class CoachSessionResponse(BaseModel):
    id: UUID
    user_id: UUID
    goal_id: Optional[UUID] = None
    topic: str
    context_snapshot: Dict[str, Any] = Field(default_factory=dict)
    status: SessionStatus
    created_at: datetime
    updated_at: datetime


class StructuredFeedback(BaseModel):
    observation: str
    why_it_matters: str
    what_to_improve: str
    how_to_practice: str
    what_to_try_next: str
    evidence: Dict[str, Any] = Field(default_factory=dict)


class CoachFeedbackRequest(BaseModel):
    session_id: Optional[UUID] = None
    goal_id: Optional[UUID] = None
    topic: str = Field(..., min_length=3, max_length=255)
    additional_context: Optional[str] = None


class CoachFeedbackResponse(BaseModel):
    id: UUID
    session_id: UUID
    user_id: UUID
    observation: str
    why_it_matters: str
    what_to_improve: str
    how_to_practice: str
    what_to_try_next: str
    evidence: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


# --- Learning Records ------------------------------------------------------- #

class LearningRecordCreate(BaseModel):
    category: LearningCategory
    summary: str = Field(..., min_length=3)
    detail: Optional[str] = None
    confidence: float = Field(0.5, ge=0.0, le=1.0)
    confidence_reasons: List[str] = Field(default_factory=list)
    source_type: LearningSource = LearningSource.EXPLICIT_INPUT
    source_id: Optional[str] = None
    status: LearningStatus = LearningStatus.CANDIDATE
    is_explicit: bool = False


class LearningRecordUpdate(BaseModel):
    summary: Optional[str] = Field(None, min_length=3)
    detail: Optional[str] = None
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    status: Optional[LearningStatus] = None
    is_explicit: Optional[bool] = None


class LearningRecordResponse(BaseModel):
    id: UUID
    user_id: UUID
    category: LearningCategory
    summary: str
    detail: Optional[str] = None
    confidence: float
    confidence_reasons: List[str] = Field(default_factory=list)
    source_type: LearningSource
    source_id: Optional[str] = None
    status: LearningStatus
    is_explicit: bool
    created_at: datetime
    updated_at: datetime


class CreatorCorrectionRequest(BaseModel):
    learning_id: UUID
    corrected_summary: str = Field(..., min_length=3)
    detail: Optional[str] = None
    is_explicit: bool = True


class CoachRecommendation(BaseModel):
    title: str
    description: str
    goal_id: Optional[UUID] = None
    action_type: str  # e.g., 'producer_plan', 'studio_practice'
    payload: Dict[str, Any] = Field(default_factory=dict)
