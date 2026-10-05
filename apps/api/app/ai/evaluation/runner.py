"""CLI runner for the AI evaluation framework.

Usage (inside the API container):
    python -m app.ai.evaluation.runner
    python -m app.ai.evaluation.runner --json docs/eval/phase2_ai_evaluation.json

Runs every golden scenario against the real platform services over an
RLS-scoped session, and writes a structured report.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import uuid

from app.ai.evaluation import EvaluationSuite
from app.core.config import settings
from app.core.db import rls_scoped_session

SCENARIO_FILE = os.path.join(os.path.dirname(__file__), "golden_scenarios.json")

#: A dedicated evaluation creator, created on first run via the admin role.
EVAL_USER_ID = uuid.UUID("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee")


async def _ensure_eval_user() -> None:
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
    from sqlalchemy.pool import NullPool

    if not settings.admin_database_url:
        return
    engine = create_async_engine(settings.admin_database_url, echo=False,
                                 poolclass=NullPool)
    maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with maker() as admin:
        await admin.execute(
            text("INSERT INTO users (id, email) VALUES (:i, :e) ON CONFLICT (id) DO NOTHING"),
            {"i": str(EVAL_USER_ID), "e": "phase2-eval@local.test"},
        )
        await admin.commit()
    await engine.dispose()


async def _reset_eval_user() -> None:
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
    from sqlalchemy.pool import NullPool

    if not settings.admin_database_url:
        return
    engine = create_async_engine(settings.admin_database_url, echo=False,
                                 poolclass=NullPool)
    maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    tables = ["chunks", "content_assets", "voice_profiles", "ai_calls", "jobs"]
    async with maker() as admin:
        for table in tables:
            await admin.execute(
                text(f"DELETE FROM {table} WHERE user_id = :u"), {"u": str(EVAL_USER_ID)}
            )
        await admin.commit()
    await engine.dispose()


async def main() -> int:
    parser = argparse.ArgumentParser(description="Run the Phase 2 AI evaluation suite")
    parser.add_argument("--json", dest="json_out", default=None)
    parser.add_argument("--only", default=None, help="run one scenario id")
    args = parser.parse_args()

    await _ensure_eval_user()
    await _reset_eval_user()

    scenarios = EvaluationSuite.load_scenarios(SCENARIO_FILE)
    if args.only:
        scenarios = [s for s in scenarios if s.id == args.only]
        if not scenarios:
            print(f"No scenario matched {args.only!r}")
            return 2

    async with rls_scoped_session({"sub": str(EVAL_USER_ID)}) as db:
        report = await EvaluationSuite().run_all(scenarios, db=db, user_id=EVAL_USER_ID)

    report["embedding_model"] = settings.embedding_model
    report["embedding_dimension"] = settings.embedding_dimension
    report["llm_provider"] = settings.llm_provider

    if args.json_out:
        os.makedirs(os.path.dirname(args.json_out) or ".", exist_ok=True)
        with open(args.json_out, "w", encoding="utf-8") as fh:
            json.dump(report, fh, indent=2, ensure_ascii=False)
        print(f"wrote {args.json_out}")

    print("=" * 60)
    print("PHASE 2 AI EVALUATION")
    print("=" * 60)
    print(f"scenarios : {report['total']}")
    print(f"passed    : {report['passed']}")
    print(f"failed    : {report['failed']}")
    print(f"pass rate : {report['pass_rate']}")
    print("\ncategory means:")
    for category, mean in report["category_means"].items():
        print(f"  {category:32s} {mean}")
    print("\nfailures:")
    for result in report["results"]:
        if not result["passed"]:
            reason = "; ".join(result["errors"]) or \
                f"scores below threshold: {result['scores']}"
            print(f"  {result['scenario_id']:36s} {reason[:90]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
