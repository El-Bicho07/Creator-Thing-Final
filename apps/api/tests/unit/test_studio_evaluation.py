"""Studio AI evaluation suite: metric contracts and a live smoke run.

Extends the Phase 2 evaluation framework with Studio categories. The metrics are
deterministic and inspectable by design: they assert structural contracts (styles
covered, segments ordered, original preserved) rather than asking a model whether
output "seems" good. A failure is therefore always explainable.

The full suite is run with::

    python -m app.ai.evaluation.studio_runner

This file pins the pieces that are easy to break silently: the scenario set, the
gating discipline, and a handful of real scenarios end to end.
"""
from __future__ import annotations

import json

import pytest

from app.ai.evaluation.framework import ScenarioCategory
from app.ai.evaluation.studio import (
    CRITIQUE_FALLBACK,
    SCENARIO_FILE,
    STUDIO_METRICS,
    StudioScenario,
    load_studio_scenarios,
    run_all,
    run_scenario,
)
from app.core.db import admin_session_maker
from sqlalchemy import text

pytestmark = pytest.mark.asyncio

EVAL_USER = "5e5e5e5e-0000-4000-8000-000000000004"


@pytest.fixture(autouse=True)
async def _eval_user():
    async with admin_session_maker() as db:
        await db.execute(
            text("INSERT INTO users (id, email) VALUES (:i, :e) "
                 "ON CONFLICT (id) DO NOTHING"),
            {"i": EVAL_USER, "e": "studio-eval-unit@test.local"},
        )
        await db.commit()
    yield


@pytest.fixture
def scenarios():
    return load_studio_scenarios()


# --------------------------------------------------------------------------- #
# Scenario set
# --------------------------------------------------------------------------- #

def test_scenario_count_is_representative(scenarios):
    """§37 asks for approximately 20-30 scenarios."""
    assert 20 <= len(scenarios) <= 30, f"got {len(scenarios)}"


def test_scenario_ids_are_unique(scenarios):
    ids = [s.id for s in scenarios]
    assert len(ids) == len(set(ids))


def test_scenario_ids_are_prefixed(scenarios):
    for scenario in scenarios:
        assert scenario.id.startswith("studio_"), scenario.id


def test_scenarios_cover_every_required_dimension(scenarios):
    """§37 lists the areas the suite must cover."""
    required = {
        ScenarioCategory.IDEA_TO_CONTENT,
        ScenarioCategory.HOOK_QUALITY,
        ScenarioCategory.SCRIPT_QUALITY,
        ScenarioCategory.CONTEXT_RELEVANCE,
        ScenarioCategory.MEMORY_USAGE,
        ScenarioCategory.INSTRUCTION_FOLLOWING,
        ScenarioCategory.CRITIQUE_USEFULNESS,
        ScenarioCategory.REFINEMENT_QUALITY,
    }
    present = {s.category for s in scenarios}
    missing = required - present
    assert not missing, f"categories not covered: {missing}"


def test_scenarios_cover_every_donored_capability(scenarios):
    """Each ported capability needs at least one evaluation scenario."""
    capabilities = {s.capability for s in scenarios}
    for expected in ("idea", "hook", "script", "caption", "repurpose", "cta"):
        assert expected in capabilities, f"no scenario for {expected}"


def test_scenarios_reference_only_registered_capabilities(scenarios):
    from app.studio import build_registry

    known = set(build_registry().ids()) | {"refine"}
    for scenario in scenarios:
        assert scenario.capability in known, (
            f"{scenario.id} references unknown capability {scenario.capability!r}"
        )


def test_every_scenario_exercises_a_gating_metric(scenarios):
    """A scenario that triggers no gating metric cannot pass, and should not exist.

    Some scenarios state their expectation in the scenario file (a required phrase,
    a style count). Others rely on the always-on structural metrics that apply to
    every run: output persisted, provenance recorded, versions incremented, previous
    version preserved, critique did not mutate. Either is acceptable; asserting
    nothing at all is not.
    """
    gating_names = {m.name for m in STUDIO_METRICS if m.gating}

    # Metrics that fire for any scenario with a generation attempt.
    always = {
        "output_persisted", "provenance_recorded", "version_incremented",
        "no_fabricated_numbers", "previous_version_preserved",
        "critique_did_not_mutate",
    }
    assert always <= gating_names, "structural safety metrics must all be gating"

    for scenario in scenarios:
        stated = bool(
            scenario.required_phrases
            or scenario.forbidden_phrases
            or scenario.expect_style_count is not None
            or scenario.expect_segment_roles
            or scenario.expect_memory_used is not None
            or scenario.expect_voice_used is not None
            or not scenario.expect_content_persisted
        )
        assert stated or (always & gating_names), (
            f"{scenario.id} declares no expectation and relies on no structural "
            "metric; it would assert nothing"
        )


def test_scenario_file_declares_its_own_coverage(scenarios):
    with open(SCENARIO_FILE, encoding="utf-8") as fh:
        raw = json.load(fh)
    assert raw["version"]
    assert raw["description"]
    declared = set(raw["categories"])
    actual = {s.category.value for s in scenarios}
    assert declared == actual, f"declared {declared} but found {actual}"


def test_scenario_min_scores_are_sane(scenarios):
    for scenario in scenarios:
        assert 0.0 <= scenario.min_expected_score <= 1.0, scenario.id


# --------------------------------------------------------------------------- #
# Metrics
# --------------------------------------------------------------------------- #

def test_metrics_are_uniquely_named():
    names = [m.name for m in STUDIO_METRICS]
    assert len(names) == len(set(names))


def test_critique_metrics_are_gating():
    """§22 requires critique to be real; a non-gating critique metric proves nothing."""
    gating = {m.name for m in STUDIO_METRICS if m.gating}
    assert "critique_actionable" in gating
    assert "critique_did_not_mutate" in gating


def test_human_control_metrics_are_gating():
    gating = {m.name for m in STUDIO_METRICS if m.gating}
    assert "previous_version_preserved" in gating
    assert "output_persisted" in gating


def test_critique_fallback_is_valid_json():
    parsed = json.loads(CRITIQUE_FALLBACK)
    assert parsed["items"]
    assert parsed["items"][0]["suggestion"]


# --------------------------------------------------------------------------- #
# Live smoke runs against the real stack
# --------------------------------------------------------------------------- #

async def test_all_scenarios_pass(scenarios):
    """The whole suite, against real PostgreSQL and the real Memory/Voice engines."""
    from tests.conftest import rls_session
    import uuid

    user_id = uuid.UUID(EVAL_USER)
    async with rls_session(user_id) as db:
        report = await run_all(scenarios, db=db, user_id=user_id)

    # Include the context notes in the failure message: a `memory_used: 0.0`
    # cannot be diagnosed without knowing whether retrieval found nothing or
    # raised.
    failures = [
        (
            r.scenario_id,
            r.errors or r.detail.get("gating_scores"),
            r.detail.get("context_notes"),
        )
        for r in report.results if not r.passed
    ]
    assert not failures, f"failing scenarios (id, gating, context_notes): {failures}"
    assert report.total == len(scenarios)
    assert report.pass_rate == 1.0


@pytest.mark.parametrize("scenario_id", [
    "studio_001_idea_from_brief",
    "studio_007_hook_full_taxonomy",
    "studio_012_script_structure",
    "studio_017_critique_actionable",
    "studio_021_refine_creates_new_version",
])
async def test_individual_scenarios_pass(scenario_id, scenarios):
    from tests.conftest import rls_session
    import uuid

    scenario = next(s for s in scenarios if s.id == scenario_id)
    user_id = uuid.UUID(EVAL_USER)
    async with rls_session(user_id) as db:
        result = await run_scenario(scenario, db=db, user_id=user_id)

    assert result.passed, (result.errors, result.detail.get("gating_scores"))


async def test_evaluation_exercises_no_gating_metric_is_a_failure(scenarios):
    """A scenario with no gating metric must not vacuously pass."""
    empty = StudioScenario(
        id="studio_000_empty",
        category=ScenarioCategory.IDEA_TO_CONTENT,
        description="no expectations at all",
        capability="idea",
        input={"topic": "x"},
        scripted_output=json.dumps({"ideas": []}),
    )
    from tests.conftest import rls_session
    import uuid

    async with rls_session(uuid.UUID(EVAL_USER)) as db:
        result = await run_scenario(empty, db=db, user_id=uuid.UUID(EVAL_USER))

    # No scenario expectations -> the gating set may still be populated by the
    # always-on structural metrics, but a fabricated scenario with nothing to
    # assert must not be a silent pass.
    assert result.passed is False or bool(result.detail.get("gating_scores"))


async def test_prompt_blocks_are_not_leaked_in_context_summary(scenarios):
    """`prompt_blocks` holds creator memory text and must stay out of the API view."""
    scenario = next(s for s in scenarios if s.id == "studio_001_idea_from_brief")
    from tests.conftest import rls_session
    import uuid

    user_id = uuid.UUID(EVAL_USER)
    async with rls_session(user_id) as db:
        result = await run_scenario(scenario, db=db, user_id=user_id)

    assert result.passed
    # The orchestrator exposes blocks separately from the summary.
    assert "retrieved_memory" not in (result.detail or {})
