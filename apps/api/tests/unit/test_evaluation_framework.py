"""AI evaluation framework tests.

These prove the *infrastructure* works (task §36). They do not assert that the
platform is good at any particular language -- that is what the golden scenarios
report, and several of them deliberately encode known cross-script limitations.
"""
import json
import pathlib
import uuid

import pytest

from app.ai.evaluation import (
    EvaluationSuite,
    ExpectedAssetRetrieved,
    ForbiddenFactsAbsent,
    RequiredFactsPresent,
    Scenario,
    ScenarioCategory,
    TopHitAccuracy,
)

SCENARIO_FILE = (
    pathlib.Path(__file__).resolve().parents[2] / "app" / "ai" / "evaluation"
    / "golden_scenarios.json"
)


# --------------------------------------------------------------------------- #
# Golden scenario corpus
# --------------------------------------------------------------------------- #

def test_golden_scenarios_file_exists():
    assert SCENARIO_FILE.is_file()


def test_golden_scenarios_parse():
    scenarios = EvaluationSuite.load_scenarios(str(SCENARIO_FILE))
    assert len(scenarios) >= 20, "task §36 asks for ~20-30 scenarios"


def test_scenario_ids_unique():
    scenarios = EvaluationSuite.load_scenarios(str(SCENARIO_FILE))
    ids = [s.id for s in scenarios]
    assert len(ids) == len(set(ids))


def test_all_required_categories_covered():
    """§36: memory retrieval, voice matching, relevance, faithfulness,
    usefulness, creator-context preservation."""
    scenarios = EvaluationSuite.load_scenarios(str(SCENARIO_FILE))
    covered = {s.category for s in scenarios}
    required = {
        ScenarioCategory.MEMORY_RETRIEVAL,
        ScenarioCategory.VOICE_MATCHING,
        ScenarioCategory.RELEVANCE,
        ScenarioCategory.FAITHFULNESS,
        ScenarioCategory.USEFULNESS,
        ScenarioCategory.CONTEXT_PRESERVATION,
    }
    assert required <= covered, f"missing categories: {required - covered}"


def test_every_scenario_is_well_formed():
    for s in EvaluationSuite.load_scenarios(str(SCENARIO_FILE)):
        assert s.id and s.description
        assert 0.0 <= s.min_expected_score <= 1.0
        if s.corpus and s.query:
            assert s.expected_top_asset is not None
            assert 0 <= s.expected_top_asset < len(s.corpus)
        if s.category == ScenarioCategory.VOICE_MATCHING:
            assert s.voice_samples


def test_scenarios_are_json_serialisable():
    for s in EvaluationSuite.load_scenarios(str(SCENARIO_FILE)):
        json.loads(s.model_dump_json())


# --------------------------------------------------------------------------- #
# Metrics
# --------------------------------------------------------------------------- #

async def test_top_hit_accuracy_metric():
    scenario = Scenario(id="t", category=ScenarioCategory.MEMORY_RETRIEVAL,
                        description="d", corpus=["a"], query="q", expected_top_asset=0)

    class FakeResult:
        def __init__(self, aid):
            self.content_asset_id = aid

    metric = TopHitAccuracy()
    good = await metric.score(scenario, {
        "asset_ids": [uuid.uuid4()], "memory_results": [FakeResult(scenario_expected := uuid.uuid4())]})
    # asset_ids[0] != memory_results[0].content_asset_id -> 0.0
    assert good == 0.0

    target = uuid.uuid4()
    same = await metric.score(
        Scenario(id="t", category=ScenarioCategory.MEMORY_RETRIEVAL, description="d",
                 corpus=["a"], query="q", expected_top_asset=0),
        {"asset_ids": [target], "memory_results": [FakeResult(target)]})
    assert same == 1.0


async def test_required_facts_metric():
    scenario = Scenario(id="t", category=ScenarioCategory.FAITHFULNESS,
                        description="d", required_facts=["12 percent", "trials"])
    metric = RequiredFactsPresent()
    assert await metric.score(scenario, {"retrieved_blob": "converted 12 percent into trials"}) == 1.0
    assert await metric.score(scenario, {"retrieved_blob": "converted 12 percent"}) == 0.5
    assert await metric.score(scenario, {"retrieved_blob": "nothing relevant"}) == 0.0
    assert await metric.score(scenario, {"retrieved_blob": ""}) == 0.0
    # No required facts -> not applicable
    assert await metric.score(
        Scenario(id="t", category=ScenarioCategory.FAITHFULNESS, description="d"),
        {"retrieved_blob": "x"}) is None


async def test_forbidden_facts_metric():
    scenario = Scenario(id="t", category=ScenarioCategory.CONTEXT_PRESERVATION,
                        description="d", forbidden_facts=["two hundred euros"])
    metric = ForbiddenFactsAbsent()
    assert await metric.score(scenario, {"retrieved_blob": "about indexing posts"}) == 1.0
    assert await metric.score(scenario,
                              {"retrieved_blob": "rate is two hundred euros"}) == 0.0


async def test_metrics_return_none_when_not_applicable():
    scenario = Scenario(id="t", category=ScenarioCategory.RELEVANCE, description="d")
    for metric in (TopHitAccuracy(), ExpectedAssetRetrieved(), RequiredFactsPresent(),
                   ForbiddenFactsAbsent()):
        assert await metric.score(scenario, {}) is None


# --------------------------------------------------------------------------- #
# Suite
# --------------------------------------------------------------------------- #

async def test_suite_runs_and_reports(session_a, user_a_id):
    async with session_a as db:
        """The suite must execute end to end and produce a structured report."""
        scenarios = EvaluationSuite.load_scenarios(str(SCENARIO_FILE))
        # Run a small, representative slice: the framework is what is under test,
        # and 26 full scenarios would dominate the suite runtime.
        subset = [s for s in scenarios if s.id in {
            "mem_001_launch_numbers", "mem_006_single_document",
            "mem_015_context_isolation", "voice_001_on_style_match"}]

        report = await EvaluationSuite().run_all(subset, db=db, user_id=user_a_id)

        assert report["total"] == len(subset)
        assert 0 <= report["pass_rate"] <= 1.0
        assert len(report["results"]) == len(subset)
        for result in report["results"]:
            assert set(result) >= {"scenario_id", "category", "passed", "scores", "errors"}
            # A scenario that errored is reported as failed, not silently passed.
            if result["errors"]:
                assert result["passed"] is False


async def test_suite_isolates_failures(session_a, user_a_id):
    async with session_a as db:
        """A malformed scenario must fail on its own without aborting the run."""
        broken = Scenario(id="broken", category=ScenarioCategory.MEMORY_RETRIEVAL,
                          description="intentionally impossible",
                          corpus=["a"], query="q", expected_top_asset=99,
                          min_expected_score=1.0)

        report = await EvaluationSuite().run_all([broken], db=db, user_id=user_a_id)

        assert report["total"] == 1
        assert report["passed"] == 0


async def test_known_cross_script_limitation_is_recorded():
    """The Tanglish scenario must exist and assert current behaviour.

    The Phase 1 benchmark measured 0/12 for Tanglish -> Tamil on every candidate
    model, and the follow-up showed normalisation makes it worse. That scenario
    is kept (rather than deleted) so the limitation stays visible in CI.
    """
    scenarios = {s.id: s for s in EvaluationSuite.load_scenarios(str(SCENARIO_FILE))}
    tanglish = scenarios["mem_013_tanglish_known_limitation"]
    assert tanglish.min_expected_score == 0.0
    assert "known_limitation" in tanglish.tags
    assert "tanglish" in tanglish.tags
