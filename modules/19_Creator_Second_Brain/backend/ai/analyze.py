"""Per-video extraction at index time: reel candidates, on-camera promises and stances — one pass."""

from sqlalchemy.orm import Session

from ai.llm import chat_json
from config import settings
from models import Chunk, Promise, ReelCandidate, Stance, Video
from search.embeddings import embed_texts
from search.vector import segments_between

SYSTEM = """You analyse YouTube video transcripts for the creator who made them.
Transcript lines are prefixed with their start time in seconds, e.g. "[83.2] text".
Return ONLY a JSON object with exactly these keys:

{
  "reels": [ {"start": <sec>, "end": <sec>, "hook": "<opening line / on-screen hook>",
              "caption": "<short social caption>", "reason": "<why it works as a reel>",
              "scores": {"hook": 0-10, "standalone": 0-10, "emotion": 0-10, "value": 0-10}} ],
  "promises": [ {"timestamp": <sec>, "quote": "<creator's exact words>",
                 "promise": "<normalised commitment, e.g. 'Make a part 2 about budgeting apps'>",
                 "kind": "video|series|review|update|other"} ],
  "stances": [ {"timestamp": <sec>, "topic": "<2-4 word lowercase topic>",
                "stance": "<the creator's position in one sentence>", "quote": "<exact words>"} ]
}

Rules:
- reels: at most 3 moments that would work as a 15-60 second Short/Reel on their own: a strong opening
  line, a complete thought, surprise/emotion/humour or a concrete takeaway. start/end must be line start
  times from the transcript and 15-60 s apart. Skip weak moments — an empty list is fine.
- promises: ONLY explicit commitments the creator makes about future content or actions
  ("I'll make a video on...", "part 2 is coming", "I'll review this in 6 months", "if this gets 1k likes I'll...").
  Ignore sponsor reads, "see you next time", "subscribe", and anything already done in this video.
- stances: at most 6 clear opinions, recommendations or judgements on a specific topic
  (products, tools, strategies, habits, beliefs). Use stable, generic topic names so the same topic
  from different videos can be matched (e.g. "used cameras", "morning routine", "index funds").
- Copy quotes verbatim from the transcript. Never invent timestamps."""


def _transcript_slices(chunks: list[Chunk], max_chars: int) -> list[str]:
    slices, current, size = [], [], 0
    for c in chunks:
        for start, text in c.segments:
            line = f"[{start}] {text}"
            if size + len(line) > max_chars and current:
                slices.append("\n".join(current))
                current, size = [], 0
            current.append(line)
            size += len(line) + 1
    if current:
        slices.append("\n".join(current))
    return slices


def _num(x, default=0.0) -> float:
    try:
        return float(x)
    except (TypeError, ValueError):
        return default


def analyze_video(session: Session, video: Video) -> dict:
    chunks = sorted(video.chunks, key=lambda c: c.start)
    if not chunks:
        return {"reels": 0, "promises": 0, "stances": 0}
    duration = max(video.duration_sec, chunks[-1].end)

    reels, promises, stances = [], [], []
    slices = _transcript_slices(chunks, settings.analysis_segment_chars)
    for i, part in enumerate(slices):
        header = f'Video title: "{video.title}" (published {video.published_at:%Y-%m-%d})'
        if len(slices) > 1:
            header += f" — transcript part {i + 1} of {len(slices)}"
        data = chat_json(SYSTEM, f"{header}\n\nTranscript:\n{part}", max_tokens=3000)
        reels += data.get("reels") or []
        promises += data.get("promises") or []
        stances += data.get("stances") or []

    # Replace any earlier analysis for this video
    for model in (ReelCandidate, Promise, Stance):
        session.query(model).filter(model.video_id == video.id).delete()

    reel_rows = []
    for r in reels:
        start, end = _num(r.get("start")), _num(r.get("end"))
        start, end = max(0.0, start), min(end, duration)
        if end - start < 8:
            end = min(start + 30, duration)
        if end - start > 90:
            end = start + 60
        s = r.get("scores") or {}
        parts = [_num(s.get(k), 5) for k in ("hook", "standalone", "emotion", "value")]
        score = round(sum(max(0, min(10, p)) for p in parts) / 4 * 10, 1)
        reel_rows.append(
            ReelCandidate(
                video_id=video.id,
                start=start,
                end=end,
                score=score,
                hook=str(r.get("hook", ""))[:500],
                caption=str(r.get("caption", ""))[:500],
                reason=str(r.get("reason", ""))[:800],
                scores={k: p for k, p in zip(("hook", "standalone", "emotion", "value"), parts)},
                transcript=segments_between(chunks, start, end),
            )
        )

    promise_rows = [
        Promise(
            video_id=video.id,
            timestamp=max(0.0, _num(p.get("timestamp"))),
            quote=str(p.get("quote", ""))[:800],
            promise=str(p.get("promise", "")).strip()[:400],
            kind=str(p.get("kind", "other"))[:20],
        )
        for p in promises
        if str(p.get("promise", "")).strip()
    ]

    stance_rows = [
        Stance(
            video_id=video.id,
            timestamp=max(0.0, _num(s.get("timestamp"))),
            topic=str(s.get("topic", "")).strip().lower()[:80],
            stance=str(s.get("stance", "")).strip()[:500],
            quote=str(s.get("quote", ""))[:800],
        )
        for s in stances
        if str(s.get("topic", "")).strip() and str(s.get("stance", "")).strip()
    ]

    texts = (
        [f"{r.hook} {r.transcript}" for r in reel_rows]
        + [p.promise for p in promise_rows]
        + [f"{s.topic}: {s.stance}" for s in stance_rows]
    )
    vecs = embed_texts(texts)
    for row, vec in zip([*reel_rows, *promise_rows, *stance_rows], vecs):
        row.embedding = vec

    session.add_all([*reel_rows, *promise_rows, *stance_rows])
    video.status = "analyzed"
    session.commit()
    return {"reels": len(reel_rows), "promises": len(promise_rows), "stances": len(stance_rows)}
