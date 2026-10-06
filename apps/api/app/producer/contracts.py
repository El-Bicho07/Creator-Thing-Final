"""Producer and Today domain contracts (Phase 4).

The Producer emits **structured** recommendations, never prose the frontend has to
parse. Two donor ideas are encoded here:

1. **Citation forcing** — adapted from Module 21 `packages/schemas/src/entities.ts:96`,
   where `PlanClaimSchema.refine(v => v.citationIds.length > 0)` made an unsupported
   claim structurally impossible. Here, `ProducerRecommendation.evidence` is
   required and every reference must name a real platform record.

2. **Anti-fabrication** — adapted from Module 21
   `packages/skills/src/validators/index.ts:14`, which rejected a statistic with no
   provenance. `ClaimKind` distinguishes an OBSERVED fact (traceable to creator
   evidence) from a SUGGESTION (the Producer's own judgement). A recommendation may
   only state an observed fact if its evidence supports it.

The Producer is a **decision** layer. It never generates content; that is Studio's
job. `ProducerRecommendation.suggested_capability` names a Studio capability, and
executing a recommendation hands off to Studio rather than duplicating it.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


# --------------------------------------------------------------------------- #
# Enums
# --------------------------------------------------------------------------- #

class TodayItemStatus(str, Enum):
    """Today item lifecycle.

    `skipped` and `blocked` are deliberately distinct from `completed`: "I decided
    not to" and "I couldn't" are different answers, and collapsing them into a
    boolean loses the signal a creator needs to plan tomorrow.
    """

    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"
    BLOCKED = "blocked"


#: Legal transitions. Enforced in the service layer, not only by the DB CHECK, so
#: an illegal transition returns a 409 with an explanation instead of a constraint
#: error.
ALLOWED_TRANSITIONS: Dict[TodayItemStatus, set[TodayItemStatus]] = {
    TodayItemStatus.PLANNED: {
        TodayItemStatus.IN_PROGRESS,
        TodayItemStatus.COMPLETED,
        TodayItemStatus.SKIPPED,
        TodayItemStatus.BLOCKED,
    },
    TodayItemStatus.IN_PROGRESS: {
        TodayItemStatus.COMPLETED,
        TodayItemStatus.SKIPPED,
        TodayItemStatus.BLOCKED,
    },
    # Terminal-ish states may be reopened: a creator who "skipped" yesterday's
    # item and changed their mind should not be locked out.
    TodayItemStatus.BLOCKED: {
        TodayItemStatus.PLANNED,
        TodayItemStatus.IN_PROGRESS,
        TodayItemStatus.SKIPPED,
    },
    TodayItemStatus.SKIPPED: {
        TodayItemStatus.PLANNED,
        TodayItemStatus.IN_PROGRESS,
    },
    # Completed work is never silently reopened by a state change; it must be
    # explicitly reset. This protects the creator's record of what shipped.
    TodayItemStatus.COMPLETED: set(),
}


class ActionKind(str, Enum):
    """What the creator is being asked to DO.

    The first three are Module 04's 3-slot day decomposition (`src/types/index.ts:22`:
    `main` / `quick` / `trust`), kept because a day's plan should be *feasible*:
    one substantial piece, one low-effort engagement beat, one depth-over-volume
    beat. The rest reflect states a Studio session naturally has.
    """

    CREATE_CONTENT = "create_content"      # main slot
    QUICK_ENGAGE = "quick_engage"          # quick slot
    BUILD_TRUST = "build_trust"            # trust slot
    CONTINUE_DRAFT = "continue_draft"      # resume unfinished Studio work
    REFINE_CONTENT = "refine_content"      # iterate an existing version
    REPURPOSE = "repurpose"                # adapt to another platform
    REVIEW_IDEA = "review_idea"            # triage an idea before making it
    PUBLISH_PREP = "publish_prep"          # prepare a publish-ready asset


#: Module 04's slot taxonomy, preserved as a display concept.
SLOT_BY_ACTION: Dict[ActionKind, str] = {
    ActionKind.CREATE_CONTENT: "main",
    ActionKind.BUILD_TRUST: "trust",
    ActionKind.QUICK_ENGAGE: "quick",
    ActionKind.CONTINUE_DRAFT: "main",
    ActionKind.REFINE_CONTENT: "main",
    ActionKind.REPURPOSE: "quick",
    ActionKind.REVIEW_IDEA: "quick",
    ActionKind.PUBLISH_PREP: "trust",
}


class Priority(str, Enum):
    """Module 04's goal/priority vocabulary (`src/types/index.ts:2`)."""

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


#: Numeric priority, so `plan_items.priority` (an existing integer column) stays
#: meaningful and orderings work in SQL rather than only in Python.
PRIORITY_VALUE: Dict[Priority, int] = {
    Priority.HIGH: 1,
    Priority.MEDIUM: 5,
    Priority.LOW: 9,
}


class ClaimKind(str, Enum):
    """Whether a reason is an observed fact or the Producer's judgement.

    This is the anti-fabrication boundary. `OBSERVED` requires evidence;
    `SUGGESTION` must be phrased as advice, never as a claim about the creator's
    history.
    """

    OBSERVED = "observed"
    SUGGESTION = "suggestion"


class EvidenceKind(str, Enum):
    """What a piece of evidence actually is.

    Every value names a real platform record, so a recommendation can be traced
    back to something the creator owns. Module 21's equivalent was a URL list whose
    members were never checked against anything; here each reference is resolved
    at validation time.
    """

    MEMORY = "memory"                 # a retrieved memory chunk
    CONTENT_ASSET = "content_asset"   # generated or stored content
    STUDIO_GENERATION = "studio_generation"
    IDEA = "idea"
    CREATOR_PROFILE = "creator_profile"
    VOICE_PROFILE = "voice_profile"
    PERFORMANCE = "performance_record"
    TODAY_ITEM = "today_item"


class RecommendationKind(str, Enum):
    """What the Producer is proposing.

    `NO_ACTION` is a first-class outcome. The Producer must be able to say that
    nothing meaningful is worth doing today rather than fabricate a suggestion --
    both donors failed this: Module 04 always emitted items, and Module 21's
    planner always produced a plan.
    """

    CREATE = "create"
    CONTINUE = "continue"
    REFINE = "refine"
    REPURPOSE = "repurpose"
    TRIAGE_IDEA = "triage_idea"
    QUICK_ENGAGE = "quick_engage"
    BUILD_TRUST = "build_trust"
    NO_ACTION = "no_action"


#: Which Studio capability best serves each recommendation kind. The Producer maps
#: kind -> capability; it never invents a capability id. This mapping is validated
#: against the live Studio registry at execution time.
CAPABILITY_FOR_KIND: Dict[RecommendationKind, Optional[str]] = {
    RecommendationKind.CREATE: "idea",
    RecommendationKind.CONTINUE: "script",
    RecommendationKind.REFINE: "refine",
    RecommendationKind.REPURPOSE: "repurpose",
    RecommendationKind.TRIAGE_IDEA: "idea",
    RecommendationKind.QUICK_ENGAGE: "caption",
    RecommendationKind.BUILD_TRUST: "script",
    RecommendationKind.NO_ACTION: None,
}


ACTION_FOR_KIND: Dict[RecommendationKind, ActionKind] = {
    RecommendationKind.CREATE: ActionKind.CREATE_CONTENT,
    RecommendationKind.CONTINUE: ActionKind.CONTINUE_DRAFT,
    RecommendationKind.REFINE: ActionKind.REFINE_CONTENT,
    RecommendationKind.REPURPOSE: ActionKind.REPURPOSE,
    RecommendationKind.TRIAGE_IDEA: ActionKind.REVIEW_IDEA,
    RecommendationKind.QUICK_ENGAGE: ActionKind.QUICK_ENGAGE,
    RecommendationKind.BUILD_TRUST: ActionKind.BUILD_TRUST,
    RecommendationKind.NO_ACTION: ActionKind.REVIEW_IDEA,
}


# --------------------------------------------------------------------------- #
# Evidence
# --------------------------------------------------------------------------- #

class Evidence(BaseModel):
    """One traceable input to a recommendation.

    Module 21 forced `citationIds` to be non-empty but never checked that an id
    resolved to anything. `validate_evidence` below resolves each reference against
    a real table, so a fabricated citation fails instead of looking legitimate.
    """

    model_config = ConfigDict(extra="forbid")

    kind: EvidenceKind
    ref_id: str
    summary: str = Field(default="", max_length=600)

    @field_validator("ref_id")
    @classmethod
    def _non_empty(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("evidence ref_id must not be blank")
        return cleaned


# --------------------------------------------------------------------------- #
# Recommendation
# --------------------------------------------------------------------------- #

class ProducerRecommendation(BaseModel):
    """A structured, validated proposal.

    The frontend never parses prose to decide what to do: it renders this.
    """

    model_config = ConfigDict(extra="forbid")

    kind: RecommendationKind
    title: str = Field(..., min_length=1, max_length=255)
    reason: str = Field(..., min_length=1, max_length=2_000)
    reason_kind: ClaimKind = ClaimKind.SUGGESTION

    priority: Priority = Priority.MEDIUM
    action_kind: ActionKind = ActionKind.CREATE_CONTENT
    estimated_minutes: int = Field(default=30, ge=5, le=600)

    #: A Studio capability id, or None for NO_ACTION. Validated against the live
    #: Studio registry when the plan is persisted, so the Producer cannot invent
    #: a capability.
    suggested_capability: Optional[str] = Field(default=None, max_length=60)

    platform: str = Field(default="reel", max_length=40)

    #: Where the creator should go next. A Studio route when a capability applies.
    next_action: str = Field(default="review", max_length=80)

    #: Mandatory. A recommendation with no evidence is not persisted -- this is the
    #: Module 21 citation-forcing pattern, made resolvable.
    evidence: List[Evidence] = Field(default_factory=list)

    #: Free-form trace of the scoring that produced this, for explainability.
    signals: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("title")
    @classmethod
    def _strip_title(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("title must not be blank")
        return cleaned

    @field_validator("reason")
    @classmethod
    def _strip_reason(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("reason must not be blank")
        return cleaned

    def model_post_init(self, _context: Any) -> None:
        """Fill derived fields so callers cannot produce an inconsistent record."""
        if self.suggested_capability is None and self.kind is not RecommendationKind.NO_ACTION:
            object.__setattr__(self, "suggested_capability", CAPABILITY_FOR_KIND.get(self.kind))
        if self.next_action == "review" and self.suggested_capability:
            object.__setattr__(self, "next_action", "studio")

    @property
    def is_actionable(self) -> bool:
        return self.kind is not RecommendationKind.NO_ACTION


# --------------------------------------------------------------------------- #
# Plan + context
# --------------------------------------------------------------------------- #

class ProducerContextSummary(BaseModel):
    """Non-sensitive provenance returned to the client.

    Deliberately counts and flags, never the creator's actual memory or content
    text: the response is logged and rendered, and the content itself is already
    visible in the Studio workspace it came from.
    """

    has_profile: bool = False
    has_voice: bool = False
    memory_chunks: int = 0
    unfinished_generations: int = 0
    open_ideas: int = 0
    recent_assets: int = 0
    performance_records: int = 0
    days_since_last_plan: Optional[int] = None
    notes: List[str] = Field(default_factory=list)


class TodayPlan(BaseModel):
    """A day's plan."""

    plan_date: date
    items: List["TodayItem"] = Field(default_factory=list)
    total_estimated_minutes: int = 0
    generated_at: Optional[datetime] = None
    producer_run_id: Optional[uuid.UUID] = None
    notes: List[str] = Field(default_factory=list)

    @property
    def priority_item(self) -> Optional["TodayItem"]:
        """The single thing to do first."""
        actionable = [
            i for i in self.items
            if i.status in (TodayItemStatus.PLANNED, TodayItemStatus.IN_PROGRESS)
        ]
        return actionable[0] if actionable else None


class TodayItem(BaseModel):
    """One unit of planned work (a `plan_items` row)."""

    model_config = ConfigDict(extra="forbid")

    id: uuid.UUID
    plan_date: date
    title: str
    status: TodayItemStatus = TodayItemStatus.PLANNED
    priority: Priority = Priority.MEDIUM
    priority_rank: int = 0
    rank: int = 0
    action_kind: Optional[ActionKind] = None
    capability: Optional[str] = None
    platform: str = "reel"
    estimated_minutes: int = 30
    reason: Optional[str] = None
    reason_kind: Optional[ClaimKind] = None
    source: str = "creator"
    idea_id: Optional[uuid.UUID] = None
    studio_session_id: Optional[uuid.UUID] = None
    generation_id: Optional[uuid.UUID] = None
    dedupe_key: Optional[str] = None
    evidence: List[Evidence] = Field(default_factory=list)
    recommendation: Optional[ProducerRecommendation] = None
    completed: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ProducerRun(BaseModel):
    """The outcome of one planning pass, mirrored into a `jobs` row.

    A run is a job, not a table: `jobs` already records type, status, progress,
    error and metadata, and `JobService` already implements claim/retry/cancel. A
    parallel run table would be a second observability stack (task §25).
    """

    job_id: Optional[uuid.UUID] = None
    plan_date: date
    status: str = "completed"
    recommendations: int = 0
    created_items: int = 0
    skipped_duplicates: int = 0
    latency_ms: int = 0
    notes: List[str] = Field(default_factory=list)


TodayPlan.model_rebuild()


# --------------------------------------------------------------------------- #
# API response contracts
#
# Phase 4 endpoints originally returned Dict[str, Any], which meant FastAPI emitted
# no schemas for the Today/Producer surface at all and the frontend could not
# generate types from the contract (task §20/§27). These models are the wire
# contract.
# --------------------------------------------------------------------------- #

class TodayPlanResponse(BaseModel):
    date: date
    items: List[TodayItem] = Field(default_factory=list)
    total: int = 0
    total_estimated_minutes: int = 0
    priority_item_id: Optional[str] = None
    counts: Dict[str, int] = Field(default_factory=dict)
    notes: List[str] = Field(default_factory=list)
    run: Optional["ProducerRun"] = None


class PlanResultResponse(BaseModel):
    """Response of `POST /api/today/plan`, sync or job-backed."""
    date: date
    items: List[TodayItem] = Field(default_factory=list)
    total: int = 0
    total_estimated_minutes: int = 0
    notes: List[str] = Field(default_factory=list)
    run: ProducerRun
    #: Present only for the asynchronous path.
    job_id: Optional[str] = None
    job_status: Optional[str] = None


class RecommendResponse(BaseModel):
    date: date
    recommendations: List[ProducerRecommendation] = Field(default_factory=list)
    total: int = 0
    has_action: bool = False
    context: ProducerContextSummary
    run: ProducerRun
    #: Always populated when `has_action` is false, so an empty plan is explained.
    message: str = ""


class ExecuteResponse(BaseModel):
    """The Studio handoff. Note this contains NO generated content."""
    item_id: str
    studio_session_id: str
    capability: str
    input: Dict[str, Any]
    session_created: bool
    studio_url: str
    message: str


class CarryoverItem(BaseModel):
    id: str
    plan_date: date
    title: str
    status: str
    action_kind: Optional[str] = None
    reason: Optional[str] = None


class CarryoverResponse(BaseModel):
    items: List[CarryoverItem] = Field(default_factory=list)
    days_since_last_plan: Optional[int] = None


TodayPlanResponse.model_rebuild()
PlanResultResponse.model_rebuild()


__all__ = [
    "TodayPlanResponse",
    "PlanResultResponse",
    "RecommendResponse",
    "ExecuteResponse",
    "CarryoverItem",
    "CarryoverResponse",
    "TodayItemStatus",
    "ALLOWED_TRANSITIONS",
    "ActionKind",
    "SLOT_BY_ACTION",
    "Priority",
    "PRIORITY_VALUE",
    "ClaimKind",
    "EvidenceKind",
    "RecommendationKind",
    "CAPABILITY_FOR_KIND",
    "ACTION_FOR_KIND",
    "Evidence",
    "ProducerRecommendation",
    "ProducerContextSummary",
    "ProducerRun",
    "TodayPlan",
    "TodayItem",
]
