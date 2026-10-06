"""CLI runner for the Analytics Copilot evaluation.

    docker exec creator-api python -m app.ai.evaluation.copilot_runner

Writes `docs/eval/copilot_evaluation.json`. Exits non-zero if any scenario fails,
so it can be used as a gate rather than a report nobody reads.
"""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

from app.ai.evaluation.copilot import load_scenarios, run_all

def _result_dict(result) -> dict:
    """Serialize a dataclass result without depending on it being a Pydantic model."""
    return {
        "scenario_id": result.scenario_id,
        "category": result.category,
        "passed": result.passed,
        "errors": list(result.errors),
        "detail": result.detail,
    }


def _results_path() -> Path:
    """Locate `docs/eval` across host and container layouts.

    The repo root is four levels up from `app/ai/evaluation/`, but inside the
    container the application lives at `/app`, so the same relative walk resolves to
    `/`. Fall back to the working directory, which is the repo root on the host.
    """
    # Inside the container only `apps/api`, `packages`, `scripts` and `web/lib` are
    # bind-mounted, so the repository's `docs/` is not writable from here. Write
    # beside the application and copy the artifact into `docs/eval/` for the record,
    # exactly as the Studio and Producer evaluation artifacts are kept.
    candidates = [
        Path.cwd() / "docs" / "eval",
        Path("/app/docs/eval"),
    ]
    for candidate in candidates:
        if candidate.parent.is_dir():
            return candidate / "copilot_evaluation.json"
    return candidates[0] / "copilot_evaluation.json"


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
            "Deterministic evaluation with a scripted provider. This verifies "
            "structure, evidence discipline and refusal behaviour. It does NOT "
            "verify factual truth or real model quality; live validation remains "
            "deferred pending working provider credentials."
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
