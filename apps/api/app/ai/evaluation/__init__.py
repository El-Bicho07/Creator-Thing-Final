"""Platform-wide AI evaluation framework (foundation for Phase 2+)."""
from app.ai.evaluation.framework import (
    EvaluationSuite,
    ExpectedAssetRetrieved,
    ForbiddenFactsAbsent,
    Metric,
    PrecisionAtK,
    RequiredFactsPresent,
    RetrievalMargin,
    Scenario,
    ScenarioCategory,
    ScenarioResult,
    TopHitAccuracy,
    VoiceMatchScore,
)

__all__ = [
    "EvaluationSuite", "Scenario", "ScenarioCategory", "ScenarioResult",
    "Metric", "TopHitAccuracy", "ExpectedAssetRetrieved", "PrecisionAtK",
    "RetrievalMargin", "VoiceMatchScore", "RequiredFactsPresent",
    "ForbiddenFactsAbsent",
]
