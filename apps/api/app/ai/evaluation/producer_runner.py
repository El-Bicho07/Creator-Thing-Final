"""Runner for the Phase 4 Producer AI evaluation suite.

Usage::

    python -m app.ai.evaluation.producer_runner
    python -m app.ai.evaluation.producer_runner --json docs/eval/producer_evaluation.json
    python -m app.ai.evaluation.producer_runner --only prod_007
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os

from app.ai.evaluation.producer import (
    EVAL_USER_ID,
    SCENARIO_FILE,
    load_producer_scenarios,
    run_all,
)
from app.core.config import settings
from app.core.db import rls_scoped_session


async def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run the Phase 4 Producer AI evaluation suite"
    )
    parser.add_argument("--json", dest="json_out", default=None)
    parser.add_argument("--only", default=None)
    args = parser.parse_args()

    scenarios = load_producer_scenarios(SCENARIO_FILE)
    if args.only:
        scenarios = [s for s in scenarios if s.id == args.only]
        if not scenarios:
            print(f"No scenario matched {args.only!r}")
            return 2

    async with rls_scoped_session({"sub": str(EVAL_USER_ID)}) as db:
        report = await run_all(scenarios, db=db, user_id=EVAL_USER_ID)

    payload = report.as_dict()
    payload["embedding_model"] = settings.embedding_model
    payload["llm_provider"] = settings.llm_provider
    payload["scenarios_file"] = os.path.relpath(SCENARIO_FILE)

    if args.json_out:
        os.makedirs(os.path.dirname(args.json_out) or ".", exist_ok=True)
        with open(args.json_out, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, indent=2, ensure_ascii=False)
        print(f"wrote {args.json_out}")

    print("=" * 62)
    print("PHASE 4 PRODUCER AI EVALUATION")
    print("=" * 62)
    print(f"scenarios : {report.total}")
    print(f"passed    : {report.passed}")
    print(f"failed    : {report.failed}")
    print(f"pass rate : {report.pass_rate}")
    print(f"provider  : {settings.llm_provider} (decision metrics are deterministic)")

    print("\ncategory means:")
    for category, mean in report.category_means.items():
        print(f"  {category:24s} {mean}")

    failures = [r for r in report.results if not r.passed]
    if failures:
        print("\nfailures:")
        for result in failures:
            reason = "; ".join(result.errors) or (
                f"gating below threshold: {result.detail.get('gating_scores')}"
            )
            print(f"  {result.scenario_id:36s} {reason[:100]}")
            print(f"    kinds={result.detail.get('item_kinds')} "
                  f"items={result.detail.get('items_planned')}")

    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
