"""AI Creative Producer (Phase 4) — the decision layer.

The Producer answers "what should I work on today, and why?" and hands accepted
work to Studio. It is **not** an autonomous agent and it never generates content:
Studio owns generation, critique and refinement.

Layering, outermost first:

```text
app/features/producer/router.py    HTTP surface
app/producer/service.py            ProducerService: plan -> validate -> hand off
app/producer/planner.py            deterministic candidates, scoring and ranking
app/producer/context.py            ProducerContextAssembler -> Memory + Voice
app/producer/persistence.py        TodayRepository over the existing plan_items
app/producer/contracts.py          Pydantic contracts for the whole surface
```

Reused rather than rebuilt: `LongTermMemoryEngine`, `CreatorVoiceEngine`,
`LLMGateway`, `JobService`, the Studio capability registry, and the existing
`plan_items` table (extended by migration 007).

Rejected from the donors: their own LLM clients, their own databases, their own
auth, and any autonomous loop. See `docs/producer-donor-adaptation.md`.
"""
from app.producer.context import CreatorContext, ProducerContextAssembler
from app.producer.contracts import (
    ACTION_FOR_KIND,
    ActionKind,
    ClaimKind,
    Evidence,
    EvidenceKind,
    Priority,
    ProducerContextSummary,
    ProducerRecommendation,
    ProducerRun,
    RecommendationKind,
    TodayItem,
    TodayItemStatus,
    TodayPlan,
)
from app.producer.persistence import InvalidTransition, TodayRepository
from app.producer.planner import Candidate, ProducerPlanner
from app.producer.service import ProducerError, ProducerService, StudioHandoff

__all__ = [
    "ProducerService",
    "ProducerError",
    "StudioHandoff",
    "ProducerPlanner",
    "Candidate",
    "ProducerContextAssembler",
    "CreatorContext",
    "TodayRepository",
    "InvalidTransition",
    "ProducerRecommendation",
    "ProducerContextSummary",
    "ProducerRun",
    "Evidence",
    "EvidenceKind",
    "ClaimKind",
    "RecommendationKind",
    "ActionKind",
    "Priority",
    "TodayPlan",
    "TodayItem",
    "TodayItemStatus",
    "ACTION_FOR_KIND",
]
