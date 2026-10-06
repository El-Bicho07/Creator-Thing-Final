"""Phase 4 end-to-end: Memory → Producer → Today → Studio → content asset → Today.

The integration path required by task §23, exercised in one continuous flow so the
*compositions* are covered rather than just the units:

```text
Memory ──┐
Voice  ──┼──> Producer context ──> Producer plan ──> Today item
Profile─┘                                              │
                                                        v
                                    Producer execute ──> Studio session
                                                        │
                                    Studio generates (real capability)
                                                        │
                                    content_assets + studio_generations
                                                        │
                                    Today reflects real Studio progress
```

Critically, the Producer never generates: the only content in the flow comes from a
real Studio capability execution.
"""
from __future__ import annotations

import json
import uuid
from datetime import date, timedelta

import pytest
from sqlalchemy import text

from app.llm.gateway import LLMGateway, set_llm_gateway
from app.llm.providers import ScriptedLLMProvider
from app.producer import ProducerService, TodayRepository
from app.producer.contracts import TodayItemStatus
from tests.conftest import USER_A, admin_db, client_for, rls_session

pytestmark = pytest.mark.asyncio

TODAY = date(2026, 3, 10)

STUDIO_IDEA_JSON = json.dumps({"ideas": [
    {"title": "Launch on a Tuesday",
     "angle": "Midweek launches face less inbox competition.",
     "why_it_could_work": "You measured this yourself.",
     "format": "tutorial",
     "difficulty": "easy"},
]})

ENRICH_JSON = json.dumps({"recommendations": [{
    "kind": "create",
    "title": "Launch timing reel for solo creators",
    "reason": "Your own Tuesday launch result points here.",
}]})


@pytest.fixture(autouse=True)
def _restore_gateway():
    from app.llm.gateway import get_llm_gateway

    previous = None
    try:
        previous = get_llm_gateway()
    except Exception:
        previous = None
    yield
    set_llm_gateway(previous)


def _scripted(*payloads: str) -> ScriptedLLMProvider:
    provider = ScriptedLLMProvider(script=list(payloads))
    set_llm_gateway(LLMGateway(providers={provider.name: provider}))
    return provider


async def _seed_creator(user_id, *, memory=True, voice=True):
    from app.memory import IngestRequest, MemoryCategory, SourceType, get_memory_engine
    from app.voice import VoiceProfile, get_voice_engine

    async with rls_session(user_id) as db:
        await db.execute(
            text("""
                INSERT INTO creator_profiles
                    (user_id, full_name, niche, target_audience, primary_platform,
                     content_goals)
                VALUES (:u, 'Test Creator', 'launch timing for solo creators',
                        'solo creators who ship weekly', 'reel',
                        '["education", "engagement"]')
                ON CONFLICT (user_id) DO UPDATE
                    SET niche = EXCLUDED.niche
            """),
            {"u": str(user_id)},
        )
        if memory:
            await get_memory_engine(db, user_id).ingest(IngestRequest(
                title="Launch lesson",
                raw_text=("I launched my landing page on a Tuesday and got 400 "
                          "signups in 48 hours. Waiting three weeks to email my "
                          "list was the mistake."),
                source_type=SourceType.NOTE,
                category=MemoryCategory.LESSON,
            ))
        if voice:
            await get_voice_engine(db, user_id).save_profile(VoiceProfile(
                style_name="Primary Style",
                tone_fingerprint={"directness": 0.9, "warmth": 0.7},
                writing_characteristics={"avg_sentence_length": 13},
                vocabulary_patterns={"top_keywords": ["launch", "signups"]},
                forbidden_words=["delve"],
                sample_count=3,
                confidence=0.8,
            ))
        await db.execute(
            text("DELETE FROM plan_items WHERE user_id = :u"), {"u": str(user_id)}
        )
        await db.commit()


async def test_full_producer_to_studio_to_today_flow():
    """Memory + Voice → Producer → Today → Studio → content → Today progress."""
    _scripted(ENRICH_JSON)               # producer enrichment
    provider = _scripted(STUDIO_IDEA_JSON)  # Studio generation
    await _seed_creator(USER_A)

    # ---- 1. the Producer plans from real creator context ----
    async with client_for(USER_A) as ac:
        recommend = await ac.post("/api/producer/recommend",
                                  json={"plan_date": str(TODAY)})
    assert recommend.status_code == 200
    assert recommend.json()["context"]["memory_chunks"] >= 1
    assert recommend.json()["context"]["has_voice"] is True
    assert recommend.json()["has_action"] is True

    # ---- 2. the plan is persisted to Today ----
    async with client_for(USER_A) as ac:
        planned = await ac.post("/api/today/plan", params={"date": str(TODAY)},
                                json={})
        today = await ac.get(f"/api/today?date={TODAY}")

    assert planned.status_code == 201
    items = today.json()["items"]
    assert items, "the plan must produce a Today item"
    item = items[0]
    assert item["source"] == "producer"
    assert item["status"] == TodayItemStatus.PLANNED.value
    assert item["capability"], "a producer item must name a Studio capability"
    assert item["reason"], "a producer item must say why"
    assert item["evidence"], "and must carry its evidence"

    # ---- 3. the creator accepts it; the Producer hands off to Studio ----
    async with client_for(USER_A) as ac:
        handoff = await ac.post("/api/producer/execute", json={"item_id": item["id"]})

    assert handoff.status_code == 200
    handoff_body = handoff.json()
    session_id = uuid.UUID(handoff_body["studio_session_id"])
    assert handoff_body["capability"] == item["capability"]

    # The Producer created a session but no content.
    async with admin_db() as db:
        before = (await db.execute(
            text("SELECT COUNT(*) FROM studio_generations WHERE session_id = :s"),
            {"s": str(session_id)},
        )).scalar()
    assert before == 0, "the Producer must not generate content"

    # ---- 4. Studio generates (the real capability, real Gateway) ----
    async with rls_session(USER_A) as db:
        from app.studio import StudioOrchestrator

        orchestrator = StudioOrchestrator(db, USER_A)
        record = await orchestrator.repository.get_session(session_id)
        assert record is not None, "Studio must see the session the Producer created"

        execution = await orchestrator.run_capability(
            record, handoff_body["capability"], handoff_body["input"]
        )
        assert execution.generation is not None, execution.warnings
        generation = execution.generation

    # ---- 5. the generation is a real asset with provenance ----
    async with admin_db() as db:
        asset = (await db.execute(
            text("SELECT raw_text, source_type, metadata FROM content_assets WHERE id = :a"),
            {"a": str(generation.asset_id)},
        )).mappings().one()
        stored_gen = (await db.execute(
            text("SELECT capability, prompt_name, prompt_version FROM studio_generations "
                 "WHERE id = :g"),
            {"g": str(generation.id)},
        )).mappings().one()

    assert "Tuesday" in asset["raw_text"]
    assert asset["source_type"] == "studio"
    assert asset["metadata"]["capability"] == handoff_body["capability"]
    assert stored_gen["prompt_name"] == "studio/idea"
    assert stored_gen["prompt_version"] == "v1"

    # ---- 6. the Studio call is observable through ai_calls ----
    async with admin_db() as db:
        calls = (await db.execute(text("""
            SELECT feature, prompt_version, success FROM ai_calls
            WHERE user_id = :u AND feature IN ('studio', 'producer')
            ORDER BY created_at DESC LIMIT 5
        """), {"u": str(USER_A)})).mappings().all()
    assert calls, "Phase 4 calls must be recorded through ai_calls"
    assert all(c["success"] for c in calls)
    assert any(c["feature"] == "studio" for c in calls)

    # ---- 7. Today now reflects real Studio progress ----
    async with client_for(USER_A) as ac:
        after = await ac.get(f"/api/today?date={TODAY}")

    counts = after.json()["counts"]
    assert counts["completed"] == 1, "Today must reflect the generated Studio work"
    finished = [i for i in after.json()["items"] if i["id"] == item["id"]][0]
    assert finished["generation_id"] == str(generation.id)


async def test_producer_does_not_duplicate_studio_generation_logic():
    """The architectural claim, asserted on the source.

    The Producer prepares a capability and an input; it must not contain the
    prompt assembly, the Gateway call, or the generation logic that Studio owns.
    """
    import pathlib

    producer = pathlib.Path(__file__).resolve().parents[2] / "app" / "producer"
    combined = "\n".join(
        p.read_text(encoding="utf-8") for p in producer.rglob("*.py")
    )

    # No second Gateway client: the Producer may only use Studio's helper.
    assert "class LLMGateway" not in combined
    assert "from app.llm.providers" not in combined
    # No content generation: no capability implementation, no prompt assets.
    assert "packages/prompts" not in combined
    assert "build_prompt(" not in combined
    # No Studio capability implementations imported in.
    assert "capabilities.implementations" not in combined


async def test_execution_continues_into_studio_generation_for_each_capability():
    """A handoff payload must satisfy the Studio capability's input model."""
    from app.studio import build_registry

    registry = build_registry()
    payloads = {
        "idea": {"topic": "launch timing", "count": 3},
        "script": {"topic": "launch timing", "platform": "reel"},
        "hook": {"topic": "launch timing", "limit": 5},
        "caption": {"topic": "launch timing", "count": 4},
        "cta": {"topic": "launch timing", "goal": "engagement"},
        "thumbnail": {"description": "a reel", "content_type": "tutorial"},
        "repurpose": {"source_content": "text", "platforms": ["reel"]},
        "refine": {"instruction": "tighten it"},
    }
    for capability_id, payload in payloads.items():
        capability = registry.require(capability_id)
        parsed = capability.validate_input(payload)
        assert parsed is not None, capability_id


async def test_jobs_run_the_producer_through_platform_infrastructure():
    """Planning must use the existing JobService, not a new queue."""
    from app.jobs.service import JobService

    _scripted(ENRICH_JSON)
    await _seed_creator(USER_A)

    async with rls_session(USER_A) as db:
        producer = ProducerService(db, USER_A)
        run = await producer.plan_as_job(TODAY)

        job = await JobService(db, USER_A).get(run.job_id)

    assert job is not None
    assert job.job_type == "producer_plan"
    assert job.status == "completed"
    assert job.progress == 100
    assert job.metadata["result"]["created_items"] >= 1


async def test_job_failure_is_recorded_not_swallowed():
    """A failing plan must surface as a failed job, not a silent success."""
    from app.core.errors import AIProviderError
    from app.llm.providers.base import ProviderAdapter
    from app.jobs.service import JobService

    class AlwaysFails(ProviderAdapter):
        name = "always_fails"

        def __init__(self):
            super().__init__(api_key="x")

        @property
        def is_configured(self) -> bool:
            return True

        async def complete(self, request):
            raise AIProviderError("upstream down")

    await _seed_creator(USER_A)

    async with rls_session(USER_A) as db:
        # Make plan() blow up in the job worker.
        producer = ProducerService(db, USER_A)
        original = producer.plan

        async def boom(*args, **kwargs):
            raise RuntimeError("planner exploded")

        producer.plan = boom
        run = await producer.plan_as_job(TODAY)
        job = await JobService(db, USER_A).get(run.job_id)

    assert job is not None
    assert job.status == "failed"
    assert "planner exploded" in (job.error_message or "")


async def test_producer_degrades_to_deterministic_plan_without_a_provider():
    """A provider outage must not take Today down with it."""
    from app.core.errors import AITimeoutError
    from app.llm.providers.base import ProviderAdapter

    class TimesOut(ProviderAdapter):
        name = "times_out"

        def __init__(self):
            super().__init__(api_key="x")

        @property
        def is_configured(self) -> bool:
            return True

        async def complete(self, request):
            raise AITimeoutError("upstream timeout")

    set_llm_gateway(LLMGateway(providers={"times_out": TimesOut()}))
    await _seed_creator(USER_A)

    async with client_for(USER_A) as ac:
        response = await ac.post("/api/today/plan", params={"date": str(TODAY)},
                                 json={})

    assert response.status_code == 201
    body = response.json()
    assert body["run"]["created_items"] >= 1, (
        "the deterministic planner must still produce a plan"
    )
    assert "llm_enrichment_unavailable" in body["run"]["notes"]


async def test_evidence_must_resolve_to_a_real_record():
    """The Module 21 citation-forcing pattern, made checkable.

    An evidence reference that does not exist is dropped, and a recommendation
    left with no evidence is refused.
    """
    from app.producer.contracts import Evidence, EvidenceKind

    await _seed_creator(USER_A)

    async with rls_session(USER_A) as db:
        # Create its own asset rather than relying on another test's leftovers:
        # these tests share USER_A and one of them deletes A's assets.
        real_id = str(uuid.uuid4())
        await db.execute(
            text("INSERT INTO content_assets (id, user_id, title, source_type, raw_text) "
                 "VALUES (:i, :u, 'Citeable asset', 'studio', 'Body')"),
            {"i": real_id, "u": str(USER_A)},
        )
        await db.commit()

        producer = ProducerService(db, USER_A)
        valid, dropped = await producer.validate_evidence([
            Evidence(kind=EvidenceKind.CONTENT_ASSET, ref_id=real_id),
            Evidence(kind=EvidenceKind.MEMORY, ref_id=str(uuid.uuid4())),
            Evidence(kind=EvidenceKind.IDEA, ref_id=str(uuid.uuid4())),
        ])

    assert len(valid) == 1, "a real asset id must validate"
    assert len(dropped) == 2, "fabricated references must be dropped, not trusted"


async def test_creator_profile_marker_evidence_is_accepted():
    """The profile is a singleton, so the assembler emits a marker rather than an id."""
    from app.producer.contracts import Evidence, EvidenceKind

    await _seed_creator(USER_A)
    async with rls_session(USER_A) as db:
        producer = ProducerService(db, USER_A)
        valid, dropped = await producer.validate_evidence([
            Evidence(kind=EvidenceKind.CREATOR_PROFILE, ref_id="creator_profile")
        ])

    assert len(valid) == 1
    assert dropped == []


async def test_carryover_wins_the_main_slot_when_it_is_the_best_available():
    """Unfinished work from a previous day must not be silently dropped.

    Uses a creator with NO profile/memory, so the only candidate the planner can
    produce is the carryover. (With a rich creator the `create` candidate outscores
    it and takes the single `main` slot -- which is the intended day shape, and is
    asserted separately below.)
    """
    _scripted(ENRICH_JSON)
    await _seed_creator(USER_A, memory=False, voice=False)

    async with rls_session(USER_A) as db:
        # Remove the assets memory created, leaving a sparse creator.
        await db.execute(
            text("DELETE FROM content_assets WHERE user_id = :u"), {"u": str(USER_A)}
        )
        carry_id = uuid.uuid4()
        await db.execute(
            text("""
                INSERT INTO plan_items (id, user_id, plan_date, title, platform, status)
                VALUES (:i, :u, :d, 'Slipped work', 'reel', 'planned')
            """),
            {"i": str(carry_id), "u": str(USER_A), "d": date(2026, 3, 5)},
        )
        await db.commit()

        service = ProducerService(db, USER_A)
        plan, _run = await service.plan(TODAY)

    titles = [i.title for i in plan.items]
    assert "Slipped work" in titles, (
        "carryover work must be resumable; a sparse creator's only candidate "
        f"was dropped (got {titles})"
    )
    assert titles.count("Slipped work") == 1


async def test_overdue_carryover_overtakes_new_work():
    """Finishing work the creator started must beat proposing something new.

    As carryover ages it accumulates overdue weight and eventually outranks a
    fresh `create`, because abandoning your own half-finished work is the failure
    mode a Today surface exists to prevent. The day still holds exactly one main
    slot either way.
    """
    _scripted(ENRICH_JSON)
    await _seed_creator(USER_A)

    async def plan_with_carryover(days_ago: int):
        async with rls_session(USER_A) as db:
            await db.execute(
                text("DELETE FROM plan_items WHERE user_id = :u"),
                {"u": str(USER_A)},
            )
            await db.execute(
                text("""
                    INSERT INTO plan_items (user_id, plan_date, title, platform, status)
                    VALUES (:u, :d, 'Slipped work', 'reel', 'planned')
                """),
                {"u": str(USER_A),
                 "d": date(2026, 3, 10) - timedelta(days=days_ago)},
            )
            await db.commit()
            service = ProducerService(db, USER_A)
            plan, _run = await service.plan(date(2026, 3, 10))
            return [
                (i.action_kind.value if i.action_kind else None, i.title)
                for i in plan.items
            ]

    recent = await plan_with_carryover(1)
    overdue = await plan_with_carryover(6)

    recent_kinds = {k for k, _ in recent}
    overdue_kinds = {k for k, _ in overdue}

    # With one day of slippage the fresh concept still wins the main slot.
    assert "create_content" in recent_kinds, recent
    # After a week it does not.
    assert "create_content" not in overdue_kinds, overdue
    assert any(t == "Slipped work" for _, t in overdue), overdue
    # The day still holds a single main action.
    main = [k for k, _ in overdue if k in ("create_content", "continue_draft")]
    assert len(main) == 1, overdue
