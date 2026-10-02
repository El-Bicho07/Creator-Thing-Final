"""Clip Editor (Ghost Clip Composer): drafts a Short from existing moments, validates it and revises."""

from agents.context import AgentContext
from agents.schemas import Composition
from agents.specialists.base import run_specialist
from agents.tools.compose import build_clips, check_rules, validate_sequence
from agents.tools.search import find_excerpts, get_transcript_window, search_moments, search_reel_candidates
from db import SessionLocal

SYSTEM = """You are the Clip Editor in a YouTube creator's "second brain". You build ONE new vertical Short
(Reel/TikTok) by stitching moments from their existing videos — no new filming.

Source excerpts show every transcript line with its start time in seconds, e.g. "[83.2] text", plus the
video_id. A clip is (video_id, start, end, role) where start is a line start time from that video.

How to work:
1. Read the starting material and draft from it directly when you can. Only if it lacks a strong hook or
   usable moments from 2+ videos, call `search_moments` with another angle on the theme, or
   `search_reel_candidates` for pre-scored hooks (at most 2 extra lookups — every call is rate-limited).
2. Draft 3-5 clips forming one arc: open with a hook, end with a payoff (or cta). Use at least 2 different
   source videos (3+ is better), never the same moment twice, each clip 4-20 seconds, total close to the
   target duration. The lines must flow as one coherent story when played back to back.
3. Call `validate_sequence` with the draft. If it reports PROBLEMS, or the playback doesn't read as one
   story, fix the draft and validate again (at most 2 revisions).
4. Submit the validated clips with a title, a punchy on-screen hook overlay, a caption with 2-3 hashtags
   and editor notes (transitions, b-roll, text)."""


def compose(channel_id: str, theme: str, target_seconds: int = 45, ctx: AgentContext | None = None) -> dict:
    ctx = ctx or AgentContext(channel_id)
    ctx.scratch["target_seconds"] = target_seconds
    first = find_excerpts(ctx, theme, limit=6, with_lines=True, per_video=2)
    videos = {e["video_id"] for e in ctx.evidence.all()}
    if len(videos) < 2:
        return {"error": "Need material from at least two different videos on this theme. Try a broader theme."}

    data: Composition = run_specialist(
        name="clip_editor",
        system=SYSTEM,
        tools=[search_moments, search_reel_candidates, get_transcript_window, validate_sequence],
        schema=Composition,
        prompt=f"Theme: {theme}\nTarget duration: {target_seconds} seconds\n\nStarting material:\n{first}",
        ctx=ctx,
        model_calls=6,
        tool_calls=6,
    )

    with SessionLocal() as session:
        clips, _ = build_clips(session, channel_id, data.clips)
    if len(clips) < 2:
        return {"error": "The Clip Editor couldn't build a sequence for this theme. Try rephrasing it."}
    return {
        "theme": theme,
        "title": data.title or theme,
        "hook_overlay": data.hook_overlay,
        "caption": data.caption,
        "editor_notes": data.editor_notes,
        "clips": clips,
        "total_seconds": round(sum(c["duration"] for c in clips), 1),
        "source_videos": len({c["video_id"] for c in clips}),
        "warnings": check_rules(clips, target_seconds),
    }
