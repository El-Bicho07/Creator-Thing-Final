"""Ghost Clip Composer — served by the Clip Editor agent; EDL / shot-list export lives here."""

from sqlalchemy.orm import Session

from search.vector import fmt_ts


def compose(session: Session, channel_id: str, theme: str, target_seconds: int = 45) -> dict:
    from agents.specialists.clip_editor import compose as run

    return run(channel_id, theme, target_seconds)


def _tc(seconds: float, fps: int = 30) -> str:
    frames = int(round(seconds * fps))
    h, rem = divmod(frames, 3600 * fps)
    m, rem = divmod(rem, 60 * fps)
    s, f = divmod(rem, fps)
    return f"{h:02d}:{m:02d}:{s:02d}:{f:02d}"


def to_edl(title: str, clips: list[dict], fps: int = 30) -> str:
    """CMX3600 EDL — opens in Premiere Pro, DaVinci Resolve and Final Cut (via import)."""
    lines = [f"TITLE: {title[:60]}", "FCM: NON-DROP FRAME", ""]
    rec = 0.0
    for i, c in enumerate(clips, start=1):
        dur = c["end"] - c["start"]
        reel = f"V{i:03d}"
        lines.append(
            f"{i:03d}  {reel:<8} B     C        "
            f"{_tc(c['start'], fps)} {_tc(c['end'], fps)} {_tc(rec, fps)} {_tc(rec + dur, fps)}"
        )
        lines.append(f"* FROM CLIP NAME: {c['title'][:80]} [{c['video_id']}]")
        lines.append(f"* ROLE: {c.get('role', '').upper()} | SOURCE: https://youtu.be/{c['video_id']}")
        lines.append("")
        rec += dur
    return "\n".join(lines)


def to_shot_list(title: str, clips: list[dict], hook_overlay: str = "", caption: str = "") -> str:
    out = [f"# {title}", ""]
    if hook_overlay:
        out += [f"**On-screen hook:** {hook_overlay}", ""]
    rec = 0.0
    for i, c in enumerate(clips, start=1):
        dur = c["end"] - c["start"]
        out += [
            f"## {i}. {c.get('role', '').upper()} ({fmt_ts(rec)}–{fmt_ts(rec + dur)})",
            f"- Source: {c['title']} @ {fmt_ts(c['start'])}–{fmt_ts(c['end'])} — https://youtu.be/{c['video_id']}?t={int(c['start'])}",
            f"- Says: \"{c.get('text', '')}\"",
            "",
        ]
        rec += dur
    if caption:
        out += ["**Caption:** " + caption]
    return "\n".join(out)
