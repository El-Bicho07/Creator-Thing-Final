"""Studio API and domain schemas.

Every request and response body crossing the Studio API is a Pydantic model.
Capability inputs are validated against `CapabilityRequest.input_model` *before*
any LLM call, so a malformed request fails locally with a 422 rather than costing
a generation.
"""
from __future__ import annotations

import uuid
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


# --------------------------------------------------------------------------- #
# Enums
# --------------------------------------------------------------------------- #

class SessionStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class SessionStep(str, Enum):
    CONTEXT = "context"
    GENERATE = "generate"
    REVIEW = "review"
    REFINE = "refine"
    DONE = "done"


class RefinementModifier(str, Enum):
    """Adapted from Module 18 (Guruvelah) `MODIFIER_INSTRUCTIONS`.

    The donor had exactly these four; `SHORTER`/`LONGER` were folded into
    `REFINE`'s explicit instruction. Kept as an enum so the frontend cannot
    invent an unhandled modifier.
    """
    SHORTER = "shorter"
    MORE_CASUAL = "more_casual"
    MORE_BOLD = "more_bold"
    MORE_EDUCATIONAL = "more_educational"
    SIMPLER = "simpler"


# --------------------------------------------------------------------------- #
# Sessions
# --------------------------------------------------------------------------- #

class SessionCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., min_length=1, max_length=255)
    brief: Optional[str] = Field(None, max_length=8_000)
    idea_id: Optional[uuid.UUID] = None

    @field_validator("title")
    @classmethod
    def _strip_title(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("title must not be blank")
        return cleaned


class SessionUpdateRequest(BaseModel):
    """Partial update: absent fields are left unchanged."""

    model_config = ConfigDict(extra="forbid")

    title: Optional[str] = Field(None, min_length=1, max_length=255)
    brief: Optional[str] = Field(None, max_length=8_000)
    status: Optional[SessionStatus] = None
    current_step: Optional[SessionStep] = None
    idea_id: Optional[uuid.UUID] = None

    @field_validator("title")
    @classmethod
    def _reject_blank(cls, v: Optional[str]) -> Optional[str]:
        """A present-but-blank title must be a 422, not a silent empty title.

        `Optional` means `None` (leave unchanged) is fine, so only an explicitly
        supplied blank string is rejected here.
        """
        if v is None:
            return v
        if not v.strip():
            raise ValueError("title must not be blank")
        return v.strip()


class SessionResponse(BaseModel):
    id: str
    title: str
    status: str
    current_step: str
    brief: Optional[str] = None
    idea_id: Optional[str] = None
    last_capability: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class SessionListResponse(BaseModel):
    sessions: List[SessionResponse]
    total: int


# --------------------------------------------------------------------------- #
# Generation
# --------------------------------------------------------------------------- #

class GenerationRequest(BaseModel):
    """Execute one Studio capability inside a session."""

    model_config = ConfigDict(extra="forbid")

    session_id: uuid.UUID
    capability: str = Field(..., min_length=1, max_length=60)

    #: Capability-specific payload, validated against the capability's
    #: input model. Deliberately a dict rather than a union so capabilities stay
    #: discoverable; the capability contract supplies the real schema.
    input: Dict[str, Any] = Field(default_factory=dict)

    #: Optional overrides; each capability decides which it honours.
    platform: Optional[str] = Field(None, max_length=40)
    tone: Optional[str] = Field(None, max_length=60)
    goal: Optional[str] = Field(None, max_length=40)
    duration_sec: Optional[int] = Field(None, ge=5, le=1800)

    @field_validator("capability")
    @classmethod
    def _normalise(cls, v: str) -> str:
        return v.strip().lower().replace("-", "_")


class GenerationResponse(BaseModel):
    generation_id: str
    session_id: str
    version: int
    capability: str
    asset_id: str
    output: Any
    prompt_name: Optional[str] = None
    prompt_version: Optional[str] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    input_tokens: int = 0
    output_tokens: int = 0
    estimated_cost_usd: float = 0.0
    latency_ms: int = 0
    context_summary: Dict[str, Any] = Field(default_factory=dict)
    warnings: List[str] = Field(default_factory=list)


# --------------------------------------------------------------------------- #
# Critique / refine
# --------------------------------------------------------------------------- #

class CritiqueRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: uuid.UUID
    generation_id: Optional[uuid.UUID] = None
    #: Critique this text instead of the latest generation.
    text: Optional[str] = Field(None, max_length=40_000)

    @field_validator("text")
    @classmethod
    def _nonblank(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("text must not be blank")
        return cleaned


class CritiqueSeverity(str, Enum):
    STRONG = "strong"
    MEDIUM = "medium"
    LIGHT = "light"


class CritiqueItem(BaseModel):
    dimension: str
    severity: CritiqueSeverity
    finding: str
    suggestion: str


class CritiqueResponse(BaseModel):
    generation_id: Optional[str] = None
    overall_score: float = Field(ge=0.0, le=10.0)
    verdict: str
    items: List[CritiqueItem] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    generator_id: Optional[str] = None


class RefineRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: uuid.UUID
    instruction: str = Field(..., min_length=1, max_length=4_000)
    modifier: Optional[RefinementModifier] = None
    generation_id: Optional[uuid.UUID] = None

    @field_validator("instruction")
    @classmethod
    def _strip(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("instruction must not be blank")
        return cleaned


# --------------------------------------------------------------------------- #
# Capability catalogue
# --------------------------------------------------------------------------- #

class CapabilityInfo(BaseModel):
    id: str
    name: str
    description: str
    donor: List[str] = Field(default_factory=list)
    classification: str
    requires_context: List[str] = Field(default_factory=list)
    input_schema: Dict[str, Any] = Field(default_factory=dict)
    output_schema: Dict[str, Any] = Field(default_factory=dict)
    supported_platforms: List[str] = Field(default_factory=list)
    supports_refinement: bool = False


class CapabilityListResponse(BaseModel):
    capabilities: List[CapabilityInfo]
    total: int


# --------------------------------------------------------------------------- #
# History / versions
# --------------------------------------------------------------------------- #

class VersionInfo(BaseModel):
    id: str
    version: int
    capability: str
    asset_id: str
    prompt_name: Optional[str] = None
    prompt_version: Optional[str] = None
    parent_generation_id: Optional[str] = None
    critique: Optional[Dict[str, Any]] = None
    creator_approved: bool = False
    input_tokens: int = 0
    output_tokens: int = 0
    estimated_cost_usd: float = 0.0
    latency_ms: int = 0
    text: Optional[str] = None
    created_at: Optional[str] = None


class VersionListResponse(BaseModel):
    session_id: str
    versions: List[VersionInfo]
    total: int


class ApprovalRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    approved: bool


# --------------------------------------------------------------------------- #
# Context preview
# --------------------------------------------------------------------------- #

class ContextPreviewResponse(BaseModel):
    session_id: str
    memory_used: int
    voice_available: bool
    prior_work_used: int
    retrieved_memory: str = ""
    creator_voice: str = ""
    prior_work: str = ""
    notes: List[str] = Field(default_factory=list)


__all__ = [
    "SessionStatus",
    "SessionStep",
    "RefinementModifier",
    "SessionCreateRequest",
    "SessionUpdateRequest",
    "SessionResponse",
    "SessionListResponse",
    "GenerationRequest",
    "GenerationResponse",
    "CritiqueRequest",
    "CritiqueItem",
    "CritiqueResponse",
    "CritiqueSeverity",
    "RefineRequest",
    "CapabilityInfo",
    "CapabilityListResponse",
    "VersionInfo",
    "VersionListResponse",
    "ApprovalRequest",
    "ContextPreviewResponse",
]
