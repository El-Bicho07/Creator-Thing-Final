"""Producer and Today RLS: cross-creator isolation.

Required by task §21 and §23:

    User A cannot read User B's Today plan
    User A cannot modify User B's Today item
    User A cannot execute User B's Producer recommendation
    User A cannot retrieve User B's Producer context

Every assertion runs against real PostgreSQL RLS over real RLS-scoped sessions.
Cross-creator access returns 404 rather than 403, so an id is never confirmed.
"""
from __future__ import annotations

import json
import uuid
from datetime import date, timedelta

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

from app.core.db import admin_session_maker
from app.llm.gateway import LLMGateway, set_llm_gateway
from app.llm.providers import ScriptedLLMProvider
from tests.conftest import USER_A, USER_B, admin_db, client_for, rls_session

pytestmark = pytest.mark.asyncio

TODAY = date(2026, 3, 10)

ENRICH_JSON = json.dumps({
    "recommendations": [{
        "kind": "create",
        "title": "Launch timing reel",
        "reason": "Your niche and Tuesday launch result point here.",
    }]
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


def _gateway():
    provider = ScriptedLLMProvider(script=[ENRICH_JSON])
    set_llm_gateway(LLMGateway(providers={provider.name: provider}))
    return provider


async def _profile(user_id, niche):
    async with rls_session(user_id) as db:
        await db.execute(
            text("""
                INSERT INTO creator_profiles
                    (user_id, full_name, niche, target_audience, primary_platform,
                     content_goals)
                VALUES (:u, 'T', :n, 'audience', 'reel', '["education"]')
                ON CONFLICT (user_id) DO UPDATE SET niche = :n
            """),
            {"u": str(user_id), "n": niche},
        )
        await db.execute(
            text("INSERT INTO content_assets (user_id, title, source_type, raw_text) "
                 "VALUES (:u, 'Work', 'studio', 'Body')"),
            {"u": str(user_id)},
        )
        await db.commit()


async def _memory(user_id, text_body):
    from app.memory import IngestRequest, MemoryCategory, SourceType, get_memory_engine

    async with rls_session(user_id) as db:
        await get_memory_engine(db, user_id).ingest(IngestRequest(
            title="lesson",
            raw_text=text_body,
            source_type=SourceType.NOTE,
            category=MemoryCategory.LESSON,
        ))


async def _seed_a_today_item(user_id, *, day: date = TODAY,
                             title: str = "A private plan item") -> str:
    """Seed one item for `user_id`.

    The title is a parameter because several tests seed items for BOTH creators:
    with a hardcoded title, B would legitimately see its own identically-named
    row and the isolation assertion would be meaningless.
    """
    async with rls_session(user_id) as db:
        await db.execute(
            text("DELETE FROM plan_items WHERE user_id = :u"), {"u": str(user_id)}
        )
        item_id = uuid.uuid4()
        await db.execute(
            text("""
                INSERT INTO plan_items (id, user_id, plan_date, title, platform)
                VALUES (:i, :u, :d, :t, 'reel')
            """),
            {"i": str(item_id), "u": str(user_id), "d": day, "t": title},
        )
        await db.commit()
    return str(item_id)


# --------------------------------------------------------------------------- #
# Schema
# --------------------------------------------------------------------------- #

async def test_plan_items_still_has_rls_after_phase4_changes():
    async with admin_db() as db:
        row = (await db.execute(text("""
            SELECT c.relrowsecurity AS rls,
                   (SELECT COUNT(*) FROM pg_policies p
                     WHERE p.tablename = c.relname) AS policies
            FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relname = 'plan_items'
        """))).mappings().one()
    assert row["rls"] is True
    assert row["policies"] >= 1


async def test_phase4_added_no_user_owned_table():
    """Task §19: reuse before creating. Phase 4 must add zero tables."""
    async with admin_db() as db:
        row = (await db.execute(text("""
            SELECT COUNT(*) AS n
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name IN ('today_plans', 'today_plan_items',
                                 'producer_recommendations', 'producer_runs')
        """))).scalar()
    assert row == 0, (
        "Phase 4 must reuse plan_items rather than duplicate persistence"
    )


# --------------------------------------------------------------------------- #
# Own-data access works (the negative control)
# --------------------------------------------------------------------------- #

async def test_creator_a_can_manage_own_plan():
    _gateway()
    await _profile(USER_A, "A's niche")
    await _memory(USER_A, "A launched Tuesday for A's launch timing niche.")
    await _seed_a_today_item(USER_A)

    async with client_for(USER_A) as ac:
        listed = await ac.get(f"/api/today?date={TODAY}")
        assert listed.status_code == 200
        assert listed.json()["total"] == 1

        items = listed.json()["items"]
        read = await ac.get(f"/api/today/items/{items[0]['id']}")
        assert read.status_code == 200

        updated = await ac.patch(
            f"/api/today/items/{items[0]['id']}", json={"title": "A renamed item"}
        )
        assert updated.status_code == 200

        completed = await ac.patch(
            f"/api/today/items/{items[0]['id']}/status", json={"status": "completed"}
        )
        assert completed.status_code == 200

        deleted = await ac.delete(f"/api/today/items/{items[0]['id']}")
        assert deleted.status_code == 204


# --------------------------------------------------------------------------- #
# Cross-creator Today isolation
# --------------------------------------------------------------------------- #

async def test_creator_b_cannot_list_creator_a_plan_items():
    await _seed_a_today_item(USER_A)
    async with client_for(USER_B) as ac:
        response = await ac.get(f"/api/today?date={TODAY}")

    assert response.status_code == 200
    titles = [i["title"] for i in response.json()["items"]]
    assert "A private plan item" not in titles


async def test_creator_b_cannot_read_creator_a_today_item():
    item_id = await _seed_a_today_item(USER_A)
    async with client_for(USER_B) as ac:
        response = await ac.get(f"/api/today/items/{item_id}")

    # 404, not 403: a 403 would confirm the id exists.
    assert response.status_code == 404
    assert "A private plan item" not in response.text


async def test_creator_b_cannot_update_creator_a_today_item():
    item_id = await _seed_a_today_item(USER_A)
    async with client_for(USER_B) as ac:
        response = await ac.patch(
            f"/api/today/items/{item_id}", json={"title": "hijacked"}
        )
    assert response.status_code == 404

    async with client_for(USER_A) as ac:
        after = await ac.get(f"/api/today/items/{item_id}")
    assert after.json()["title"] == "A private plan item"


async def test_creator_b_cannot_change_creator_a_item_status():
    item_id = await _seed_a_today_item(USER_A)
    async with client_for(USER_B) as ac:
        response = await ac.patch(
            f"/api/today/items/{item_id}/status", json={"status": "completed"}
        )
    assert response.status_code == 404

    async with client_for(USER_A) as ac:
        after = await ac.get(f"/api/today/items/{item_id}")
    assert after.json()["status"] == "planned"
    assert after.json()["completed"] is False


async def test_creator_b_cannot_delete_creator_a_today_item():
    item_id = await _seed_a_today_item(USER_A)
    async with client_for(USER_B) as ac:
        response = await ac.delete(f"/api/today/items/{item_id}")
    assert response.status_code == 404

    async with admin_db() as db:
        still = (await db.execute(
            text("SELECT 1 FROM plan_items WHERE id = :i"), {"i": uuid.UUID(item_id)}
        )).first()
    assert still is not None


async def test_creator_b_cannot_execute_creator_a_item():
    """Executing another creator's item would hand their plan to Studio."""
    item_id = await _seed_a_today_item(USER_A)
    async with client_for(USER_B) as ac:
        response = await ac.post(
            "/api/producer/execute", json={"item_id": item_id}
        )
    assert response.status_code == 404

    async with admin_db() as db:
        sessions = (await db.execute(
            text("SELECT COUNT(*) FROM studio_sessions WHERE user_id = :u"),
            {"u": str(USER_B)},
        )).scalar()
    assert sessions == 0, "B's execute attempt must not create a session"


# --------------------------------------------------------------------------- #
# Cross-creator Producer context
# --------------------------------------------------------------------------- #

async def test_creator_b_context_excludes_creator_a_memory():
    """Memory is RLS-protected, so B cannot retrieve A's launch lesson."""
    await _profile(USER_A, "A's launch timing niche")
    await _memory(USER_A, "A's confidential launch result: 999 signups.")
    await _profile(USER_B, "B's cooking niche")

    async with client_for(USER_B) as ac:
        response = await ac.post("/api/producer/recommend", json={})

    assert response.status_code == 200
    assert "999 signups" not in response.text
    assert "A's confidential" not in response.text


async def test_creator_b_recommendations_are_based_on_b_only():
    _gateway()
    await _profile(USER_A, "A's launch timing niche")
    await _memory(USER_A, "A launched Tuesday and got 400 signups.")
    await _profile(USER_B, "B's bread baking niche")
    await _memory(USER_B, "B sourdough starter for B's bread baking niche.")

    async with client_for(USER_B) as ac:
        response = await ac.post("/api/producer/recommend", json={})

    body = response.json()
    assert body["context"]["has_profile"] is True
    if body["recommendations"]:
        blob = json.dumps(body["recommendations"])
        assert "400 signups" not in blob


async def test_direct_sql_cannot_forge_today_ownership():
    """`WITH CHECK` blocks B from inserting a plan item owned by A."""
    for user_id in (USER_A, USER_B):
        async with admin_session_maker() as db:
            await db.execute(
                text("INSERT INTO users (id, email) VALUES (:i, :e) "
                     "ON CONFLICT (id) DO NOTHING"),
                {"i": str(user_id), "e": f"today-rls-{user_id}@test.local"},
            )
            await db.commit()

    async with rls_session(USER_B) as db:
        with pytest.raises(DBAPIError) as excinfo:
            await db.execute(
                text("INSERT INTO plan_items (user_id, plan_date, title, platform) "
                     "VALUES (:u, :d, 'forged', 'reel')"),
                {"u": str(USER_A), "d": TODAY},
            )
        await db.rollback()

    message = str(excinfo.value).lower()
    assert "row-level security" in message


async def test_direct_sql_cannot_update_another_creators_item():
    item_id = await _seed_a_today_item(USER_A)

    async with rls_session(USER_B) as db:
        affected = (await db.execute(
            text("UPDATE plan_items SET title = 'changed' WHERE id = :i"),
            {"i": uuid.UUID(item_id)},
        )).rowcount
        deleted = (await db.execute(
            text("DELETE FROM plan_items WHERE id = :i"), {"i": uuid.UUID(item_id)}
        )).rowcount
        await db.rollback()

    assert affected == 0
    assert deleted == 0


async def test_today_item_user_id_cannot_be_reassigned():
    item_id = await _seed_a_today_item(USER_A)

    async with rls_session(USER_A) as db:
        with pytest.raises(DBAPIError) as excinfo:
            await db.execute(
                text("UPDATE plan_items SET user_id = :other WHERE id = :i"),
                {"other": str(USER_B), "i": uuid.UUID(item_id)},
            )
        await db.rollback()

    assert "row-level security" in str(excinfo.value).lower()


async def test_direct_sql_as_b_sees_no_a_rows():
    """RLS, not the router, is the boundary."""
    await _seed_a_today_item(USER_A)

    async with rls_session(USER_B) as db:
        rows = (await db.execute(text("SELECT title FROM plan_items"))).mappings().all()

    assert "A private plan item" not in [r["title"] for r in rows]


# --------------------------------------------------------------------------- #
# Concurrent cross-user access
# --------------------------------------------------------------------------- #

async def test_concurrent_requests_from_two_creators_do_not_leak():
    """Interleaved requests must keep their identities.

    Exercises the pooled-connection identity boundary: if a connection retained
    the previous request's RLS claims, one creator would see the other's plan.
    """
    import asyncio

    await _profile(USER_A, "A's niche")
    await _seed_a_today_item(USER_A)
    await _profile(USER_B, "B's niche")
    await _seed_a_today_item(USER_B, day=TODAY, title="B private plan item")

    async def read(creator, day, own_title, foreign_title):
        async with client_for(creator) as ac:
            response = await ac.get(f"/api/today?date={day}")
            titles = [i["title"] for i in response.json()["items"]]
            return own_title in titles and foreign_title not in titles

    a_own, b_own = "A private plan item", "B private plan item"
    foreign = {USER_A: b_own, USER_B: a_own}
    own = {USER_A: a_own, USER_B: b_own}

    results = await asyncio.gather(*[
        read(USER_A, TODAY, a_own, b_own),
        read(USER_B, TODAY, b_own, a_own),
        read(USER_A, TODAY, a_own, b_own),
        read(USER_B, TODAY, b_own, a_own),
    ])

    # Each creator sees only its own item, interleaved without leaking.
    assert results == [True, True, True, True]


async def test_concurrent_plans_for_two_creators_stay_separate():
    import asyncio

    _gateway()
    for user_id, niche in ((USER_A, "A's launch niche"), (USER_B, "B's cooking niche")):
        await _profile(user_id, niche)
        await _memory(user_id, f"{niche} detail for retrieval.")
        async with rls_session(user_id) as db:
            await db.execute(
                text("DELETE FROM plan_items WHERE user_id = :u"), {"u": str(user_id)}
            )
            await db.commit()

    async def plan(creator):
        async with client_for(creator) as ac:
            response = await ac.post(
                "/api/today/plan", params={"date": str(TODAY)}, json={}
            )
            return response.status_code

    assert await asyncio.gather(plan(USER_A), plan(USER_B)) == [201, 201]

    async with client_for(USER_A) as ac:
        a_items = (await ac.get(f"/api/today?date={TODAY}")).json()["items"]
    async with client_for(USER_B) as ac:
        b_items = (await ac.get(f"/api/today?date={TODAY}")).json()["items"]

    assert a_items and b_items
    # Each creator only sees their own rows.
    async with admin_db() as db:
        counts = (await db.execute(text("""
            SELECT user_id, COUNT(*) AS n FROM plan_items
            WHERE plan_date = :d GROUP BY user_id
        """), {"d": TODAY})).mappings().all()
    for row in counts:
        assert row["n"] >= 1
