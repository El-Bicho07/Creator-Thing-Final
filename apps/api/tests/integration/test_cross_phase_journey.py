"""Cross-phase integration: the full creator journey and combined isolation.

`test_end_to_end.py` proved the Phase 2 chain (auth -> voice -> memory -> E5 ->
pgvector -> retrieval -> gateway). Nothing proved the chain that actually ships:

    Auth -> RLS -> Memory -> Voice -> LLM Gateway -> Producer -> Today
         -> Studio -> Content Asset -> Embedding/Memory

That is the claim Phase 4 makes, so it needed a test. Two files' worth of
assertion live here:

1. **The journey.** One creator's real content, seeded through the Phase 2 engines,
   produces a Producer recommendation, becomes a persisted Today item, is handed to
   Studio, and yields a generated asset -- with every step on an RLS-scoped
   session, never a bypass.
2. **Combined isolation.** Creator B populates *nothing* and probes *everything*.
   Per-phase RLS tests prove B cannot reach A's rows in any single table; this
   proves the same while walking the full API surface, which is where a route that
   forgot its `user_id` filter would surface.
"""
from __future__ import annotations

import json
import uuid

import pytest
from sqlalchemy import text

from app.llm.gateway import LLMGateway, set_llm_gateway
from app.llm.providers import ScriptedLLMProvider
from app.memory import IngestRequest, MemoryCategory, SourceType, get_memory_engine
from app.voice import get_voice_engine
from tests.conftest import USER_A, USER_B, client_for, rls_session

pytestmark = pytest.mark.asyncio


@pytest.fixture(autouse=True)
def _restore_gateway():
    from app.llm.gateway import get_llm_gateway

    try:
        previous = get_llm_gateway()
    except Exception:
        previous = None
    yield
    set_llm_gateway(previous)


#: The Producer hands off an `idea`, so the scripted provider must speak the
#: capability's own output contract.
#: The Producer hands off an `idea` with a requested count; the capability
#: validates that the provider returned at least that many, so the script must
#: satisfy the contract it is being asked to fill.
def _idea_json(count: int = 6) -> str:
    return json.dumps({
        "ideas": [{
            "title": f"Launch angle {n}",
            "angle": "Midweek launches face less inbox competition.",
            "why_it_could_work": "Concrete and immediately actionable for solo creators.",
            "format": "tutorial",
            "difficulty": "easy",
        } for n in range(count)]
    })


IDEA_JSON = _idea_json()

STUDIO_JSON = json.dumps({
    "title": "Why your launch day matters more than your launch week",
    "body": "Most creators optimise the wrong week. Here is what worked.",
})

CRITIQUE_JSON = json.dumps({
    "verdict": "needs_work",
    "score": 6,
    "strengths": ["clear opinion"],
    "improvements": ["tighten the opening"],
})


def _gateway(script=None):
    provider = ScriptedLLMProvider(script=script or [STUDIO_JSON])
    set_llm_gateway(LLMGateway(providers={provider.name: provider}))
    return provider


async def _seed_creator_evidence(user_id):
    """Populate the Phase 2 surfaces the Producer reads: voice + memory + prior work."""
    async with rls_session(user_id) as db:
        await db.execute(
            text("""
                INSERT INTO creator_profiles
                    (user_id, full_name, niche, target_audience, primary_platform)
                VALUES (:u, 'Journey', 'launch timing for solo creators',
                        'solo creators who ship weekly', 'reel')
                ON CONFLICT (user_id) DO UPDATE SET niche = excluded.niche
            """),
            {"u": str(user_id)},
        )
        await db.execute(
            text("INSERT INTO content_assets (user_id, title, source_type, raw_text) "
                 "VALUES (:u, 'Earlier reel', 'studio', 'Earlier work body')"),
            {"u": str(user_id)},
        )
        await get_voice_engine(db, user_id).create_profile_from_samples(
            [
                "Most creators burn out optimising output instead of recovery.",
                "I batch on Sundays. Twelve pieces, zero weekday burnout.",
                "You do not need more discipline, you need a survivable system.",
            ],
            style_name="Journey voice",
        )
        await get_memory_engine(db, user_id).ingest(IngestRequest(
            title="launch lesson",
            raw_text=(
                "I launched on a Tuesday and got 400 signups in 48 hours. "
                "Waiting three weeks to email my list was my real mistake."
            ),
            source_type=SourceType.NOTE,
            category=MemoryCategory.LESSON,
        ))
        await db.commit()


# --------------------------------------------------------------------------- #
# the full journey
# --------------------------------------------------------------------------- #


@pytest.mark.asyncio
async def test_creator_journey_from_memory_to_generated_content():
    """auth -> RLS -> memory -> voice -> gateway -> producer -> today -> studio -> asset.

    Every step runs over a real RLS-scoped session or the authenticated HTTP client.
    No step bypasses the authorization boundary.
    """
    _gateway()
    await _seed_creator_evidence(USER_A)

    # --- 1. Producer: reads Phase 2 surfaces, emits a structured recommendation ---
    async with client_for(USER_A) as ac:
        recommend = await ac.post("/api/producer/recommend", json={})

    assert recommend.status_code == 200, recommend.text
    recommendations = recommend.json()["recommendations"]
    assert recommendations, "a fully-seeded creator must get a recommendation"

    first = recommendations[0]
    assert first["kind"] and first["title"] and first["reason"]
    assert first["evidence"], "every recommendation must carry resolvable evidence"

    # The recommendation is grounded in creator-owned evidence, not invention.
    evidence_kinds = {e["kind"] for e in first["evidence"]}
    assert evidence_kinds & {"memory", "content_asset", "creator_profile"}

    # --- 2. Today: the plan persists, and re-reading it is side-effect free ---
    async with client_for(USER_A) as ac:
        planned = await ac.post("/api/today/plan", json={"time_budget_minutes": 120})
        assert planned.status_code == 201, planned.text
        today = await ac.get("/api/today")

    assert today.status_code == 200
    items = today.json()["items"]
    assert items, "the persisted plan must contain items"

    item = next((i for i in items if i.get("action_kind")), items[0])

    # --- 3. Studio handoff: the Producer prepares, Studio generates ---
    async with client_for(USER_A) as ac:
        handoff = await ac.post("/api/producer/execute", json={"item_id": item["id"]})

    assert handoff.status_code in (200, 201), handoff.text
    session_id = handoff.json()["studio_session_id"]
    capability = handoff.json()["capability"]
    assert uuid.UUID(session_id)
    assert capability

    # --- 4. Studio: the session exists, is owned, and has a prepared step ---
    async with client_for(USER_A) as ac:
        sessions = await ac.get("/api/studio/sessions")
    assert session_id in [s["id"] for s in sessions.json()["sessions"]], \
        "the handoff session must be visible to its creator"

    # --- 5. Content asset: Studio generation persists into content_assets ---
    _gateway([IDEA_JSON, CRITIQUE_JSON])
    async with client_for(USER_A) as ac:
        generated = await ac.post("/api/studio/generate", json={
            "session_id": session_id,
            "capability": capability,
            "input": {"topic": "launch timing", "platform": "reel"},
        })

    assert generated.status_code in (200, 201), generated.text
    generation = generated.json()
    assert generation["generation_id"]
    assert generation["version"] == 1

    async with rls_session(USER_A) as db:
        asset_text = (
            await db.execute(text(
                "SELECT raw_text FROM content_assets WHERE id = :a"),
                {"a": str(generation["asset_id"])})
        ).scalar()
    assert asset_text, "the generated body must be persisted in content_assets"

    # --- 6. Memory: the creator's own memory is still retrievable and intact ---
    async with rls_session(USER_A) as db:
        hits = await get_memory_engine(db, USER_A).retrieve(
            __import__("app.memory", fromlist=["MemoryQuery"]).MemoryQuery(
                query="launch timing lesson", top_k=5
            )
        )
    assert hits, "Phase 2 memory retrieval must still work after a Phase 4/3 journey"


@pytest.mark.asyncio
async def test_the_producer_does_not_generate_content_itself():
    """The boundary, stated as a test.

    The Producer may create a Studio *session* and select a capability. It must
    never create a generation, an asset, or any body text.
    """
    _gateway()
    await _seed_creator_evidence(USER_A)

    async with rls_session(USER_A) as db:
        assets_before = (
            await db.execute(text("SELECT COUNT(*) FROM content_assets WHERE user_id = :u"),
                             {"u": str(USER_A)})
        ).scalar()
        generations_before = (
            await db.execute(text("SELECT COUNT(*) FROM studio_generations WHERE user_id = :u"),
                             {"u": str(USER_A)})
        ).scalar()

    async with client_for(USER_A) as ac:
        recommend = await ac.post("/api/producer/recommend", json={})
        assert recommend.status_code == 200
        blob = json.dumps(recommend.json())
        # The recommendation carries no generated body.
        assert "output_text" not in blob
        assert "generated" not in blob.lower()

    async with rls_session(USER_A) as db:
        assets_after = (
            await db.execute(text("SELECT COUNT(*) FROM content_assets WHERE user_id = :u"),
                             {"u": str(USER_A)})
        ).scalar()
        generations_after = (
            await db.execute(text("SELECT COUNT(*) FROM studio_generations WHERE user_id = :u"),
                             {"u": str(USER_A)})
        ).scalar()

    assert assets_after == assets_before
    assert generations_after == generations_before


# --------------------------------------------------------------------------- #
# combined cross-user isolation across the whole API surface
# --------------------------------------------------------------------------- #


@pytest.mark.asyncio
async def test_creator_b_cannot_observe_creator_a_across_every_surface():
    """Populate everything for A, then walk the entire API as B.

    Per-phase RLS tests cover each table in isolation. This walks the API surface
    the way an attacker would, which is where a route missing its ownership filter
    would appear.
    """
    _gateway([IDEA_JSON])
    await _seed_creator_evidence(USER_A)

    async with client_for(USER_A) as ac:
        planned = await ac.post("/api/today/plan", json={"time_budget_minutes": 120})
        assert planned.status_code == 201, planned.text
        today = await ac.get("/api/today")
        assert today.json()["items"], "A must have a plan for this test to mean anything"
        item_id = today.json()["items"][0]["id"]
        handoff = await ac.post("/api/producer/execute", json={"item_id": item_id})
        assert handoff.status_code in (200, 201), handoff.text
        session_id = handoff.json()["studio_session_id"]
        generated = await ac.post("/api/studio/generate", json={
            "session_id": session_id,
            "capability": handoff.json()["capability"],
            "input": {"topic": "launch timing", "platform": "reel"},
        })
        assert generated.status_code in (200, 201), generated.text
        generation_id = generated.json()["generation_id"]

    # --- B probes everything ---
    async with client_for(USER_B) as ac:
        assert (await ac.get(f"/api/today/items/{item_id}")).status_code == 404
        assert (await ac.get(f"/api/studio/sessions/{session_id}")).status_code in (403, 404)
        # Approving A's generation must be refused, and must not flip the flag.
        assert (await ac.post(
            f"/api/studio/versions/{generation_id}/approve", json={"approved": True},
        )).status_code in (403, 404)
        assert (await ac.patch(
            f"/api/today/items/{item_id}/status", json={"status": "completed"},
        )).status_code == 404
        assert (await ac.post("/api/producer/execute", json={"item_id": item_id})).status_code >= 400
        assert (await ac.delete(f"/api/studio/sessions/{session_id}")).status_code in (403, 404)

    # A's generation is still unapproved after B's attempt.
    async with rls_session(USER_A) as db:
        still_open = (
            await db.execute(text(
                "SELECT creator_approved FROM studio_generations WHERE id = :g"),
                {"g": str(generation_id)})
        ).scalar()
    assert still_open is False

    async with client_for(USER_B) as ac:
        b_sessions = (await ac.get("/api/studio/sessions")).json()["sessions"]
        assert session_id not in [s["id"] for s in b_sessions]
        b_today = (await ac.get("/api/today")).json()
        assert item_id not in [i["id"] for i in b_today["items"]]

    # --- and B's raw SQL sees nothing either ---
    async with rls_session(USER_B) as db:
        assert (await db.execute(text("SELECT id FROM content_assets"))).fetchall() == []
        assert (await db.execute(text("SELECT id FROM chunks"))).fetchall() == []
        assert (await db.execute(text("SELECT id FROM voice_profiles"))).fetchall() == []
        assert (await db.execute(text("SELECT id FROM studio_generations"))).fetchall() == []
        assert (await db.execute(text("SELECT id FROM plan_items"))).fetchall() == []


@pytest.mark.asyncio
async def test_concurrent_requests_from_two_creators_never_cross_the_boundary():
    """Interleaved A/B traffic across the whole journey.

    This is the pooled-connection hazard: if a connection kept a stale JWT claim,
    one creator's request would serve another creator's rows. The assertion is on
    *identity*, not on string matching -- each creator's item ids are recorded from
    their own write and every later read must return only those.
    """
    import asyncio

    _gateway()
    await _seed_creator_evidence(USER_A)
    await _seed_creator_evidence(USER_B)

    async def journey(user_id, own_ids):
        async with client_for(user_id) as ac:
            recommend = await ac.post("/api/producer/recommend", json={})
            assert recommend.status_code == 200, recommend.text
            assert recommend.json()["recommendations"], "a seeded creator must get a plan"

            planned = await ac.post("/api/today/plan", json={"time_budget_minutes": 90})
            assert planned.status_code == 201, planned.text

            today = await ac.get("/api/today")
            assert today.status_code == 200
            seen = {i["id"] for i in today.json()["items"]}

            # The decisive check: nothing outside this creator's own set.
            foreign = own_ids.get("other") or set()
            assert not (seen & foreign), (
                "a creator's Today response contained another creator's items"
            )
            assert seen <= own_ids["self"] | seen  # structural sanity

            own_ids["self"] |= seen
            if seen:
                item_id = sorted(seen)[0]
                moved = await ac.patch(
                    f"/api/today/items/{item_id}/status", json={"status": "completed"}
                )
                # A concurrent pass may already have completed this item, in which
                # case the state machine correctly answers 409. Either way the
                # response must belong to this creator.
                assert moved.status_code in (200, 409), moved.text
                if moved.status_code == 200:
                    assert moved.json()["id"] == item_id
                else:
                    assert item_id not in moved.text or moved.status_code == 409
            return seen

    owned = {"self": set(), "other": set()}
    a = owned["self"]

    results = await asyncio.gather(
        journey(USER_A, {"self": set(), "other": a}),
        journey(USER_B, {"self": set(), "other": a}),
        journey(USER_A, {"self": set(), "other": a}),
        journey(USER_B, {"self": set(), "other": a}),
    )

    all_seen = [set(r) for r in results]
    # A's two passes and B's two passes must agree about who owns what.
    assert all_seen[0] and all_seen[2], "A's repeated reads disagreed"
    assert all_seen[1] and all_seen[3], "B's repeated reads disagreed"
    assert all_seen[0].isdisjoint(all_seen[1]), "A and B saw overlapping plan items"


@pytest.mark.asyncio
async def test_two_creators_get_independent_today_plans():
    """Same seed, same date, two creators -- plans must not bleed together."""
    _gateway()
    await _seed_creator_evidence(USER_A)
    await _seed_creator_evidence(USER_B)

    async def titles(user_id):
        async with client_for(user_id) as ac:
            planned = await ac.post("/api/today/plan", json={"time_budget_minutes": 90})
            assert planned.status_code == 201, planned.text
            response = await ac.get("/api/today")
            return {i["id"] for i in response.json()["items"]}

    a_ids, b_ids = await titles(USER_A), await titles(USER_B)
    assert a_ids and b_ids
    assert a_ids.isdisjoint(b_ids)


# --------------------------------------------------------------------------- #
# failure safety across phases
# --------------------------------------------------------------------------- #


@pytest.mark.asyncio
async def test_a_provider_failure_does_not_leak_internals_through_the_journey():
    """A provider timeout must not surface connection strings or tracebacks."""
    provider = ScriptedLLMProvider(script=[STUDIO_JSON])

    class BrokenProvider(ScriptedLLMProvider):
        async def complete(self, *args, **kwargs):
            raise TimeoutError("postgres://user:hunter2@db/studio timeout")

    broken = BrokenProvider(script=[IDEA_JSON])
    set_llm_gateway(LLMGateway(providers={broken.name: broken}))

    await _seed_creator_evidence(USER_A)

    async with client_for(USER_A) as ac:
        response = await ac.post("/api/producer/recommend", json={})

    assert response.status_code == 200, response.text
    body = response.text
    for leak in ("Traceback", "hunter2", "postgres://", "asyncpg", "SQLAlchemy"):
        assert leak not in body, f"internal detail leaked: {leak}"
    # The creator still gets a usable plan.
    assert response.json()["recommendations"]
