"""Studio domain rules: platforms, formats, goals, lifecycle, timing.

Adapted from Module 18 (Guruvelah) `lib/domain/*`. These are pure functions, so
they are tested directly — including the two properties the donor's script
generation depended on: contiguous segments and an exact total duration.
"""
from __future__ import annotations

import pytest

from app.studio.domain import rules


# --------------------------------------------------------------------------- #
# Platforms
# --------------------------------------------------------------------------- #

def test_resolve_known_platform():
    assert rules.resolve_platform("reel").key == "reel"
    assert rules.resolve_platform("linkedin").kind == "text"
    assert rules.resolve_platform("reel").kind == "video"


def test_resolve_platform_accepts_donor_aliases():
    """Module 18 used 'instagram_reels' and 'twitter'; keep accepting them."""
    assert rules.resolve_platform("instagram_reels").key == "reel"
    assert rules.resolve_platform("instagram-reels").key == "reel"
    assert rules.resolve_platform("twitter").key == "x"
    assert rules.resolve_platform("YouTube_Shorts").key == "shorts"


def test_unknown_platform_falls_back_to_reel():
    assert rules.resolve_platform("tiktok-but-not-really").key == "reel"
    assert rules.resolve_platform(None).key == "reel"
    assert rules.resolve_platform("").key == "reel"


def test_platform_constraints_are_sane():
    for key, config in rules.PLATFORMS.items():
        assert config.caption_char_cap > 0, key
        assert config.hashtag_min <= config.hashtag_max, key
        assert config.caption_aim_chars <= config.caption_char_cap, key
        assert config.kind in ("video", "text"), key


def test_x_has_a_real_character_cap():
    """A 280-character platform cap is the point of X support."""
    assert rules.PLATFORMS["x"].caption_char_cap <= 280


def test_list_platforms_is_sorted():
    assert rules.list_platforms() == sorted(rules.PLATFORMS)


# --------------------------------------------------------------------------- #
# Formats
# --------------------------------------------------------------------------- #

def test_allowed_formats_are_subset_of_known_formats():
    for key in rules.PLATFORMS:
        for fmt in rules.allowed_formats(key):
            assert fmt in rules.FORMATS, f"{key} -> {fmt}"


def test_resolve_format_accepts_valid_and_rejects_invalid():
    assert rules.resolve_format("tutorial", "reel") == "tutorial"
    assert rules.resolve_format("TUTORIAL", "reel") == "tutorial"
    assert rules.resolve_format("newsletter edit", "linkedin") == "newsletter_edit"
    # A format valid on one platform but not another resolves to None, so the
    # capability can pick a permitted default rather than fail.
    assert rules.resolve_format("before_after", "linkedin") is None
    assert rules.resolve_format("poetic", "blog") is None
    # Not a known format at all.
    assert rules.resolve_format("interpretive_dance", "reel") is None
    assert rules.resolve_format(None, "reel") is None


def test_every_platform_has_at_least_one_format():
    for key in rules.PLATFORMS:
        assert rules.allowed_formats(key)


# --------------------------------------------------------------------------- #
# Goals
# --------------------------------------------------------------------------- #

def test_resolve_goal_defaults_and_falls_back():
    assert rules.resolve_goal("reach") == "reach"
    assert rules.resolve_goal("ENGAGEMENT") == "engagement"
    assert rules.resolve_goal(None) == rules.DEFAULT_GOAL
    assert rules.resolve_goal("viral_dance") == rules.DEFAULT_GOAL


def test_goal_directive_is_never_empty():
    for goal in rules.GOAL_DIRECTIVES:
        assert rules.goal_directive(goal)
    assert rules.goal_directive("not_a_goal")


# --------------------------------------------------------------------------- #
# Lifecycle
# --------------------------------------------------------------------------- #

def test_lifecycle_resolution_and_aliases():
    assert rules.resolve_lifecycle("rising") == "rising"
    assert rules.resolve_lifecycle("trending") == "rising"
    assert rules.resolve_lifecycle("new") == "emerging"
    assert rules.resolve_lifecycle("saturated") == "peak"
    assert rules.resolve_lifecycle(None) is None
    assert rules.resolve_lifecycle("unknown_stage") is None


def test_lifecycle_directive_empty_for_unknown():
    assert rules.lifecycle_directive("unknown") == ""
    assert rules.lifecycle_directive(None) == ""
    assert rules.lifecycle_directive("peak")


# --------------------------------------------------------------------------- #
# Timing — the contract the donor's script generation relied on
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize("duration", [10, 15, 20, 30, 45, 60, 90, 120, 180, 300, 480])
def test_segments_are_contiguous_and_end_exactly_on_target(duration):
    """Two properties Module 18 depended on; an off-by-one silently breaks a script."""
    slots = rules.allocate_segments(duration)

    assert slots, f"no segments produced for {duration}s"
    assert slots[0].start_sec == 0
    assert slots[-1].end_sec == duration, (
        f"final segment ends at {slots[-1].end_sec}, expected {duration}"
    )
    for previous, current in zip(slots, slots[1:]):
        assert previous.end_sec == current.start_sec, (
            f"gap or overlap at {previous.role}->{current.role}"
        )
    for slot in slots:
        assert slot.duration_sec > 0, f"{slot.role} has non-positive duration"


def test_segment_roles_are_ordered_hook_to_cta():
    slots = rules.allocate_segments(30)
    roles = [s.role for s in slots]
    assert roles[0] == "HOOK"
    assert roles[-1] == "CTA"
    assert "SETUP" in roles and "PAYOFF" in roles
    assert roles.index("SETUP") < roles.index("VALUE") < roles.index("PAYOFF")


def test_longer_clips_get_more_value_segments():
    short = rules.allocate_segments(30)
    long = rules.allocate_segments(300)
    short_values = [s for s in short if s.role == "VALUE"]
    long_values = [s for s in long if s.role == "VALUE"]
    assert len(long_values) > len(short_values)


def test_very_short_clip_does_not_blow_up():
    slots = rules.allocate_segments(5)
    assert slots
    assert slots[-1].end_sec == 5
    assert slots[0].role == "HOOK"
    assert all(s.duration_sec > 0 for s in slots)


def test_zero_or_negative_duration_yields_nothing():
    assert rules.allocate_segments(0) == []
    assert rules.allocate_segments(-10) == []


def test_word_budgets_track_duration():
    short = rules.total_words(rules.allocate_segments(15))
    long = rules.total_words(rules.allocate_segments(300))
    assert short > 0
    assert long > short * 3


def test_format_duration_formatting():
    assert rules.format_duration(45) == "45s"
    assert rules.format_duration(60) == "1m"
    assert rules.format_duration(95) == "1m 35s"
    assert rules.format_duration(0) == "0s"
