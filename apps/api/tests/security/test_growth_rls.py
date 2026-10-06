"""Phase 5 RLS and cross-user isolation.

Two requirements are separated deliberately, because they fail differently:

1. **Table isolation.** A creator cannot reach another creator's rows. This is
   enforced by PostgreSQL, and the exhaustive matrix in
   `test_rls_exhaustive_isolation.py` already covers `growth_insights` and
   `experiments` table by table. This file adds the Growth-specific cases: the
   columns Phase 5 added, and the routes.

2. **Isolation while the product works.** A creator running a real analysis sees
   only their own data, including under concurrent A/B traffic on pooled
   connections. This is where a missing `user_id` filter in Growth SQL would
   surface, and it is not what a table-level policy test can catch.
"""
from __future__ import annotations

import asyncio
import uuid

import pytest
from sqlalchemy import text

from app.growth import GrowthService
from app.growth.persistence import GrowthRepository
from tests.conftest import USER_A, USER_B, client_for, rls_session

pytestmark = pytest.mark.asyncio

SOLID_A = [
    {"title": "A-best", "views": 1000, "likes": 100, "comments": 50, "shares": 10},
    {"title": "A-mid", "views": 500, "likes": 75, "comments": 25, "shares": 5},
    {"title": "A-low", "views": 200, "likes": 10, "comments": 2, "shares": 0},
]
SOLID_B = [
    {"title": "B-best", "views": 10, "likes": 1, "comments": 0, "shares": 0},
    {"title": "B-mid", "views": 8, "likes": 1, "comments": 0, "shares": 0},
    {"title": "B-low", "views": 5, "likes": 0, "comments": 0, "shares": 0},
]


async def _seed(user_id, records):
    async with rls_session(user_id) as db:
        repo = GrowthRepository(db, user_id)
        for spec in records:
            await repo.record_performance(
                platform="reel",
                values={
                    "views": spec["views"], "likes": spec["likes"],
                    "comments_count": spec["comments"], "shares": spec["shares"],
                },
                asset_title=spec["title"],
            )


# --------------------------------------------------------------------------- #
# Cross-user isolation through the API
# --------------------------------------------------------------------------- #

async def test_a_creator_sees_only_their_own_overview():
    await _seed(USER_A, SOLID_A)
    await _seed(USER_B, SOLID_B)

    async with client_for(USER_A) as ac:
        a = (await ac.get("/api/growth/overview")).json()
    async with client_for(USER_B) as ac:
        b = (await ac.get("/api/growth/overview")).json()

    assert a["median_engagement_rate"] == pytest.approx(16.0, abs=1e-6)
    assert b["median_engagement_rate"] < a["median_engagement_rate"], (
        "two creators with very different data must not share an analysis"
    )
    assert [t["title"] for t in a["top_performers"]] != \
           [t["title"] for t in b["top_performers"]]


async def test_performance_lists_do_not_leak_across_creators():
    await _seed(USER_A, SOLID_A)
    await _seed(USER_B, SOLID_B)

    async with client_for(USER_A) as ac:
        a_rows = (await ac.get("/api/growth/performance")).json()
    async with client_for(USER_B) as ac:
        b_rows = (await ac.get("/api/growth/performance")).json()

    a_titles = {r["asset_title"] for r in a_rows if r["asset_title"]}
    b_titles = {r["asset_title"] for r in b_rows if r["asset_title"]}
    assert a_titles and not (a_titles & b_titles)


async def test_insights_do_not_leak_across_creators():
    await _seed(USER_A, SOLID_A)
    async with client_for(USER_A) as ac:
        await ac.post("/api/growth/insights/generate?window_days=30")
        a_ids = {i["id"] for i in (await ac.get("/api/growth/insights")).json()}

    async with client_for(USER_B) as ac:
        b_rows = (await ac.get("/api/growth/insights")).json()

    assert a_ids, "A must have insights for this test to mean anything"
    assert all(i["id"] not in a_ids for i in b_rows)


async def test_comments_and_insights_do_not_leak_across_creators():
    async with client_for(USER_A) as ac:
        created = await ac.post("/api/growth/comments", json={
            "comment_text": "How do I start learning Python? A's private question",
        })
        await ac.post("/api/growth/comments/analyze", json={"limit": 5})
        a_comments = (await ac.get("/api/growth/comments")).json()

    async with client_for(USER_B) as ac:
        b_comments = (await ac.get("/api/growth/comments")).json()
        b_insights = (await ac.get("/api/growth/comment-insights")).json()

    assert any("A's private question" in c["comment_text"] for c in a_comments)
    assert b_comments == []
    assert b_insights == [], "A's audience signal must not reach B"
    assert created.status_code == 201


async def test_opportunities_do_not_leak_across_creators():
    async with client_for(USER_A) as ac:
        for text_value in ("How do I start Python?",
                           "Please make a Python tutorial",
                           "Any Python course recommendations?"):
            await ac.post("/api/growth/comments", json={"comment_text": text_value})
        await ac.post("/api/growth/comments/analyze", json={"limit": 10})
        await ac.post("/api/growth/opportunities/detect")
        a_rows = (await ac.get("/api/growth/opportunities")).json()

    async with client_for(USER_B) as ac:
        b_rows = (await ac.get("/api/growth/opportunities")).json()

    assert a_rows
    assert b_rows == []


async def test_a_creator_cannot_promote_another_creators_insight_to_a_lesson():
    await _seed(USER_A, SOLID_A)
    async with client_for(USER_A) as ac:
        await ac.post("/api/growth/insights/generate?window_days=30")
        insight_id = (await ac.get("/api/growth/insights")).json()[0]["id"]

    async with client_for(USER_B) as ac:
        response = await ac.post("/api/growth/lessons", params={"insight_id": insight_id})

    assert response.status_code == 404


async def test_a_creator_cannot_evaluate_another_creators_experiment():
    async with client_for(USER_A) as ac:
        created = await ac.post("/api/growth/experiments", json={
            "hypothesis": "A's private experiment", "outcome_metric": "views",
        })
        experiment_id = created.json()["id"]

    async with client_for(USER_B) as ac:
        response = await ac.post(
            f"/api/growth/experiments/{experiment_id}/evaluate"
        )
        listed = (await ac.get("/api/growth/experiments")).json()

    assert response.status_code == 404
    assert listed == []


async def test_a_creator_cannot_create_an_opportunity_from_foreign_comments():
    async with client_for(USER_A) as ac:
        created = await ac.post("/api/growth/comments", json={
            "comment_text": "A's question about python",
        })

    async with client_for(USER_B) as ac:
        response = await ac.post("/api/growth/opportunities", json={
            "title": "Steal this", "angle": "Not mine",
            "comment_ids": [created.json()["id"]],
        })

    assert response.status_code == 404


# --------------------------------------------------------------------------- #
# Raw SQL bypass
# --------------------------------------------------------------------------- #

async def test_raw_sql_cannot_read_another_creators_insights():
    async with rls_session(USER_A) as db:
        service = GrowthService(db, USER_A)
        analysis = await service.analyze()
        await service.generate_insights(analysis)

    async with rls_session(USER_B) as db:
        rows = (await db.execute(text("SELECT id FROM growth_insights"))).fetchall()
    assert rows == []


async def test_raw_sql_cannot_delete_another_creators_experiments():
    async with rls_session(USER_A) as db:
        experiment_id = await GrowthRepository(db, USER_A).create_experiment(
            hypothesis="A's experiment", outcome_metric="views"
        )

    async with rls_session(USER_B) as db:
        await db.execute(text("DELETE FROM experiments"))
        await db.commit()

    async with rls_session(USER_A) as db:
        assert await GrowthRepository(db, USER_A).get_experiment(experiment_id)


async def test_raw_sql_cannot_write_an_insight_owned_by_another_creator():
    async with rls_session(USER_B) as db:
        with pytest.raises(Exception):
            await db.execute(
                text("""
                    INSERT INTO growth_insights
                        (user_id, insight_type, title, summary, evidence)
                    VALUES (:u, 'performance_trend', 'forged', 'forged',
                            CAST('{}' AS jsonb))
                """),
                {"u": str(USER_A)},
            )
        await db.rollback()


# --------------------------------------------------------------------------- #
# The Copilot cannot be pointed at another creator
# --------------------------------------------------------------------------- #

async def test_the_copilot_only_ever_sees_the_callers_data():
    """No endpoint accepts a creator, so the Copilot cannot be aimed elsewhere."""
    async with client_for(USER_A) as ac:
        await ac.post("/api/analytics/copilot", params={"user_id": str(USER_B)}, json={
            "question": "What worked best?", "window_days": 30,
        })
        response = await ac.post("/api/analytics/copilot", json={
            "question": "What worked best?", "window_days": 30,
        })

    assert response.status_code == 200
    combined = json_text(response.json())
    assert "B-best" not in combined


def json_text(payload) -> str:
    import json

    return json.dumps(payload)


# --------------------------------------------------------------------------- #
# Concurrency on pooled connections
# --------------------------------------------------------------------------- #

async def test_concurrent_analyses_never_cross_the_boundary():
    """Interleaved A/B analysis on pooled connections.

    This is the pooled-connection hazard: a stale JWT claim would let one creator's
    analysis return the other's numbers. The assertion is on identity -- each
    creator's ranking must contain only their own titles.
    """
    await _seed(USER_A, SOLID_A)
    await _seed(USER_B, SOLID_B)

    async def analyze(user_id, expected_prefix, forbidden_prefix):
        async with rls_session(user_id) as db:
            service = GrowthService(db, user_id)
            analysis = await service.analyze()
            titles = [r.title for r in analysis.ranking]
            assert titles, f"{expected_prefix} got no ranking"
            assert all(t.startswith(expected_prefix) for t in titles), (
                f"analysis returned another creator's content: {titles}"
            )
            assert all(forbidden_prefix not in t for t in titles)
            return titles

    results = await asyncio.gather(
        analyze(USER_A, "A-", "B-"),
        analyze(USER_B, "B-", "A-"),
        analyze(USER_A, "A-", "B-"),
        analyze(USER_B, "B-", "A-"),
    )
    assert results[0] == results[2]
    assert results[1] == results[3]
    assert set(results[0]).isdisjoint(set(results[1]))


async def test_concurrent_writes_do_not_leak():
    """Two creators commenting at once must not overwrite each other."""
    async def add(user_id, text_value):
        async with client_for(user_id) as ac:
            response = await ac.post("/api/growth/comments",
                                     json={"comment_text": text_value})
            return response.status_code

    codes = await asyncio.gather(
        add(USER_A, "A asks about python"),
        add(USER_B, "B asks about rust"),
        add(USER_A, "A asks about testing"),
        add(USER_B, "B asks about deployment"),
    )
    assert all(code == 201 for code in codes)

    async with rls_session(USER_A) as db:
        a_rows = await GrowthRepository(db, USER_A).list_comments(limit=50)
    async with rls_session(USER_B) as db:
        b_rows = await GrowthRepository(db, USER_B).list_comments(limit=50)

    assert all("A asks" in r["comment_text"] for r in a_rows)
    assert all("B asks" in r["comment_text"] for r in b_rows)


# --------------------------------------------------------------------------- #
# Unauthenticated access
# --------------------------------------------------------------------------- #

async def test_unauthenticated_growth_access_is_denied():
    import httpx
    from app.main import app

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as ac:
        for path, method in [
            ("/api/growth/overview", "get"),
            ("/api/growth/insights", "get"),
            ("/api/growth/performance", "get"),
            ("/api/growth/comments", "get"),
            ("/api/growth/opportunities", "get"),
            ("/api/growth/experiments", "get"),
            ("/api/growth/lessons", "get"),
            ("/api/growth/comments/analyze", "post"),
            ("/api/growth/opportunities/detect", "post"),
            ("/api/analytics/copilot", "post"),
            ("/api/analytics/copilot/metrics", "get"),
        ]:
            if method == "get":
                response = await ac.get(path)
            else:
                response = await ac.post(path, json={})
            assert response.status_code in (401, 403), f"{path} was reachable"


async def test_an_invalid_token_is_denied():
    import httpx
    from app.main import app
    from tests.conftest import _client_for  # documents the auth-override intent

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as ac:
        response = await ac.get(
            "/api/growth/overview",
            headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhIn0.bad"},
        )
    assert response.status_code in (401, 403)


# --------------------------------------------------------------------------- #
# Column-level ownership added by Phase 5
# --------------------------------------------------------------------------- #

async def test_a_comment_dedupe_index_is_scoped_per_creator():
    """Two creators may legitimately post the same audience comment text."""
    async with client_for(USER_A) as ac:
        a_first = await ac.post("/api/growth/comments",
                                json={"comment_text": "Same text from both"})
        a_again = await ac.post("/api/growth/comments",
                                json={"comment_text": "Same text from both"})
    async with client_for(USER_B) as ac:
        b_first = await ac.post("/api/growth/comments",
                                json={"comment_text": "Same text from both"})

    assert a_first.json()["duplicate"] is False
    assert a_again.json()["duplicate"] is True
    assert b_first.json()["duplicate"] is False, (
        "one creator's comment must not cause another's to be treated as a duplicate"
    )
    assert b_first.json()["id"] != a_first.json()["id"]


async def test_a_comment_is_removed_when_its_asset_is_removed():
    """Cascade behaviour for a table Phase 5 started writing to."""
    async with rls_session(USER_A) as db:
        asset_id = (await db.execute(
            text("""INSERT INTO content_assets
                        (user_id, title, source_type, raw_text)
                   VALUES (:u, 'to delete', 'studio', 'body') RETURNING id"""),
            {"u": str(USER_A)},
        )).scalar_one()
        await db.commit()
        await GrowthRepository(db, USER_A).add_comment(
            text_value="A comment on a post that will be deleted",
            asset_id=uuid.UUID(str(asset_id)),
        )
        before = await GrowthRepository(db, USER_A).list_comments(limit=10)
        assert len(before) == 1

        await db.execute(text("DELETE FROM content_assets WHERE id = :a"),
                         {"a": str(asset_id)})
        await db.commit()
        after = await GrowthRepository(db, USER_A).list_comments(limit=10)

    assert after == [], "deleting the asset must not orphan its comments"
