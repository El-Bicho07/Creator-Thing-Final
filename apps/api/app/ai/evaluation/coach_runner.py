"""CLI runner for Coach & Learning evaluation (Phase 6).

    python -m app.ai.evaluation.coach_runner

Writes `docs/eval/coach_evaluation.json`. Exits non-zero if any scenario fails.
"""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

from app.ai.evaluation.coach import load_scenarios, run_all


def _result_dict(result) -> dict:
    return {
        "scenario_id": result.scenario_id,
        "category": result.category,
        "passed": result.passed,
        "errors": list(result.errors),
        "detail": result.detail,
    }


def _results_path() -> Path:
    candidates = [
        Path.cwd() / "docs" / "eval",
        Path("/app/docs/eval"),
    ]
    for candidate in candidates:
        if candidate.parent.is_dir():
            return candidate / "coach_evaluation.json"
    return candidates[0] / "coach_evaluation.json"


async def main() -> int:
    scenarios = load_scenarios()
    report = await run_all(scenarios)

    payload = {
        "total": report.total,
        "passed": report.passed,
        "failed": report.failed,
        "pass_rate": round(report.passed / report.total, 4) if report.total else 0,
        "category_means": report.category_means,
        "results": [_result_dict(r) for r in report.results],
        "llm_provider": "scripted",
        "note": (
            "Deterministic evaluation for Phase 6 Coach & Learning. Verifies "
            "goal coaching, strength/weakness recognition, progress evaluation, "
            "evidence discipline, creator preference authority, learning lifecycle, "
            "prompt injection defanging, actionability and Producer handoffs."
        ),
    }

    results_path = _results_path()
    results_path.parent.mkdir(parents=True, exist_ok=True)
    results_path.write_text(json.dumps(payload, indent=2) + "\n")

    for result in report.results:
        mark = "PASS" if result.passed else "FAIL"
        print(f"  {mark}  {result.scenario_id:38s} {result.category}")
        for error in result.errors:
            print(f"        - {error}")

    print()
    for category, mean in report.category_means.items():
        print(f"  {mean:.3f}  {category}")
    print()
    print(f"  total   : {report.total}")
    print(f"  passed  : {report.passed}")
    print(f"  failed  : {report.failed}")
    print(f"  written : {results_path}")
    return 0 if report.failed == 0 else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
