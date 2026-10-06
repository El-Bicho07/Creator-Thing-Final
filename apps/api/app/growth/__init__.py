"""Growth domain — the platform's "Learn" step.

    performance -> analysis -> insight -> copilot -> recommendation -> Today -> Studio

Boundary summary:

- Phase 5 owns understanding: performance, insights, comments, opportunities,
  experiments, lessons, the Analytics Copilot.
- Phase 4 owns planning (Today, Producer).
- Phase 3 owns creating (Studio).
- Phase 2 owns Memory, Voice, LLM Gateway, Embedding, Jobs, RLS.

Nothing here imports a provider SDK, an embedding library, or touches `chunks`.
Every number is computed in deterministic code; the model only interprets.
"""
from app.growth.analysis import PerformanceAnalyzer, split_window
from app.growth.comments import (
    CommentAnalyzer,
    classify_heuristic,
    content_hash,
    extract_questions,
)
from app.growth.contracts import (
    CommentCategory,
    CommentIntent,
    ExperimentVerdict,
    InsightType,
    OpportunityOrigin,
    PerformanceMetric,
)
from app.growth.copilot import AnalyticsCopilot, check_no_fabrication
from app.growth.experiments import ExperimentEvaluator, LessonGenerator
from app.growth.insights import InsightGenerator, fingerprint, score_confidence
from app.growth.opportunities import OpportunityDetector
from app.growth.persistence import GrowthRepository
from app.growth.service import GrowthService

__all__ = [
    "PerformanceAnalyzer",
    "split_window",
    "CommentAnalyzer",
    "classify_heuristic",
    "content_hash",
    "extract_questions",
    "CommentCategory",
    "CommentIntent",
    "ExperimentVerdict",
    "InsightType",
    "OpportunityOrigin",
    "PerformanceMetric",
    "AnalyticsCopilot",
    "check_no_fabrication",
    "ExperimentEvaluator",
    "LessonGenerator",
    "InsightGenerator",
    "fingerprint",
    "score_confidence",
    "OpportunityDetector",
    "GrowthRepository",
    "GrowthService",
]
