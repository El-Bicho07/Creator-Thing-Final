"""Runner for the Phase 3 Studio AI evaluation suite.

Usage::

    python -m app.ai.evaluation.studio_runner
    python -m app.ai.evaluation.studio_runner --json docs/eval/studio_evaluation.json
    python -m app.ai.evaluation.studio_runner --only studio_017_critique_actionable
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os

from sqlalchemy import text

from app.ai.evaluation.studio import (
    EVAL_USER_ID,
    SCENARIO_FILE,
    load_studio_scenarios,
    run_all,
)
from app.core.config import settings
from app.core.db import rls_scoped_session


async def _ensure_eval_user(db) -> None:
    """Create the evaluation creator with an RLS-bypassing connection.

    Uses `api_user` semantics via the RLS-scoped session where possible; the user
    row itself cannot be inserted through RLS for a not-yet-existing identity, so
    this uses the admin engine the Phase 2 runner uses too.
    """
    from app.core.db import admin_session_maker

    async with admin_session_maker() as admin:
        await admin.execute(
            text("INSERT INTO users (id, email) VALUES (:i, :e) "
                 "ON CONFLICT (id) DO NOTHING"),
            {"i": str(EVAL_USER_ID), "e": "studio-eval@test.local"},
        )
        await admin.commit()


async def _reset_eval_user(db) -> None:
    """Remove prior evaluation state so runs are independent."""
    from app.core.db import admin_session_maker

    tables = [
        "studio_generations", "studio_sessions", "chunks", "content_assets",
        "voice_profiles",
    ]
    async with admin_session_maker() as admin:
        for table in tables:
            await admin.execute(
                text(f"DELETE FROM {table} WHERE user_id = :u"),
                {"u": str(EVAL_USER_ID)},
            )
        await admin.commit()


async def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run the Phase 3 Studio AI evaluation suite"
    )
    parser.add_argument("--json", dest="json_out", default=None)
    parser.add_argument("--only", default=None, help="run one scenario id")
    args = parser.parse_args()

    await _ensure_eval_user(None)
    await _reset_eval_user(None)

    scenarios = load_studio_scenarios(SCENARIO_FILE)
    if args.only:
        scenarios = [s for s in scenarios if s.id == args.only]
        if not scenarios:
            print(f"No scenario matched {args.only!r}")
            return 2

    async with rls_scoped_session({"sub": str(EVAL_USER_ID)}) as db:
        report = await run_all(scenarios, db=db, user_id=EVAL_USER_ID)

    payload = report.as_dict()
    payload["embedding_model"] = settings.embedding_model
    payload["embedding_dimension"] = settings.embedding_dimension
    payload["llm_provider"] = settings.llm_provider
    payload["scenarios_file"] = os.path.relpath(SCENARIO_FILE)

    if args.json_out:
        os.makedirs(os.path.dirname(args.json_out) or ".", exist_ok=True)
        with open(args.json_out, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, indent=2, ensure_ascii=False)
        print(f"wrote {args.json_out}")

    print("=" * 62)
    print("PHASE 3 STUDIO AI EVALUATION")
    print("=" * 62)
    print(f"scenarios : {report.total}")
    print(f"passed    : {report.passed}")
    print(f"failed    : {report.failed}")
    print(f"pass rate : {report.pass_rate}")
    print(f"provider  : {settings.llm_provider} (structural metrics)")

    print("\ncategory means:")
    for category, mean in report.category_means.items():
        print(f"  {category:26s} {mean}")

    print("\nper capability:")
    by_capability: dict[str, list[int]] = {}
    for result in report.results:
        passed, total = by_capability.get(result.capability, (0, 0))
        by_capability[result.capability] = (passed + (1 if result.passed else 0), total + 1)
    for capability, (passed, total) in sorted(by_capability.items()):
        print(f"  {capability:14s} {passed}/{total}")

    failures = [r for r in report.results if not r.passed]
    if failures:
        print("\nfailures:")
        for result in failures:
            reason = "; ".join(result.errors) or (
                f"gating scores below {result.detail.get('mean_score')}: "
                f"{result.detail.get('gating_scores')}"
            )
            print(f"  {result.scenario_id:38s} {reason[:100]}")

    # Studio evaluation is a report, not a build gate: a failure here means a
    # scenario or capability regressed, and the exit code reflects that.
    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
