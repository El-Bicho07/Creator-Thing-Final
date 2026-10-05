"""Deterministic Studio domain rules (platforms, formats, goals, timing).

Adapted from Module 18 (Guruvelah) `lib/domain/*`. Pure functions only: no LLM,
no I/O. See `rules.py` for the donor mapping.
"""
from app.studio.domain import rules
from app.studio.domain.rules import (
    FORMATS,
    GOAL_DIRECTIVES,
    PLATFORMS,
    ScriptSlot,
    allocate_segments,
    allowed_formats,
    format_duration,
    goal_directive,
    list_platforms,
    lifecycle_directive,
    resolve_format,
    resolve_goal,
    resolve_lifecycle,
    resolve_platform,
    total_words,
)

__all__ = [
    "rules",
    "PLATFORMS",
    "FORMATS",
    "GOAL_DIRECTIVES",
    "ScriptSlot",
    "allocate_segments",
    "allowed_formats",
    "format_duration",
    "goal_directive",
    "list_platforms",
    "lifecycle_directive",
    "resolve_format",
    "resolve_goal",
    "resolve_lifecycle",
    "resolve_platform",
    "total_words",
]
