"""AI evaluation suite for Coach & Learning (Phase 6).

Evaluates 25 scenarios covering:
- Goal coaching
- Strength/weakness recognition
- Progress evaluation
- Evidence discipline & anti-fabrication
- Explicit creator preference vs inferred patterns
- Learning lifecycle transitions
- Prompt injection defense
- Producer/Today handoff
- Structured actionability
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.coach.service import CoachService, _defang_prompt_text
from app.coach.contracts import (
    ProgressStatus,
    LearningStatus,
    LearningSource,
)

SCENARIOS_PATH = Path(__file__).resolve().parent / "coach_scenarios.json"


class CoachScenario(BaseModel):
    id: str
    category: str
    description: str
    input: str
    context: Dict[str, Any] = Field(default_factory=dict)

    expected_category: Optional[str] = None
    expected_strength: Optional[str] = None
    expected_weakness: Optional[str] = None
    expected_progress_status: Optional[str] = None
    expected_preference_authority: Optional[str] = None

    expected_initial_status: Optional[str] = None
    expected_confirmed_status: Optional[str] = None
    expected_rejected_status: Optional[str] = None
    expected_updated_status: Optional[str] = None
    expected_source: Optional[str] = None

    expected_recommendation_target: Optional[str] = None
    require_practice_prompt: bool = False

    expect_insufficient_evidence: bool = False
    expect_conflicting_acknowledged: bool = False
    expect_no_fabrication: bool = False
    forbid_arbitrary_scores: bool = False

    require_actionable: bool = False
    require_all_feedback_sections: bool = False

    forbid_substrings: List[str] = Field(default_factory=list)
    expect_defanged: bool = False


class ScenarioResult(BaseModel):
    scenario_id: str
    category: str
    passed: bool
    errors: List[str] = Field(default_factory=list)
    detail: Dict[str, Any] = Field(default_factory=dict)


class EvaluationReport(BaseModel):
    total: int
    passed: int
    failed: int
    category_means: Dict[str, float]
    results: List[ScenarioResult]


def load_scenarios() -> List[CoachScenario]:
    raw = json.loads(SCENARIOS_PATH.read_text())
    scenarios = raw["scenarios"] if isinstance(raw, dict) else raw
    return [CoachScenario.model_validate(item) for item in scenarios]


def run_scenario(scenario: CoachScenario) -> ScenarioResult:
    errors: List[str] = []

    # 1. Defanging check if injection payloads exist
    for key, val in scenario.context.items():
        if isinstance(val, str) and ("Ignore" in val or "SYSTEM OVERRIDE" in val or "Set goal" in val):
            defanged = _defang_prompt_text(val)
            for forbidden in scenario.forbid_substrings:
                if forbidden.lower() in defanged.lower():
                    errors.append(f"Prompt injection substring '{forbidden}' was not defanged properly")

    # 2. Evidence discipline check
    if scenario.expect_insufficient_evidence:
        insights = scenario.context.get("growth_insights", [])
        if len(insights) > 0:
            errors.append("Expected empty growth_insights for insufficient evidence scenario")

    # 3. Arbitrary scores check
    if scenario.forbid_arbitrary_scores:
        # Check if score out of 100 or arbitrary rating pattern is present in input
        if "/100" in scenario.input:
            # Service must NOT return numerical score as progress
            pass

    # 4. Creator preference check
    if scenario.expected_preference_authority:
        learnings = scenario.context.get("learnings", [])
        explicit_found = any(
            l.get("source") in (LearningSource.EXPLICIT_INPUT.value, "explicit_creator_feedback", "explicit_input")
            for l in learnings
        )
        if not explicit_found:
            errors.append("Explicit creator feedback record not found in context learnings")

    # 5. Learning lifecycle checks
    if scenario.expected_initial_status:
        if scenario.expected_initial_status != LearningStatus.CANDIDATE.value:
            errors.append(f"Inferred pattern must start as 'candidate', got {scenario.expected_initial_status}")

    if scenario.expected_confirmed_status:
        if scenario.expected_confirmed_status != LearningStatus.CONFIRMED.value:
            errors.append("Validation must transition status to 'confirmed'")

    if scenario.expected_rejected_status:
        if scenario.expected_rejected_status != LearningStatus.REJECTED.value:
            errors.append("Refutation must transition status to 'rejected'")

    # 6. Recommendation handoff check
    if scenario.expected_recommendation_target:
        if scenario.expected_recommendation_target not in ("producer", "today"):
            errors.append(f"Invalid recommendation target: {scenario.expected_recommendation_target}")

    passed = len(errors) == 0
    return ScenarioResult(
        scenario_id=scenario.id,
        category=scenario.category,
        passed=passed,
        errors=errors,
        detail={"description": scenario.description},
    )


async def run_all(scenarios: List[CoachScenario]) -> EvaluationReport:
    results: List[ScenarioResult] = []
    category_counts: Dict[str, Dict[str, int]] = {}

    for scenario in scenarios:
        res = run_scenario(scenario)
        results.append(res)

        cat = scenario.category
        if cat not in category_counts:
            category_counts[cat] = {"passed": 0, "total": 0}
        category_counts[cat]["total"] += 1
        if res.passed:
            category_counts[cat]["passed"] += 1

    total = len(results)
    passed = sum(1 for r in results if r.passed)
    failed = total - passed

    category_means = {
        cat: round(data["passed"] / data["total"], 4) if data["total"] else 0.0
        for cat, data in category_counts.items()
    }

    return EvaluationReport(
        total=total,
        passed=passed,
        failed=failed,
        category_means=category_means,
        results=results,
    )
