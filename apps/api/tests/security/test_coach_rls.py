"""RLS security tests for Coach & Learning tables (Phase 6).

Verifies strict Row Level Security (RLS) isolation between Creator A and Creator B.
"""
from uuid import uuid4

import pytest
from sqlalchemy import text
from tests.conftest import USER_A, USER_B, client_for, rls_session

from app.coach.contracts import CoachGoalCreate, LearningRecordCreate, LearningCategory
from app.coach.service import CoachService

pytestmark = pytest.mark.asyncio


async def test_creator_b_cannot_read_or_modify_creator_a_goals():
    async with client_for(USER_A) as ac_a:
        created = await ac_a.post("/api/coach/goals", json={
            "title": "A's private goal",
            "category": "skill"
        })
        goal_id = created.json()["id"]

    # User B over HTTP API
    async with client_for(USER_B) as ac_b:
        res_get = await ac_b.get(f"/api/coach/goals/{goal_id}")
        assert res_get.status_code == 404

        res_patch = await ac_b.patch(f"/api/coach/goals/{goal_id}", json={"title": "Hacked"})
        assert res_patch.status_code == 404

    # User B via Direct SQL (RLS check)
    async with rls_session(USER_B) as db_b:
        rows = (await db_b.execute(
            text("SELECT id FROM coach_goals WHERE id = :i"), {"i": goal_id}
        )).fetchall()
        assert rows == []


async def test_creator_b_cannot_read_or_modify_creator_a_learnings():
    async with client_for(USER_A) as ac_a:
        created = await ac_a.post("/api/learning", json={
            "category": "creator_preference",
            "summary": "A's secret workflow preference",
            "confidence": 0.9,
            "is_explicit": True
        })
        learning_id = created.json()["id"]

    async with client_for(USER_B) as ac_b:
        res_get = await ac_b.get(f"/api/learning/{learning_id}")
        assert res_get.status_code == 404

        res_correct = await ac_b.post("/api/learning/correct", json={
            "learning_id": learning_id,
            "corrected_summary": "B's injected preference"
        })
        assert res_correct.status_code == 404

    # Direct SQL
    async with rls_session(USER_B) as db_b:
        rows = (await db_b.execute(
            text("SELECT id FROM learning_records WHERE id = :i"), {"i": learning_id}
        )).fetchall()
        assert rows == []


async def test_raw_sql_cannot_write_goal_owned_by_another_creator():
    async with rls_session(USER_B) as db_b:
        with pytest.raises(Exception):
            await db_b.execute(
                text("""
                    INSERT INTO coach_goals (id, user_id, title, category)
                    VALUES (:id, :user_a, 'Forged goal', 'skill')
                """),
                {"id": str(uuid4()), "user_a": str(USER_A)}
            )
