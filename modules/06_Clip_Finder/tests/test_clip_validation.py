import pytest
from app.models.schemas import ClipCandidate

def test_clip_candidate_validation():
    clip = ClipCandidate(
        title="Test Clip",
        start_time="00:01:00",
        end_time="00:01:45",
        start_sec=60.0,
        end_sec=105.0,
        duration=45.0,
        score=92,
        topic="Technology",
        hook="Did you know this secret?",
        reason="Great hook and standalone topic.",
        context_required=False
    )
    assert clip.score == 92
    assert clip.duration == 45.0
    assert clip.context_required is False

def test_score_bounds():
    clip = ClipCandidate(
        title="Sample",
        start_time="00:00:00",
        end_time="00:00:30",
        score=120  # should clamp or fail validation
    )
    assert clip.score <= 100
