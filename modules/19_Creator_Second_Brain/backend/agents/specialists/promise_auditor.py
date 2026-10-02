"""Promise Auditor: decides whether on-camera promises were kept, and answers questions about them."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from agents.context import AgentContext
from agents.schemas import LibraryAnswer, PromiseVerdict
from agents.specialists.base import run_specialist
from agents.tools.library import list_promises
from agents.tools.search import find_excerpts, get_transcript_window, search_transcripts
from models import Promise, Video

VERIFY = """You are the Promise Auditor in a YouTube creator's "second brain". You check whether the creator
kept a promise they made on camera. Candidate excerpts come only from videos published AFTER the promise.

A promise is fulfilled only if a later video clearly delivers it (the promised part 2, review or follow-up
actually exists). Merely mentioning the topic again is NOT fulfilment.

How to work:
- If the candidates are weak, search again with `search_transcripts` using the words such a follow-up
  video would contain (e.g. "part 2", the product name, "as promised"). At most 2 extra searches.
- If a candidate looks promising but is ambiguous, read around it with `get_transcript_window`.
- Submit fulfilled=true with the number of the delivering excerpt, or fulfilled=false with ref=null,
  plus one sentence of evidence."""

CHAT = """You are the Promise Auditor in a YouTube creator's "second brain". You answer the creator's
questions about the promises they made on camera ("I'll make a part 2", "I'll review this in 6 months")
and whether later videos delivered them. Use `list_promises` (filter by status or rank by topic) and
`search_transcripts` to check details. Be concise and specific: name the video and date.
Return the ids of the promises your answer is about."""


def verify_promise(session: Session, promise: Promise) -> None:
    """Update one promise's status in place (caller commits). Manual overrides are never passed in."""
    video = session.get(Video, promise.video_id)
    if video is None:
        return
    ctx = AgentContext(video.channel_id)
    ctx.scratch["published_after"] = video.published_at
    first = find_excerpts(ctx, promise.promise, limit=5)
    if not ctx.evidence.all():
        promise.status, promise.fulfilled_video_id, promise.fulfilled_timestamp = "open", None, None
        promise.evidence = "No later video discusses this yet."
        return

    verdict: PromiseVerdict = run_specialist(
        name="promise_auditor",
        system=VERIFY,
        tools=[search_transcripts, get_transcript_window],
        schema=PromiseVerdict,
        prompt=(
            f'Promise (made {video.published_at:%Y-%m-%d} in "{video.title}"): {promise.promise}\n'
            f'Exact words: "{promise.quote}"\n\nCandidates from later videos:\n{first}'
        ),
        ctx=ctx,
        fast=True,
        model_calls=4,
        tool_calls=4,
    )
    hit = ctx.evidence.get(verdict.ref) if verdict.ref is not None else None
    if verdict.fulfilled and hit and hit["kind"] == "chunk":
        promise.status = "fulfilled"
        promise.fulfilled_video_id, promise.fulfilled_timestamp = hit["video_id"], hit["start"]
    else:
        promise.status, promise.fulfilled_video_id, promise.fulfilled_timestamp = "open", None, None
    promise.evidence = verdict.evidence[:600]


def verify_all(session: Session, channel_id: str, on_progress=None) -> int:
    promises = session.scalars(
        select(Promise).join(Video, Promise.video_id == Video.id).where(Video.channel_id == channel_id)
    ).all()
    todo = [p for p in promises if not p.manual]
    for i, p in enumerate(todo):
        verify_promise(session, p)
        session.commit()
        if on_progress:
            on_progress(i + 1, len(todo))
    return len(todo)


def answer(channel_id: str, question: str, ctx: AgentContext | None = None) -> LibraryAnswer:
    ctx = ctx or AgentContext(channel_id)
    return run_specialist(
        name="promise_auditor_chat",
        system=CHAT,
        tools=[list_promises, search_transcripts, get_transcript_window],
        schema=LibraryAnswer,
        prompt=question,
        ctx=ctx,
        model_calls=5,
        tool_calls=6,
    )
