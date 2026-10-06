"""Growth -> Producer -> Today -> Studio.

Phase 5 owns understanding. It does not own planning (Phase 4) or creating
(Phase 3). This file exists to prove that boundary holds in the direction that
matters: an opportunity or insight produced by Growth must reach the creator's day
through the **existing** Producer and Today surfaces, not through a second planner.

The chain under test:

    audience comment -> insight -> opportunity (ideas)
                                      |
                                      v
                          Producer context -> recommendation
                                      |
                                      v
                              Today plan item
                                      |
                                      v
                          Producer.execute -> Studio session
                                      |
                                      v
                              Studio generation -> content_assets
"""
from __future__ import annotations

import json
import uuid

import pytest
from sqlalchemy import text

from tests.conftest import USER_A, USER_B, client_for, rls_session

pytestmark = pytest.mark.asyncio

IDEA_JSON = json.dumps({
    "ideas": [{
        "title": "Start Python from zero",
        "angle": "Audience keeps asking how to begin.",
        "why_it_could_work": "Asked by three separate commenters.",
        "format": "tutorial", "difficulty": "easy",
    }]
})
CRITIQUE_JSON = json.dumps({
    "verdict": "needs_work", "score": 7,
    "strengths": ["clear opening"], "improvements": ["add a next step"],
})


@pytest.fixture(autouse=True)
def _restore_gateway():
    from app.llm.gateway import get_llm_gateway, set_llm_gateway

    try:
        previous = get_llm_gateway()
    except Exception:
        previous = None
    yield
    set_llm_gateway(previous)


def _gateway(script=None):
    from app.llm.gateway import LLMGateway, set_llm_gateway
    from app.llm.providers import ScriptedLLMProvider

    provider = ScriptedLLMProvider(script=script or [IDEA_JSON])
    set_llm_gateway(LLMGateway(providers={provider.name: provider}))
    return provider


async def _seed_profile(user_id):
    async with rls_session(user_id) as db:
        await db.execute(
            text("""
                INSERT INTO creator_profiles
                    (user_id, full_name, niche, target_audience, primary_platform)
                VALUES (:u, 'Loop', 'python for beginners',
                        'people learning to code', 'reel')
                ON CONFLICT (user_id) DO UPDATE SET niche = excluded.niche
            """),
            {"u": str(user_id)},
        )
        await db.execute(
            text("INSERT INTO content_assets (user_id, title, source_type, raw_text) "
                 "VALUES (:u, 'Earlier reel', 'studio', 'Earlier work body')"),
            {"u": str(user_id)},
        )
        await db.commit()


async def _ask_questions(client, texts):
    for text_value in texts:
        await client.post("/api/growth/comments", json={"comment_text": text_value})
    await client.post("/api/growth/comments/analyze", json={"limit": 25})
    await client.post("/api/growth/opportunities/detect")


# --------------------------------------------------------------------------- #
# Opportunities reach the Producer
# --------------------------------------------------------------------------- #

async def test_an_opportunity_becomes_producer_context():
    """The reuse decision, proven.

    Opportunities are stored on the existing `ideas` table precisely so Phase 4's
    Producer picks them up as `existing_ideas` context, with no new ingestion path.
    """
    _gateway()
    await _seed_profile(USER_A)

    async with client_for(USER_A) as ac:
        await _ask_questions(ac, [
            "How do I start learning Python from zero?",
            "Please make a Python tutorial for complete beginners",
            "Any Python course you would recommend to a total beginner?",
        ])
        opportunities = (await ac.get("/api/growth/opportunities")).json()
        assert opportunities, "audience questions must become opportunities"

        recommended = await ac.post("/api/producer/recommend", json={})

    assert recommended.status_code == 200, recommended.text
    recommendations = recommended.json()["recommendations"]
    assert recommendations

    # The Producer's own context reads ideas; confirm the rows are there as ideas.
    async with rls_session(USER_A) as db:
        rows = (await db.execute(
            text("""SELECT title, origin, demand_score FROM ideas
                   WHERE user_id = :u AND origin <> 'manual'"""),
            {"u": str(USER_A)},
        )).fetchall()
    assert rows
    assert all(row[1] == "comment" for row in rows)
    assert all(row[2] is not None for row in rows)


async def test_an_opportunity_flows_into_a_today_plan_item():
    """The full Growth -> Producer -> Today chain, through existing routes only."""
    _gateway()
    await _seed_profile(USER_A)

    async with client_for(USER_A) as ac:
        await _ask_questions(ac, [
            "How do I start learning Python from zero?",
            "Please make a Python tutorial for complete beginners",
            "Any Python course you would recommend?",
        ])
        planned = await ac.post("/api/today/plan", json={"time_budget_minutes": 120})
        assert planned.status_code == 201, planned.text

        today = (await ac.get("/api/today")).json()

    assert today["items"], "the persisted plan must contain work"
    # Today items are Phase 4 objects, not a new Growth-shaped plan.
    for item in today["items"]:
        assert item["status"] in {
            "planned", "in_progress", "completed", "skipped", "blocked"
        }
        assert item["plan_date"]


async def test_an_opportunity_reaches_studio_through_the_producer_handoff():
    """Growth supplies the decision; Studio does all the creating."""
    _gateway()
    await _seed_profile(USER_A)

    async with client_for(USER_A) as ac:
        await _ask_questions(ac, [
            "How do I start learning Python from zero?",
            "Please make a Python tutorial for complete beginners",
            "Any Python course you would recommend?",
        ])
        await ac.post("/api/today/plan", json={"time_budget_minutes": 120})
        today = (await ac.get("/api/today")).json()
        item = next(i for i in today["items"] if i.get("action_kind"))

        handoff = await ac.post("/api/producer/execute", json={"item_id": item["id"]})
        assert handoff.status_code in (200, 201), handoff.text

        session_id = handoff.json()["studio_session_id"]
        capability = handoff.json()["capability"]

        sessions = (await ac.get("/api/studio/sessions")).json()["sessions"]
        assert session_id in [s["id"] for s in sessions]

        # And Studio generates.
        _gateway([IDEA_JSON, CRITIQUE_JSON])
        generated = await ac.post("/api/studio/generate", json={
            "session_id": session_id,
            "capability": capability,
            "input": {"topic": "start python from zero", "count": 1},
        })

    assert generated.status_code == 200, generated.text
    assert generated.json()["generation_id"]
    assert generated.json()["asset_id"]


# --------------------------------------------------------------------------- #
# Growth never generates, never plans
# --------------------------------------------------------------------------- #

async def test_analyzing_comments_creates_no_studio_generation():
    _gateway()
    await _seed_profile(USER_A)

    async with rls_session(USER_A) as db:
        before = (
            await db.execute(text("SELECT COUNT(*) FROM studio_generations "
                                  "WHERE user_id = :u"), {"u": str(USER_A)})
        ).scalar()

    async with client_for(USER_A) as ac:
        await _ask_questions(ac, ["How do I start Python?", "Make a Python tutorial",
                                  "Which Python course is best?"])
        await ac.post("/api/growth/comments/analyze", json={"limit": 25})
        await ac.post("/api/growth/insights/generate?window_days=30")

    async with rls_session(USER_A) as db:
        after = (
            await db.execute(text("SELECT COUNT(*) FROM studio_generations "
                                  "WHERE user_id = :u"), {"u": str(USER_A)})
        ).scalar()

    assert before == after, "Growth must never generate content"


async def test_growth_creates_no_plan_items():
    """Growth does not plan. Only the Producer does."""
    _gateway()
    await _seed_profile(USER_A)

    async with rls_session(USER_A) as db:
        before = (
            await db.execute(text("SELECT COUNT(*) FROM plan_items WHERE user_id = :u"),
                             {"u": str(USER_A)})
        ).scalar()

    async with client_for(USER_A) as ac:
        await _ask_questions(ac, ["How do I start Python?", "Make a Python tutorial",
                                  "Which Python course is best?"])
        await ac.post("/api/growth/insights/generate?window_days=30")
        await ac.get("/api/growth/overview")

    async with rls_session(USER_A) as db:
        after = (
            await db.execute(text("SELECT COUNT(*) FROM plan_items WHERE user_id = :u"),
                             {"u": str(USER_A)})
        ).scalar()

    assert before == after, "Growth must not write to the creator's day"


async def test_opportunities_contain_no_generated_content():
    """The Module 11 boundary, enforced on the response payload."""
    _gateway()
    await _seed_profile(USER_A)

    async with client_for(USER_A) as ac:
        await _ask_questions(ac, ["How do I start Python?", "Make a Python tutorial",
                                  "Which Python course is best?"])
        opportunities = (await ac.get("/api/growth/opportunities")).json()

    blob = json.dumps(opportunities).lower()
    for generated in ("caption_draft", "hashtag", "on_screen_text", "hook:",
                      "slide 1", "story_mention"):
        assert generated not in blob, (
            f"a Growth opportunity produced finished content: {generated}"
        )


# --------------------------------------------------------------------------- #
# Performance closes the loop
# --------------------------------------------------------------------------- #

async def test_performance_feeds_the_next_plan():
    """Remember -> Decide -> Make -> Learn -> Remember.

    The loop is only closed if the learning step changes what the creator is asked
    to do next. This asserts the mechanism exists: performance is recorded, becomes
    an insight, and the insight is visible in the Growth surface that the Producer
    and Today sit behind.
    """
    _gateway()
    await _seed_profile(USER_A)

    async with client_for(USER_A) as ac:
        for title, views, likes in (("A", 1000, 100), ("B", 500, 75),
                                    ("C", 200, 10)):
            await ac.post("/api/growth/performance", json={
                "title": title, "platform": "reel",
                "values": {"views": views, "likes": likes,
                           "comments_count": likes // 2, "shares": likes // 10},
            })

        insights = (await ac.post("/api/growth/insights/generate?window_days=30")).json()
        assert insights, "measured performance must become insights"
        assert any(i["insight_type"] == "content_pattern" for i in insights)

        overview = (await ac.get("/api/growth/overview")).json()
        assert overview["has_enough_data"] is True
        assert overview["median_engagement_rate"] == pytest.approx(16.0, abs=1e-6)


async def test_producer_reads_performance_as_context_after_phase_5():
    """Phase 4 already read performance; Phase 5 must not break that."""
    _gateway()
    await _seed_profile(USER_A)

    async with client_for(USER_A) as ac:
        for views, likes in ((1000, 100), (500, 75), (200, 10)):
            await ac.post("/api/growth/performance", json={
                "platform": "reel",
                "values": {"views": views, "likes": likes,
                           "comments_count": likes // 2, "shares": likes // 10},
            })
        recommended = await ac.post("/api/producer/recommend", json={})

    assert recommended.status_code == 200
    assert recommended.json()["context"]["performance_records"] == 3


# --------------------------------------------------------------------------- #
# Ownership across the whole chain
# --------------------------------------------------------------------------- #

async def test_the_chain_is_scoped_to_one_creator():
    _gateway()
    await _seed_profile(USER_A)
    await _seed_profile(USER_B)

    async with client_for(USER_A) as ac:
        await _ask_questions(ac, ["How do I start Python?", "Make a Python tutorial",
                                  "Which Python course is best?"])
        await ac.post("/api/growth/opportunities/detect")
        a_opportunities = (await ac.get("/api/growth/opportunities")).json()

    async with client_for(USER_B) as ac:
        b_opportunities = (await ac.get("/api/growth/opportunities")).json()
        b_today = (await ac.get("/api/today")).json()

    assert a_opportunities
    assert b_opportunities == []
    assert b_today["items"] == []


async def test_a_foreign_opportunity_cannot_be_handed_to_studio():
    """Creator B must not be able to execute Creator A's plan item."""
    _gateway()
    await _seed_profile(USER_A)

    async with client_for(USER_A) as ac:
        await _ask_questions(ac, ["How do I start Python?", "Make a Python tutorial",
                                  "Which Python course is best?"])
        await ac.post("/api/today/plan", json={"time_budget_minutes": 120})
        today = (await ac.get("/api/today")).json()
        item = next(i for i in today["items"] if i.get("action_kind"))

    async with client_for(USER_B) as ac:
        response = await ac.post("/api/producer/execute", json={"item_id": item["id"]})

    assert response.status_code >= 400


# --------------------------------------------------------------------------- #
# Failure safety across the chain
# --------------------------------------------------------------------------- #

async def test_a_dead_provider_does_not_break_the_chain():
    """A provider outage must not cost the creator their plan or their opportunities."""
    from app.llm.gateway import LLMGateway, set_llm_gateway
    from app.llm.providers import ScriptedLLMProvider

    class BrokenProvider(ScriptedLLMProvider):
        async def complete(self, *args, **kwargs):
            raise TimeoutError("postgres://user:hunter2@db timeout")

    provider = BrokenProvider(script=[IDEA_JSON])
    set_llm_gateway(LLMGateway(providers={provider.name: provider}))

    await _seed_profile(USER_A)

    async with client_for(USER_A) as ac:
        await _ask_questions(ac, ["How do I start Python?", "Make a Python tutorial",
                                  "Which Python course is best?"])
        opportunities = await ac.get("/api/growth/opportunities")
        planned = await ac.post("/api/today/plan", json={"time_budget_minutes": 120})
        copilot = await ac.post("/api/analytics/copilot", json={
            "question": "What worked best?",
        })

    assert opportunities.status_code == 200
    assert planned.status_code == 201, planned.text
    assert copilot.status_code == 200, copilot.text
    for response_text in (opportunities.text, planned.text, copilot.text):
        for leak in ("hunter2", "postgres://", "Traceback"):
            assert leak not in response_text


async def test_performance_analysis_survives_a_broken_embedding_service():
    """Analytics must not depend on the vector store.

    Performance arithmetic is pure arithmetic; if it needs an embedding to work, the
    creator cannot see their own numbers when the vector store is down.
    """
    await _seed_profile(USER_A)
    async with client_for(USER_A) as ac:
        for views, likes in ((1000, 100), (500, 75), (200, 10)):
            await ac.post("/api/growth/performance", json={
                "platform": "reel",
                "values": {"views": views, "likes": likes,
                           "comments_count": likes // 2, "shares": likes // 10},
            })

    # Break the dependency, not the method: `_memory_block` already guards its own
    # retrieval, and replacing the guarded method would test nothing.
    import app.memory as memory_module

    original = memory_module.get_memory_engine

    def broken_engine(db, user_id):
        raise RuntimeError("pgvector unavailable")

    memory_module.get_memory_engine = broken_engine
    try:
        async with client_for(USER_A) as ac:
            response = await ac.post("/api/analytics/copilot", json={
                "question": "What worked best?",
            })
    finally:
        memory_module.get_memory_engine = original

    assert response.status_code == 200, response.text
    combined = response.text.lower()
    assert "pgvector" not in combined
    assert "traceback" not in combined
