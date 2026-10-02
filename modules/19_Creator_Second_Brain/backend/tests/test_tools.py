"""Agent tool layer against the local database (no LLM calls). Needs Postgres running and one indexed channel."""

from datetime import datetime

import pytest
from sqlalchemy import func, select

from agents.context import AgentContext, Evidence
from agents.schemas import ClipSpec
from agents.tools.compose import build_clips, check_rules
from agents.tools.search import find_excerpts, find_stances
from db import SessionLocal
from models import Chunk, Video


@pytest.fixture(scope="module")
def session():
    with SessionLocal() as s:
        yield s


@pytest.fixture(scope="module")
def indexed(session):
    """(channel_id, a video with transcript lines) or skip."""
    video = session.scalars(
        select(Video).join(Chunk, Chunk.video_id == Video.id).group_by(Video.id).order_by(func.count().desc()).limit(1)
    ).first()
    if video is None:
        pytest.skip("no indexed video in the database")
    return video.channel_id, video


def test_evidence_numbers_are_stable_and_deduplicated():
    ev = Evidence()
    assert ev.add(("chunk", 7), {"x": 1}) == 1
    assert ev.add(("chunk", 9), {"x": 2}) == 2
    assert ev.add(("chunk", 7), {"x": 3}) == 1
    assert [e["n"] for e in ev.all()] == [1, 2]
    assert ev.get(1)["x"] == 1


def test_find_excerpts_registers_numbered_evidence(indexed):
    channel_id, _ = indexed
    ctx = AgentContext(channel_id)
    text = find_excerpts(ctx, "engine", limit=5)
    items = ctx.evidence.all()
    assert 1 <= len(items) <= 5
    for e in items:
        assert f"[{e['n']}]" in text
        assert e["kind"] == "chunk" and e["url"].startswith("https://www.youtube.com/watch?v=")
    # a repeat search keeps the same numbers for the same chunks
    find_excerpts(ctx, "engine", limit=5)
    assert len(ctx.evidence.all()) == len(items)


def test_search_is_scoped_to_the_channel(indexed):
    ctx = AgentContext("UC-not-a-real-channel")
    assert find_excerpts(ctx, "engine") == "No matching excerpts."
    assert ctx.evidence.all() == []


def test_published_after_floor_is_enforced(indexed, session):
    channel_id, _ = indexed
    ctx = AgentContext(channel_id)
    newest = session.scalar(select(func.max(Video.published_at)).where(Video.channel_id == channel_id))
    ctx.scratch["published_after"] = newest  # nothing is newer than the newest video
    assert find_excerpts(ctx, "engine", after="2000-01-01") == "No matching excerpts."


def test_video_filter_and_line_view(indexed):
    channel_id, video = indexed
    ctx = AgentContext(channel_id)
    text = find_excerpts(ctx, video.title, limit=3, video_id=video.id, with_lines=True)
    assert all(e["video_id"] == video.id for e in ctx.evidence.all())
    assert "  [" in text  # per-line start times for the Clip Editor


def test_find_stances_scoped(indexed):
    ctx = AgentContext("UC-not-a-real-channel")
    assert find_stances(ctx, "anything") == "No stances found for that topic."


def test_build_clips_snaps_and_filters(indexed, session):
    channel_id, video = indexed
    chunks = session.scalars(select(Chunk).where(Chunk.video_id == video.id).order_by(Chunk.start)).all()
    starts = [float(s) for c in chunks for s, _ in c.segments]
    line = starts[len(starts) // 2]
    specs = [
        ClipSpec(video_id=video.id, start=line + 0.4, end=line + 12, role="hook"),
        ClipSpec(video_id=video.id, start=line + 0.4, end=line + 12, role="payoff"),  # duplicate moment
        ClipSpec(video_id="not-a-video", start=0, end=10, role="context"),
    ]
    clips, notes = build_clips(session, channel_id, specs)
    assert len(clips) == 1
    assert clips[0]["start"] == round(line, 1)  # snapped onto the line start
    assert clips[0]["text"]
    assert any("used twice" in n for n in notes) and any("unknown video_id" in n for n in notes)
    # a video from another channel is rejected
    assert build_clips(session, "UC-not-a-real-channel", specs[:1])[0] == []


def test_check_rules():
    def clip(vid, role, dur):
        return {"video_id": vid, "role": role, "duration": dur, "text": "words"}

    good = [clip("a", "hook", 8), clip("b", "proof", 15), clip("a", "payoff", 12)]
    assert check_rules(good, 35) == []
    bad = [clip("a", "context", 30), clip("a", "hook", 3)]
    problems = " | ".join(check_rules(bad, 45))
    for expected in ("3-5 clips", "2 different source videos", "4-20 s", "first clip", "last clip"):
        assert expected in problems


def test_dates_parse():
    from agents.tools.search import _date

    assert _date("2026-09-04") == datetime(2026, 9, 4)
    assert _date("nonsense") is None and _date(None) is None
