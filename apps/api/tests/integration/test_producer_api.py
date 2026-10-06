"""Today and Producer API tests against real PostgreSQL and RLS.

Covers authentication, validation, CRUD, state transitions, duplicate prevention,
the job-based planning path, the Studio handoff, and every error branch a creator
can actually hit.
"""
from __future__ import annotations

import json
import uuid
from datetime import date, timedelta

import pytest
from sqlalchemy import text

from app.llm.gateway import LLMGateway, set_llm_gateway
from app.llm.providers import ScriptedLLMProvider
from app.producer.contracts import ActionKind
from tests.conftest import USER_A, admin_db, client_for, rls_session

pytestmark = pytest.mark.asyncio

TODAY = date(2026, 3, 10)

#: A valid enrichment response: same set, re-worded.
ENRICH_JSON = json.dumps({
    "recommendations": [
        {
            "kind": "create",
            "title": "Launch timing reel for solo creators",
            "reason": "Your niche and your Tuesday launch result point here.",
        }
    ]
})


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


def _gateway(script=None):
    provider = ScriptedLLMProvider(script=script or [ENRICH_JSON])
    set_llm_gateway(LLMGateway(providers={provider.name: provider}))
    return provider


async def _seed_rich_creator(user_id, *, niche="launch timing for solo creators"):
    """A creator with enough context for the Producer to recommend something."""
    async with rls_session(user_id) as db:
        await db.execute(
            text("""
                INSERT INTO creator_profiles
                    (user_id, full_name, niche, target_audience, primary_platform,
                     content_goals)
                VALUES (:u, 'Test', :n, 'solo creators who ship weekly', 'reel',
                        '["education"]')
                ON CONFLICT (user_id) DO UPDATE SET niche = :n
            """),
            {"u": str(user_id), "n": niche},
        )
        await db.execute(
            text("INSERT INTO content_assets (user_id, title, source_type, raw_text) "
                 "VALUES (:u, 'Earlier reel', 'studio', 'Earlier work body')"),
            {"u": str(user_id)},
        )
        await db.commit()

    from app.memory import IngestRequest, MemoryCategory, SourceType, get_memory_engine

    async with rls_session(user_id) as db:
        await get_memory_engine(db, user_id).ingest(IngestRequest(
            title="Launch lesson",
            raw_text=("I launched on a Tuesday and got 400 signups in 48 hours. "
                      "Waiting three weeks to email my list was the mistake."),
            source_type=SourceType.NOTE,
            category=MemoryCategory.LESSON,
        ))


async def _clear_plan(user_id, day: date = TODAY):
    async with rls_session(user_id) as db:
        await db.execute(
            text("DELETE FROM plan_items WHERE user_id = :u AND plan_date = :d"),
            {"u": str(user_id), "d": day},
        )
        await db.commit()


# --------------------------------------------------------------------------- #
# Health + auth
# --------------------------------------------------------------------------- #

async def test_today_health():
    from httpx import ASGITransport, AsyncClient

    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/today/health")
    assert response.status_code == 200
    body = response.json()
    assert body["phase"] == 4
    assert set(body["states"]) == {
        "planned", "in_progress", "completed", "skipped", "blocked"
    }


async def test_producer_health():
    from httpx import ASGITransport, AsyncClient

    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/producer/health")
    assert response.status_code == 200
    assert "no_action" in response.json()["recommendation_kinds"]


@pytest.mark.parametrize("path,method", [
    ("/api/today", "get"),
    ("/api/today/plan", "post"),
    ("/api/producer/recommend", "post"),
    ("/api/producer/execute", "post"),
])
async def test_endpoints_require_authentication(path, method):
    from httpx import ASGITransport, AsyncClient

    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        call = getattr(ac, method)
        response = await call(path, json={}) if method == "post" else await call(path)
    assert response.status_code == 401


# --------------------------------------------------------------------------- #
# Recommend (preview, no persistence)
# --------------------------------------------------------------------------- #

async def test_recommend_previews_without_persisting(client_a):
    _gateway()
    await _seed_rich_creator(USER_A)
    await _clear_plan(USER_A)

    async with client_a as ac:
        response = await ac.post("/api/producer/recommend", json={"plan_date": str(TODAY)})
        after = await ac.get(f"/api/today?date={TODAY}")

    assert response.status_code == 200
    body = response.json()
    assert body["has_action"] is True
    assert body["total"] >= 1
    # A preview must not create anything.
    assert after.json()["total"] == 0


async def test_recommend_returns_structured_evidence(client_a):
    _gateway()
    await _seed_rich_creator(USER_A)

    async with client_a as ac:
        response = await ac.post("/api/producer/recommend", json={"plan_date": str(TODAY)})

    body = response.json()
    recommendation = body["recommendations"][0]
    # The client never parses prose: everything it needs is structured.
    for field in ("kind", "reason", "priority", "action_kind", "suggested_capability",
                  "next_action", "evidence", "signals"):
        assert field in recommendation
    assert recommendation["evidence"], "a recommendation must carry evidence"
    assert recommendation["suggested_capability"]


async def test_recommend_context_summary_is_safe_to_return(client_a):
    """The response is logged; it must not carry the creator's content."""
    _gateway()
    await _seed_rich_creator(USER_A)

    async with client_a as ac:
        response = await ac.post("/api/producer/recommend", json={"plan_date": str(TODAY)})

    context = response.json()["context"]
    assert set(context) == {
        "has_profile", "has_voice", "memory_chunks", "unfinished_generations",
        "open_ideas", "recent_assets", "performance_records",
        "days_since_last_plan", "notes",
    }
    assert "400 signups" not in json.dumps(context)


async def test_sparse_creator_gets_an_explicit_no_action(client_a, user_b_id):
    """A creator with no context must be told so, not given invented work."""
    _gateway()
    async with rls_session(user_b_id) as db:
        await db.execute(
            text("DELETE FROM plan_items WHERE user_id = :u"), {"u": str(user_b_id)}
        )
        await db.commit()

    async with client_a as ac:
        response = await ac.post("/api/producer/recommend", json={"plan_date": str(TODAY)})

    body = response.json()
    assert body["has_action"] is False
    assert body["total"] == 0
    assert "context_sparse" in body["context"]["notes"]
    assert body["message"], "an empty plan must be explained, not silent"


async def test_recommend_rejects_an_out_of_range_budget(client_a):
    async with client_a as ac:
        response = await ac.post(
            "/api/producer/recommend", json={"time_budget_minutes": 5}
        )
    assert response.status_code == 422


async def test_recommend_rejects_a_malformed_date(client_a):
    async with client_a as ac:
        response = await ac.post(
            "/api/producer/recommend", json={"plan_date": "not-a-date"}
        )
    assert response.status_code == 422


# --------------------------------------------------------------------------- #
# Plan
# --------------------------------------------------------------------------- #

async def test_plan_persists_recommendations(client_a):
    _gateway()
    await _seed_rich_creator(USER_A)
    await _clear_plan(USER_A)

    async with client_a as ac:
        response = await ac.post(
            "/api/today/plan", params={"date": str(TODAY)},
            json={"time_budget_minutes": 120},
        )
        assert response.status_code == 201
        body = response.json()
        today = await ac.get(f"/api/today?date={TODAY}")

    assert body["total"] >= 1
    assert body["run"]["created_items"] == body["total"]
    assert today.json()["total"] == body["total"]


async def test_replanning_does_not_duplicate_work(client_a):
    """The dedupe guarantee is the point of re-running a plan safely."""
    _gateway()
    await _seed_rich_creator(USER_A)
    await _clear_plan(USER_A)

    async with client_a as ac:
        first = await ac.post(
            "/api/today/plan", params={"date": str(TODAY)}, json={}
        )
        second = await ac.post(
            "/api/today/plan", params={"date": str(TODAY)}, json={}
        )
        today = await ac.get(f"/api/today?date={TODAY}")

    assert first.json()["run"]["created_items"] >= 1
    assert second.json()["run"]["created_items"] == 0
    assert second.json()["run"]["skipped_duplicates"] >= 1
    assert today.json()["total"] == first.json()["run"]["created_items"]


async def test_loading_today_does_not_regenerate_a_plan(client_a):
    """Refreshing Today must not reshuffle the day."""
    _gateway()
    await _seed_rich_creator(USER_A)
    await _clear_plan(USER_A)

    async with client_a as ac:
        await ac.post("/api/today/plan", params={"date": str(TODAY)}, json={})
        first = (await ac.get(f"/api/today?date={TODAY}")).json()
        second = (await ac.get(f"/api/today?date={TODAY}")).json()

    assert first["items"] == second["items"]


async def test_plan_through_the_job_system(client_a):
    """Planning via JobService, using the existing queue infrastructure."""
    _gateway()
    await _seed_rich_creator(USER_A)
    await _clear_plan(USER_A)

    async with client_a as ac:
        response = await ac.post(
            "/api/today/plan", params={"date": str(TODAY)},
            json={"asynchronous": True},
        )

    assert response.status_code == 201
    body = response.json()
    assert body["job_id"], "an async plan must produce a job"
    assert body["job_status"] == "completed"
    assert body["items"], "the job must have produced the plan"

    async with admin_db() as db:
        job = (await db.execute(
            text("SELECT job_type, status, metadata FROM jobs WHERE id = :i"),
            {"i": uuid.UUID(body["job_id"])},
        )).mappings().one()
    assert job["job_type"] == "producer_plan"
    assert job["status"] == "completed"
    # JobService.complete() stores the worker's return value under `result`.
    result = job["metadata"]["result"]
    assert result["recommendations"] >= 1
    assert result["created_items"] >= 1
    assert result["latency_ms"] > 0


async def test_plan_rejects_unknown_fields(client_a):
    async with client_a as ac:
        response = await ac.post(
            "/api/today/plan", json={"time_budget_minutes": 120, "user_id": str(USER_A)}
        )
    assert response.status_code == 422


async def test_plan_rejects_an_invalid_date(client_a):
    async with client_a as ac:
        response = await ac.post(
            "/api/today/plan", params={"date": "2026-13-45"}, json={}
        )
    assert response.status_code == 422


# --------------------------------------------------------------------------- #
# Manual items
# --------------------------------------------------------------------------- #

async def test_creator_can_add_an_item(client_a):
    await _clear_plan(USER_A)
    async with client_a as ac:
        response = await ac.post(
            "/api/today/items", params={"date": str(TODAY)},
            json={"title": "Film a b-roll batch", "estimated_minutes": 45},
        )

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Film a b-roll batch"
    assert body["source"] == "creator"
    assert body["status"] == "planned"


async def test_creator_item_rejects_a_blank_title(client_a):
    async with client_a as ac:
        response = await ac.post(
            "/api/today/items", params={"date": str(TODAY)}, json={"title": "   "}
        )
    assert response.status_code == 422


async def test_creator_item_rejects_a_ownership_override(client_a):
    async with client_a as ac:
        response = await ac.post(
            "/api/today/items", params={"date": str(TODAY)},
            json={"title": "ok", "user_id": str(uuid.uuid4())},
        )
    assert response.status_code == 422


async def test_creator_item_accepts_an_action_kind(client_a):
    await _clear_plan(USER_A)
    async with client_a as ac:
        response = await ac.post(
            "/api/today/items", params={"date": str(TODAY)},
            json={"title": "Repurpose the old reel", "action_kind": "repurpose"},
        )
    assert response.status_code == 201
    assert response.json()["action_kind"] == "repurpose"


# --------------------------------------------------------------------------- #
# State transitions
# --------------------------------------------------------------------------- #

async def _an_item(_unused, title="Work item"):
    """Create a manual item using a FRESH client.

    The `client_a` fixture is a single-use async context manager, so a helper
    cannot enter it and leave it for the caller to use again.
    """
    async with client_for(USER_A) as ac:
        response = await ac.post(
            "/api/today/items", params={"date": str(TODAY)}, json={"title": title}
        )
    return response.json()


async def test_transition_planned_to_in_progress(client_a):
    item = await _an_item(client_a)
    async with client_a as ac:
        response = await ac.patch(
            f"/api/today/items/{item['id']}/status", json={"status": "in_progress"}
        )
    assert response.status_code == 200
    assert response.json()["status"] == "in_progress"
    assert response.json()["completed"] is False


async def test_transition_to_completed_sets_completed(client_a):
    item = await _an_item(client_a)
    async with client_a as ac:
        response = await ac.patch(
            f"/api/today/items/{item['id']}/status", json={"status": "completed"}
        )
    assert response.json()["status"] == "completed"
    assert response.json()["completed"] is True


async def test_completed_is_terminal(client_a):
    """A creator's record of what shipped must not be silently reopened."""
    item = await _an_item(client_a)
    async with client_a as ac:
        await ac.patch(
            f"/api/today/items/{item['id']}/status", json={"status": "completed"}
        )
        response = await ac.patch(
            f"/api/today/items/{item['id']}/status", json={"status": "planned"}
        )
    assert response.status_code == 409
    assert "terminal" in response.json()["detail"]


async def test_invalid_transition_explains_the_legal_moves(client_a):
    item = await _an_item(client_a)
    async with client_a as ac:
        response = await ac.patch(
            f"/api/today/items/{item['id']}/status", json={"status": "in_progress"}
        )
        again = await ac.patch(
            f"/api/today/items/{item['id']}/status", json={"status": "planned"}
        )
    # in_progress cannot go back to planned.
    assert again.status_code == 409
    detail = again.json()["detail"]
    for allowed in ("completed", "skipped"):
        assert allowed in detail


async def test_blocked_can_be_reopened(client_a):
    item = await _an_item(client_a)
    async with client_a as ac:
        await ac.patch(
            f"/api/today/items/{item['id']}/status", json={"status": "blocked"}
        )
        response = await ac.patch(
            f"/api/today/items/{item['id']}/status", json={"status": "planned"}
        )
    assert response.status_code == 200


async def test_transition_rejects_an_unknown_status(client_a):
    item = await _an_item(client_a)
    async with client_a as ac:
        response = await ac.patch(
            f"/api/today/items/{item['id']}/status", json={"status": "teleported"}
        )
    assert response.status_code == 422


async def test_transition_on_a_missing_item_is_404(client_a):
    async with client_a as ac:
        response = await ac.patch(
            f"/api/today/items/{uuid.uuid4()}/status", json={"status": "completed"}
        )
    assert response.status_code == 404


# --------------------------------------------------------------------------- #
# Item CRUD
# --------------------------------------------------------------------------- #

async def test_get_update_and_delete_an_item(client_a):
    item = await _an_item(client_a)

    async with client_a as ac:
        read = await ac.get(f"/api/today/items/{item['id']}")
        assert read.status_code == 200

        updated = await ac.patch(
            f"/api/today/items/{item['id']}",
            json={"title": "Renamed", "estimated_minutes": 60},
        )
        assert updated.status_code == 200
        assert updated.json()["title"] == "Renamed"
        assert updated.json()["estimated_minutes"] == 60

        deleted = await ac.delete(f"/api/today/items/{item['id']}")
        assert deleted.status_code == 204

        gone = await ac.get(f"/api/today/items/{item['id']}")
        assert gone.status_code == 404


async def test_update_is_partial(client_a):
    item = await _an_item(client_a)
    async with client_a as ac:
        response = await ac.patch(f"/api/today/items/{item['id']}", json={"title": "New"})
    assert response.json()["estimated_minutes"] == item["estimated_minutes"]


async def test_delete_missing_item_is_404(client_a):
    async with client_a as ac:
        response = await ac.delete(f"/api/today/items/{uuid.uuid4()}")
    assert response.status_code == 404


async def test_carryover_endpoint(client_a):
    async with rls_session(USER_A) as db:
        await db.execute(
            text("DELETE FROM plan_items WHERE user_id = :u"), {"u": str(USER_A)}
        )
        await db.execute(
            text("""
                INSERT INTO plan_items (user_id, plan_date, title, platform, status)
                VALUES (:u, :d, 'Slipped item', 'reel', 'planned')
            """),
            {"u": str(USER_A), "d": TODAY - timedelta(days=3)},
        )
        await db.commit()

    async with client_a as ac:
        response = await ac.get("/api/today/carryover")

    assert response.status_code == 200
    titles = [i["title"] for i in response.json()["items"]]
    assert "Slipped item" in titles


# --------------------------------------------------------------------------- #
# Studio handoff
# --------------------------------------------------------------------------- #

async def test_execute_hands_off_to_studio_without_generating(client_a):
    """The Producer prepares; Studio generates. Nothing is created here."""
    _gateway()
    await _seed_rich_creator(USER_A)
    await _clear_plan(USER_A)

    async with client_a as ac:
        await ac.post("/api/today/plan", params={"date": str(TODAY)}, json={})
        item = (await ac.get(f"/api/today?date={TODAY}")).json()["items"][0]

        response = await ac.post(
            "/api/producer/execute", json={"item_id": item["id"]}
        )

    assert response.status_code == 200
    body = response.json()
    assert body["capability"]
    assert body["input"], "a capability-shaped payload must be prepared"
    assert body["studio_session_id"]
    assert body["session_created"] is True
    assert f"/studio?session={body['studio_session_id']}" == body["studio_url"]

    # The handoff created a Studio session but NO generation.
    async with admin_db() as db:
        generations = (await db.execute(
            text("SELECT COUNT(*) FROM studio_generations WHERE session_id = :s"),
            {"s": uuid.UUID(body["studio_session_id"])},
        )).scalar()
    assert generations == 0, "the Producer must not generate content"


async def test_handoff_moves_the_item_to_in_progress_and_links_it(client_a):
    _gateway()
    await _seed_rich_creator(USER_A)
    await _clear_plan(USER_A)

    async with client_a as ac:
        await ac.post("/api/today/plan", params={"date": str(TODAY)}, json={})
        item = (await ac.get(f"/api/today?date={TODAY}")).json()["items"][0]
        handoff = (
            await ac.post("/api/producer/execute", json={"item_id": item["id"]})
        ).json()
        after = (await ac.get(f"/api/today/items/{item['id']}")).json()

    assert after["status"] == "in_progress"
    assert after["studio_session_id"] == handoff["studio_session_id"]


async def test_execute_continues_an_existing_session(client_a):
    _gateway()
    await _seed_rich_creator(USER_A)
    await _clear_plan(USER_A)

    session_id = uuid.uuid4()
    async with rls_session(USER_A) as db:
        await db.execute(
            text("INSERT INTO studio_sessions (id, user_id, title) "
                 "VALUES (:s, :u, 'Existing session')"),
            {"s": str(session_id), "u": str(USER_A)},
        )
        await db.commit()

    async with client_a as ac:
        await ac.post("/api/today/plan", params={"date": str(TODAY)}, json={})
        item = (await ac.get(f"/api/today?date={TODAY}")).json()["items"][0]
        response = await ac.post(
            "/api/producer/execute",
            json={"item_id": item["id"], "studio_session_id": str(session_id)},
        )

    assert response.status_code == 200
    assert response.json()["studio_session_id"] == str(session_id)
    assert response.json()["session_created"] is False


async def test_execute_refuses_a_completed_item(client_a):
    _gateway()
    await _seed_rich_creator(USER_A)
    await _clear_plan(USER_A)

    async with client_a as ac:
        await ac.post("/api/today/plan", params={"date": str(TODAY)}, json={})
        item = (await ac.get(f"/api/today?date={TODAY}")).json()["items"][0]
        await ac.patch(
            f"/api/today/items/{item['id']}/status", json={"status": "completed"}
        )
        response = await ac.post(
            "/api/producer/execute", json={"item_id": item["id"]}
        )

    assert response.status_code == 409


async def test_execute_refuses_a_creator_item_without_a_capability(client_a):
    """A manual item has no capability; the Producer must not invent one."""
    item = await _an_item(client_a, "Manual task")
    async with client_a as ac:
        response = await ac.post(
            "/api/producer/execute", json={"item_id": item["id"]}
        )
    assert response.status_code == 409
    assert "Studio" in response.json()["detail"]


async def test_execute_missing_item_is_404(client_a):
    async with client_a as ac:
        response = await ac.post(
            "/api/producer/execute", json={"item_id": str(uuid.uuid4())}
        )
    assert response.status_code == 404


async def test_execute_rejects_a_malformed_item_id(client_a):
    async with client_a as ac:
        response = await ac.post(
            "/api/producer/execute", json={"item_id": "not-a-uuid"}
        )
    assert response.status_code == 422


async def test_today_reflects_studio_progress(client_a):
    """Studio owns generation state; Today reads it rather than duplicating it."""
    _gateway()
    await _seed_rich_creator(USER_A)
    await _clear_plan(USER_A)

    async with client_a as ac:
        await ac.post("/api/today/plan", params={"date": str(TODAY)}, json={})
        item = (await ac.get(f"/api/today?date={TODAY}")).json()["items"][0]
        handoff = (
            await ac.post("/api/producer/execute", json={"item_id": item["id"]})
        ).json()

        # Simulate Studio having generated a version.
        async with rls_session(USER_A) as db:
            asset_id = uuid.uuid4()
            await db.execute(
                text("INSERT INTO content_assets "
                     "(id, user_id, title, source_type, raw_text) "
                     "VALUES (:a, :u, 'Generated', 'studio', 'Body')"),
                {"a": str(asset_id), "u": str(USER_A)})
            await db.execute(
                text("""
                    INSERT INTO studio_generations
                        (user_id, session_id, asset_id, version, capability)
                    VALUES (:u, :s, :a, 1, 'idea')
                """),
                {"u": str(USER_A), "s": handoff["studio_session_id"],
                 "a": str(asset_id)})
            await db.commit()

        after = (await ac.get(f"/api/today?date={TODAY}")).json()

    assert after["counts"]["completed"] == 1
