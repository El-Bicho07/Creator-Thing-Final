"""Clip Editor's self-check: snap a draft sequence onto real transcript lines and report rule violations."""

from langchain.tools import ToolRuntime, tool
from sqlalchemy import select
from sqlalchemy.orm import Session

from agents.context import AgentContext
from agents.schemas import ClipSpec
from db import SessionLocal
from models import Chunk, Video
from search.vector import fmt_ts, yt_url

ROLES = ("hook", "context", "proof", "payoff", "cta")


def _lines(session: Session, video_id: str) -> list[tuple[float, str]]:
    chunks = session.scalars(select(Chunk).where(Chunk.video_id == video_id).order_by(Chunk.start)).all()
    return [(float(s), t) for c in chunks for s, t in c.segments]


def build_clips(session: Session, channel_id: str, specs: list[ClipSpec]) -> tuple[list[dict], list[str]]:
    """Normalise clips (snap cuts to line starts, clamp lengths) and return them with any problems found."""
    clips, notes, seen, cache = [], [], set(), {}
    for i, spec in enumerate(specs, start=1):
        video = session.get(Video, spec.video_id)
        if video is None or video.channel_id != channel_id:
            notes.append(f"clip {i}: unknown video_id {spec.video_id} — dropped")
            continue
        lines = cache.setdefault(video.id, _lines(session, video.id))
        if not lines:
            notes.append(f"clip {i}: video has no transcript — dropped")
            continue
        last = lines[-1][0] + 8
        # snap to the closest line start so cuts land between sentences
        start = min((s for s, _ in lines), key=lambda s: abs(s - spec.start))
        if abs(start - spec.start) > 2:
            notes.append(f"clip {i}: start {spec.start}s is not a line start — snapped to {start}s")
        end = spec.end
        if end <= start + 3 or end > last + 5:  # the model's range was off — take a sensible slice
            notes.append(f"clip {i}: end {spec.end}s was out of range — reset")
            end = min(start + 10, last)
        if end > start + 25:
            notes.append(f"clip {i}: longer than 25 s — trimmed")
            end = start + 25
        if end <= start + 2:
            end = start + 6
        if (video.id, round(start)) in seen:
            notes.append(f"clip {i}: same moment used twice — dropped")
            continue
        seen.add((video.id, round(start)))
        clips.append(
            {
                "video_id": video.id,
                "title": video.title,
                "thumbnail": video.thumbnail,
                "role": spec.role if spec.role in ROLES else "context",
                "start": round(start, 1),
                "end": round(end, 1),
                "duration": round(end - start, 1),
                "timestamp": f"{fmt_ts(start)}–{fmt_ts(end)}",
                "url": yt_url(video.id, start),
                "text": " ".join(t for s, t in lines if start - 0.5 <= s < end),
                "why": spec.why,
            }
        )
    return clips, notes


def check_rules(clips: list[dict], target_seconds: int) -> list[str]:
    problems = []
    if not 3 <= len(clips) <= 5:
        problems.append(f"need 3-5 clips, have {len(clips)}")
    if len({c["video_id"] for c in clips}) < 2:
        problems.append("use at least 2 different source videos")
    for i, c in enumerate(clips, start=1):
        if not 4 <= c["duration"] <= 20:
            problems.append(f"clip {i} is {c['duration']} s — keep each clip 4-20 s")
        if not c["text"].strip():
            problems.append(f"clip {i} contains no spoken lines")
    total = sum(c["duration"] for c in clips)
    if clips and not 0.6 * target_seconds <= total <= 1.4 * target_seconds:
        problems.append(f"total is {total:.0f} s, target is {target_seconds} s")
    if clips and clips[0]["role"] != "hook":
        problems.append("the first clip should be the hook")
    if clips and clips[-1]["role"] not in ("payoff", "cta"):
        problems.append("the last clip should be the payoff or cta")
    return problems


@tool
def validate_sequence(clips: list[ClipSpec], runtime: ToolRuntime[AgentContext]) -> str:
    """Check a draft Short before submitting it. Snaps cuts onto transcript lines, then reports rule problems
    and the exact words each clip will say, so you can judge whether they flow as one story."""
    ctx = runtime.context
    ctx.step("validate_sequence", f"{len(clips)} clips")
    target = ctx.scratch.get("target_seconds", 45)
    with SessionLocal() as session:
        built, notes = build_clips(session, ctx.channel_id, clips)
    problems = check_rules(built, target)
    ctx.scratch["validations"] = ctx.scratch.get("validations", 0) + 1
    playback = "\n".join(
        f'{i}. {c["role"].upper()} {c["duration"]}s from "{c["title"]}" ({c["start"]}–{c["end"]}): "{c["text"]}"'
        for i, c in enumerate(built, start=1)
    )
    verdict = "PROBLEMS: " + "; ".join(problems) if problems else "OK — all rules pass."
    total = sum(c["duration"] for c in built)
    return "\n".join(filter(None, [verdict, "Adjustments: " + "; ".join(notes) if notes else "", f"Total {total:.0f} s. Playback:", playback]))
