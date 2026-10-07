"""Unit tests for Coach & Learning contracts (Phase 6)."""
from datetime import datetime, timezone
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.coach.contracts import (
    CoachFeedbackRequest,
    CoachGoalCreate,
    CoachGoalUpdate,
    GoalCategory,
    GoalStatus,
    LearningCategory,
    LearningRecordCreate,
    LearningStatus,
    ProgressStatus,
)


def test_coach_goal_create_valid():
    req = CoachGoalCreate(
        title="Master Instagram Hooks",
        description="Improve hook retention to 65%",
        category=GoalCategory.SKILL,
    )
    assert req.title == "Master Instagram Hooks"
    assert req.category == GoalCategory.SKILL


def test_coach_goal_create_rejects_too_short():
    with pytest.raises(ValidationError):
        CoachGoalCreate(title="ab")


def test_learning_record_create_bounds():
    rec = LearningRecordCreate(
        category=LearningCategory.CREATOR_PREFERENCE,
        summary="Prefers direct instructional style",
        confidence=0.9,
        is_explicit=True,
    )
    assert rec.confidence == 0.9
    assert rec.is_explicit is True

    with pytest.raises(ValidationError):
        LearningRecordCreate(
            category=LearningCategory.CREATOR_PREFERENCE,
            summary="Invalid confidence",
            confidence=1.5,
        )


def test_coach_feedback_request_valid():
    req = CoachFeedbackRequest(
        topic="Script structure for tech tutorials",
        additional_context="Audience drops off at 30s mark",
    )
    assert req.topic == "Script structure for tech tutorials"
