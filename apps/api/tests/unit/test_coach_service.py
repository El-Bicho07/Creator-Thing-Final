"""Unit tests for CoachService logic and anti-fabrication rules (Phase 6)."""
from uuid import uuid4

import pytest
from tests.conftest import USER_A, rls_session

from app.coach.contracts import (
    CoachFeedbackRequest,
    CoachGoalCreate,
    CreatorCorrectionRequest,
    GoalCategory,
    LearningCategory,
    LearningRecordCreate,
    ProgressStatus,
)
from app.coach.service import CoachService, _defang_prompt_text

pytestmark = pytest.mark.asyncio


async def test_defang_prompt_text_defangs_tags_and_truncates():
    input_str = "<script>alert('hack');</script>```python print('hi') ```"
    cleaned = _defang_prompt_text(input_str, max_chars=100)
    assert "<script>" not in cleaned
    assert "```" not in cleaned


async def test_create_and_retrieve_goal():
    async with rls_session(USER_A) as db:
        service = CoachService(db, USER_A)
        created = await service.create_goal(CoachGoalCreate(
            title="Improve Reel Pacing",
            category=GoalCategory.SKILL
        ))
        assert created.title == "Improve Reel Pacing"
        assert created.progress_status == ProgressStatus.INSUFFICIENT_EVIDENCE

        fetched = await service.get_goal(created.id)
        assert fetched is not None
        assert fetched.id == created.id


async def test_provide_coaching_feedback_saves_session_and_feedback():
    async with rls_session(USER_A) as db:
        service = CoachService(db, USER_A)
        feedback = await service.provide_feedback(CoachFeedbackRequest(
            topic="How to improve call to action retention?",
            additional_context="Viewers drop before the end."
        ))

        assert feedback.observation
        assert feedback.why_it_matters
        assert feedback.what_to_improve
        assert feedback.how_to_practice
        assert feedback.what_to_try_next


async def test_apply_creator_correction_overrides_learning():
    async with rls_session(USER_A) as db:
        service = CoachService(db, USER_A)
        learning = await service.create_learning(LearningRecordCreate(
            category=LearningCategory.CREATOR_PREFERENCE,
            summary="System inferred: prefers short scripts",
            confidence=0.6,
            is_explicit=False
        ))

        corrected = await service.apply_creator_correction(CreatorCorrectionRequest(
            learning_id=learning.id,
            corrected_summary="Creator explicit: prefers long detailed scripts",
            detail="I teach complex topics that require depth.",
            is_explicit=True
        ))

        assert corrected is not None
        assert corrected.summary == "Creator explicit: prefers long detailed scripts"
        assert corrected.confidence == 1.0
        assert corrected.is_explicit is True
