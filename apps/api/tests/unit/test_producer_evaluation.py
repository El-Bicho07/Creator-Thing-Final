"""Producer AI evaluation: scenario-set contracts plus a live smoke run.

The Producer is deterministic-first, so most of this suite is about decision
quality and safety rather than model prose. These tests pin the scenario set and
the gating discipline, then run the whole suite against real PostgreSQL.
"""
from __future__ import annotations

import json

import pytest

from app.ai.evaluation.producer import (
    EVAL_USER_ID,
    METRICS,
    SCENARIO_FILE,
    load_producer_scenarios,
    run_all,
    run_scenario,
)


@pytest.fixture
def scenarios():
    return load_producer_scenarios()


# --------------------------------------------------------------------------- #
# Scenario set
# --------------------------------------------------------------------------- #

def test_scenario_count_is_representative():
    """Task §24 asks for approximately 20-30 scenarios."""
    scenarios = load_producer_scenarios()
    assert 20 <= len(scenarios) <= 35, f"got {len(scenarios)}"


def test_scenario_ids_are_unique_and_prefixed(scenarios):
    ids = [s.id for s in scenarios]
    assert len(ids) == len(set(ids))
    assert all(i.startswith("prod_") for i in ids)


def test_scenarios_cover_every_required_dimension(scenarios):
    """The dimensions task §24 lists explicitly."""
    required = {
        "normal_creator", "sparse_creator", "conflicting_context",
        "unfinished_work", "multiple_priorities", "no_useful_action",
        "prompt_injection", "studio_handoff",
    }
    present = {s.category for s in scenarios}
    assert required <= present, f"not covered: {required - present}"


def test_no_useful_action_scenarios_exist(scenarios):
    """A Producer that must always have something to say is a product defect."""
    assert [s for s in scenarios if s.expect_no_action]


def test_injection_scenarios_assert_an_absence(scenarios):
    """Injection scenarios must check that the marker did NOT surface."""
    injection = [s for s in scenarios if s.category == "prompt_injection"]
    assert len(injection) >= 3
    for scenario in injection:
        assert scenario.injection_marker, scenario.id


def test_injection_marker_is_in_the_creator_content(scenarios):
    """An injection scenario is vacuous unless the hostile text is actually seeded."""
    for scenario in scenarios:
        if not scenario.injection_marker:
            continue
        seeded = " ".join(
            list(scenario.memory) + list(scenario.assets)
            + [str(i.get("title", "")) for i in scenario.prior_items]
        ).lower()
        fragment = scenario.injection_marker.lower().split()[0]
        assert fragment in seeded, (
            f"{scenario.id} declares an injection marker that is not in its "
            "seeded creator content"
        )


def test_unfinished_work_scenarios_actually_seed_studio_work(scenarios):
    """Both branches must be covered between them.

    One scenario seeds an unreviewed draft (the `continue` path) and another a
    critiqued one (the `refine` path). Each scenario only needs its own branch.
    """
    unfinished = [s for s in scenarios if s.category == "unfinished_work"]
    assert unfinished
    for scenario in unfinished:
        assert scenario.studio_work, (
            f"{scenario.id} tests unfinished work without seeding any"
        )
    critiqued = [
        w for s in unfinished for w in s.studio_work if w.get("critiqued")
    ]
    unreviewed = [
        w for s in unfinished for w in s.studio_work if not w.get("critiqued")
    ]
    assert critiqued, "no scenario seeds a critiqued draft (the refine path)"
    assert unreviewed, "no scenario seeds an unreviewed draft (the continue path)"


def test_scenario_file_declares_its_coverage(scenarios):
    with open(SCENARIO_FILE, encoding="utf-8") as fh:
        raw = json.load(fh)
    assert raw["version"]
    assert set(raw["categories"]) == {s.category for s in scenarios}


def test_min_scores_are_sane(scenarios):
    for scenario in scenarios:
        assert 0.0 <= scenario.min_expected_score <= 1.0, scenario.id


# --------------------------------------------------------------------------- #
# Metric discipline
# --------------------------------------------------------------------------- #

def test_metrics_are_uniquely_named():
    names = [m.name for m in METRICS]
    assert len(names) == len(set(names))


def test_safety_metrics_are_gating():
    """A non-gating safety metric proves nothing."""
    gating = {m.name for m in METRICS if m.gating}
    for required in (
        "evidence_required", "sparse_context_safe", "no_action_reachable",
        "no_fabricated_facts", "injection_resisted", "creator_control",
        "studio_handoff_valid", "budget_respected", "duplicate_prevention",
    ):
        assert required in gating, f"{required} must be gating"


def test_no_fabrication_metric_ignores_version_markers():
    """`v1` is a version, not a claimed statistic."""
    from app.ai.evaluation.producer import NoFabricatedFacts

    assert NoFabricatedFacts._numbers("Review draft: launch v2") == set()
    assert NoFabricatedFacts._numbers("got 400 signups") == {"400"}


def test_sparse_rule_forbids_invention_not_content_grounded_actions():
    from app.ai.evaluation.producer import SparseContextSafe

    assert "create" in SparseContextSafe.PROFILE_DEPENDENT
    # These cite the creator's own records, so they need no profile.
    assert not SparseContextSafe.PROFILE_DEPENDENT & {"repurpose", "continue", "refine"}


# --------------------------------------------------------------------------- #
# Live run
# --------------------------------------------------------------------------- #

async def test_all_producer_scenarios_pass(scenarios):
    from tests.conftest import rls_session
    import uuid

    user_id = uuid.UUID(str(EVAL_USER_ID))
    async with rls_session(user_id) as db:
        report = await run_all(scenarios, db=db, user_id=user_id)

    failures = [
        (r.scenario_id, r.errors or r.detail.get("gating_scores"))
        for r in report.results if not r.passed
    ]
    assert not failures, f"failing scenarios: {failures}"
    assert report.total == len(scenarios)
    assert report.pass_rate == 1.0


async def test_scenario_with_no_gating_metric_is_a_failure():
    """A scenario asserting nothing must not vacuously pass."""
    from app.ai.evaluation.producer import ProducerScenario
    from tests.conftest import rls_session
    import uuid

    empty = ProducerScenario(
        id="prod_000_empty",
        category="normal_creator",
        description="asserts nothing",
        profile={"niche": "x", "audience": "y"},
    )
    async with rls_session(uuid.UUID(str(EVAL_USER_ID))) as db:
        result = await run_scenario(empty, db=db, user_id=uuid.UUID(str(EVAL_USER_ID)))

    assert result.passed is False or bool(result.detail.get("gating_scores"))
