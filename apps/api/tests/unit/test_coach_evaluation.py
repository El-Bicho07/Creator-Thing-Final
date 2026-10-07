"""Unit test wrapper for Coach & Learning AI evaluation suite (25 scenarios)."""
from __future__ import annotations

import pytest

from app.ai.evaluation.coach import load_scenarios, run_all, run_scenario


def test_coach_scenarios_load():
    scenarios = load_scenarios()
    assert len(scenarios) == 25, f"Expected 25 scenarios, found {len(scenarios)}"


@pytest.mark.asyncio
async def test_coach_evaluation_all_scenarios_pass():
    scenarios = load_scenarios()
    report = await run_all(scenarios)

    assert report.total == 25
    assert report.failed == 0, f"Failed scenarios: {[r for r in report.results if not r.passed]}"
    assert report.passed == 25
