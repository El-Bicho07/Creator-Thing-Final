"""Integration tests for Coach & Learning API routes (Phase 6)."""
from uuid import uuid4

import pytest
from tests.conftest import USER_A, USER_B, client_for, rls_session

pytestmark = pytest.mark.asyncio


async def test_coach_health_endpoint():
    async with client_for(USER_A) as ac:
        res = await ac.get("/api/coach/health")
        assert res.status_code == 200
        assert res.json()["service"] == "coach_and_learning"


async def test_goal_crud_flow():
    async with client_for(USER_A) as ac:
        # Create
        created = await ac.post("/api/coach/goals", json={
            "title": "Master storytelling hooks",
            "category": "hook_retention",
            "description": "Keep viewers engaged in first 5s"
        })
        assert created.status_code == 201
        goal_id = created.json()["id"]

        # List
        listed = await ac.get("/api/coach/goals")
        assert listed.status_code == 200
        assert any(g["id"] == goal_id for g in listed.json())

        # Update
        updated = await ac.patch(f"/api/coach/goals/{goal_id}", json={
            "progress_status": "improving"
        })
        assert updated.status_code == 200
        assert updated.json()["progress_status"] == "improving"


async def test_learning_crud_and_correction_flow():
    async with client_for(USER_A) as ac:
        # Create learning
        created = await ac.post("/api/learning", json={
            "category": "creator_preference",
            "summary": "Prefers dark mode UI mockups",
            "confidence": 0.8,
            "status": "candidate"
        })
        assert created.status_code == 201
        learning_id = created.json()["id"]

        # Correct learning
        corrected = await ac.post("/api/learning/correct", json={
            "learning_id": learning_id,
            "corrected_summary": "Explicitly prefers high-contrast dark theme"
        })
        assert corrected.status_code == 200
        assert corrected.json()["summary"] == "Explicitly prefers high-contrast dark theme"
        assert corrected.json()["confidence"] == 1.0
        assert corrected.json()["status"] == "confirmed"


async def test_coaching_feedback_and_recommendation_handoff():
    async with client_for(USER_A) as ac:
        goal = await ac.post("/api/coach/goals", json={
            "title": "Clear CTAs",
            "category": "cta_conversion"
        })
        goal_id = goal.json()["id"]

        feedback = await ac.post("/api/coach/feedback", json={
            "goal_id": goal_id,
            "topic": "How to structure CTAs for tech tutorials?",
            "additional_context": "Want to drive newsletter signups"
        })
        assert feedback.status_code == 200
        fb_data = feedback.json()
        assert fb_data["observation"]
        assert fb_data["how_to_practice"]

        rec = await ac.post(f"/api/coach/goals/{goal_id}/recommend")
        assert rec.status_code == 200
        assert "action_type" in rec.json()
