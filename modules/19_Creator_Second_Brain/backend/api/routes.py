from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ai.ask import ask
from ai.compose import compose, to_edl, to_shot_list
from ai.drift import analyze_drift, list_topics
from ai.llm import LLMConfigError, LLMError
from db import get_session
from ingest.pipeline import run_index_job, run_promise_job, run_upload_job
from models import Channel, Chunk, Job, Promise, ReelCandidate, Stance, Video
from search.embeddings import embed_query
from search.graph import related_videos, video_graph
from search.vector import fmt_ts, yt_url

router = APIRouter(prefix="/api")


def _llm_call(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except LLMConfigError as e:
        raise HTTPException(400, f"{e}. Add it to .env and restart the backend.")
    except LLMError as e:
        raise HTTPException(502, str(e))


def _channel_or_404(session: Session, channel_id: str) -> Channel:
    channel = session.get(Channel, channel_id)
    if channel is None:
        raise HTTPException(404, "Channel not found")
    return channel


def _job_dict(job: Job) -> dict:
    return {
        "id": job.id,
        "channel_id": job.channel_id,
        "kind": job.kind,
        "status": job.status,
        "stage": job.stage,
        "progress": job.progress,
        "total": job.total,
        "message": job.message,
        "updated_at": job.updated_at.isoformat() if job.updated_at else None,
    }


# ---------- channels & indexing ----------


class IndexRequest(BaseModel):
    channel: str = Field(..., min_length=2, description="Channel URL, @handle or UC... id")
    max_videos: int | None = Field(None, ge=1, le=500)


@router.post("/index")
def start_index(req: IndexRequest, tasks: BackgroundTasks, session: Session = Depends(get_session)):
    job = Job(kind="index", status="queued", stage="Queued")
    session.add(job)
    session.commit()
    tasks.add_task(run_index_job, job.id, req.channel, req.max_videos)
    return _job_dict(job)


@router.get("/jobs/{job_id}")
def get_job(job_id: int, session: Session = Depends(get_session)):
    job = session.get(Job, job_id)
    if job is None:
        raise HTTPException(404, "Job not found")
    return _job_dict(job)


@router.get("/channels")
def list_channels(session: Session = Depends(get_session)):
    rows = session.execute(
        select(Channel, func.count(Video.id)).outerjoin(Video).group_by(Channel.id).order_by(Channel.created_at.desc())
    ).all()
    return [
        {"id": c.id, "title": c.title, "handle": c.handle, "thumbnail": c.thumbnail, "videos": n} for c, n in rows
    ]


@router.get("/channels/{channel_id}")
def channel_overview(channel_id: str, session: Session = Depends(get_session)):
    channel = _channel_or_404(session, channel_id)

    def count(model, *where):
        return session.scalar(
            select(func.count()).select_from(model).join(Video, model.video_id == Video.id).where(
                Video.channel_id == channel_id, *where
            )
        )

    statuses = dict(
        session.execute(
            select(Video.status, func.count()).where(Video.channel_id == channel_id).group_by(Video.status)
        ).all()
    )
    job = session.scalars(
        select(Job).where(Job.channel_id == channel_id).order_by(Job.id.desc()).limit(1)
    ).first()
    return {
        "id": channel.id,
        "title": channel.title,
        "handle": channel.handle,
        "thumbnail": channel.thumbnail,
        "videos": sum(statuses.values()),
        "video_status": statuses,
        "chunks": count(Chunk),
        "reels": count(ReelCandidate),
        "promises": count(Promise),
        "open_promises": count(Promise, Promise.status == "open"),
        "stances": count(Stance),
        "latest_job": _job_dict(job) if job else None,
    }


@router.post("/channels/{channel_id}/reindex")
def reindex(channel_id: str, tasks: BackgroundTasks, session: Session = Depends(get_session)):
    _channel_or_404(session, channel_id)
    job = Job(kind="index", status="queued", stage="Queued", channel_id=channel_id)
    session.add(job)
    session.commit()
    tasks.add_task(run_index_job, job.id, channel_id)
    return _job_dict(job)


@router.get("/channels/{channel_id}/videos")
def list_videos(channel_id: str, session: Session = Depends(get_session)):
    videos = session.scalars(
        select(Video).where(Video.channel_id == channel_id).order_by(Video.published_at.desc())
    ).all()
    return [
        {
            "id": v.id,
            "title": v.title,
            "thumbnail": v.thumbnail,
            "published_at": v.published_at.isoformat(),
            "duration_sec": v.duration_sec,
            "view_count": v.view_count,
            "status": v.status,
        }
        for v in videos
    ]


# ---------- core: ask ----------


class AskRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=1000)


@router.post("/channels/{channel_id}/ask")
def ask_route(channel_id: str, req: AskRequest, session: Session = Depends(get_session)):
    _channel_or_404(session, channel_id)
    return _llm_call(ask, session, channel_id, req.question)


# ---------- core: reels ----------


@router.get("/channels/{channel_id}/reels")
def reels(channel_id: str, q: str | None = None, limit: int = 30, session: Session = Depends(get_session)):
    _channel_or_404(session, channel_id)
    stmt = select(ReelCandidate, Video).join(Video).where(Video.channel_id == channel_id)
    if q:
        dist = ReelCandidate.embedding.cosine_distance(embed_query(q))
        # relevance first, but keep quality in the mix
        stmt = stmt.order_by(dist - ReelCandidate.score / 400).limit(limit)
    else:
        stmt = stmt.order_by(ReelCandidate.score.desc()).limit(limit)
    return [
        {
            "id": r.id,
            "video_id": v.id,
            "title": v.title,
            "thumbnail": v.thumbnail,
            "published_at": v.published_at.isoformat(),
            "start": r.start,
            "end": r.end,
            "duration": round(r.end - r.start, 1),
            "timestamp": f"{fmt_ts(r.start)}–{fmt_ts(r.end)}",
            "url": yt_url(v.id, r.start),
            "score": r.score,
            "scores": r.scores,
            "hook": r.hook,
            "caption": r.caption,
            "reason": r.reason,
            "transcript": r.transcript,
        }
        for r, v in session.execute(stmt).all()
    ]


# ---------- unique: promise ledger ----------


@router.get("/channels/{channel_id}/promises")
def promises(channel_id: str, session: Session = Depends(get_session)):
    _channel_or_404(session, channel_id)
    rows = session.execute(
        select(Promise, Video).join(Video, Promise.video_id == Video.id).where(Video.channel_id == channel_id).order_by(
            Video.published_at.desc()
        )
    ).all()
    fulfilled_ids = {p.fulfilled_video_id for p, _ in rows if p.fulfilled_video_id}
    fulfilled = {v.id: v for v in session.scalars(select(Video).where(Video.id.in_(fulfilled_ids)))} if fulfilled_ids else {}
    out = []
    for p, v in rows:
        fv = fulfilled.get(p.fulfilled_video_id)
        out.append(
            {
                "id": p.id,
                "promise": p.promise,
                "quote": p.quote,
                "kind": p.kind,
                "status": p.status,
                "manual": p.manual,
                "evidence": p.evidence,
                "video_id": v.id,
                "title": v.title,
                "thumbnail": v.thumbnail,
                "published_at": v.published_at.isoformat(),
                "timestamp": fmt_ts(p.timestamp),
                "url": yt_url(v.id, p.timestamp),
                "fulfilled_by": (
                    {
                        "video_id": fv.id,
                        "title": fv.title,
                        "timestamp": fmt_ts(p.fulfilled_timestamp or 0),
                        "url": yt_url(fv.id, p.fulfilled_timestamp or 0),
                    }
                    if fv
                    else None
                ),
            }
        )
    return out


class PromiseUpdate(BaseModel):
    status: str = Field(..., pattern="^(open|fulfilled|dismissed)$")


@router.patch("/promises/{promise_id}")
def update_promise(promise_id: int, req: PromiseUpdate, session: Session = Depends(get_session)):
    p = session.get(Promise, promise_id)
    if p is None:
        raise HTTPException(404, "Promise not found")
    p.status, p.manual = req.status, True
    if req.status != "fulfilled":
        p.fulfilled_video_id, p.fulfilled_timestamp = None, None
    p.evidence = "Set manually by you."
    session.commit()
    return {"id": p.id, "status": p.status}


@router.post("/channels/{channel_id}/promises/recheck")
def recheck_promises(channel_id: str, tasks: BackgroundTasks, session: Session = Depends(get_session)):
    _channel_or_404(session, channel_id)
    job = Job(kind="promises", status="queued", stage="Queued", channel_id=channel_id)
    session.add(job)
    session.commit()
    tasks.add_task(run_promise_job, job.id, channel_id)
    return _job_dict(job)


# ---------- unique: opinion drift ----------


@router.get("/channels/{channel_id}/drift/topics")
def drift_topics(channel_id: str, session: Session = Depends(get_session)):
    _channel_or_404(session, channel_id)
    return list_topics(session, channel_id)


class DriftRequest(BaseModel):
    topic: str = Field(..., min_length=2, max_length=200)


@router.post("/channels/{channel_id}/drift")
def drift(channel_id: str, req: DriftRequest, session: Session = Depends(get_session)):
    _channel_or_404(session, channel_id)
    return _llm_call(analyze_drift, session, channel_id, req.topic)


# ---------- unique: ghost clip composer ----------


class ComposeRequest(BaseModel):
    theme: str = Field(..., min_length=2, max_length=300)
    target_seconds: int = Field(45, ge=15, le=90)


@router.post("/channels/{channel_id}/compose")
def compose_route(channel_id: str, req: ComposeRequest, session: Session = Depends(get_session)):
    _channel_or_404(session, channel_id)
    result = _llm_call(compose, session, channel_id, req.theme, req.target_seconds)
    if "error" in result:
        raise HTTPException(422, result["error"])
    return result


class ExportClip(BaseModel):
    video_id: str
    title: str
    start: float
    end: float
    role: str = ""
    text: str = ""


class ExportRequest(BaseModel):
    title: str
    clips: list[ExportClip]
    hook_overlay: str = ""
    caption: str = ""


@router.post("/export/edl", response_class=PlainTextResponse)
def export_edl(req: ExportRequest):
    return PlainTextResponse(
        to_edl(req.title, [c.model_dump() for c in req.clips]),
        headers={"Content-Disposition": 'attachment; filename="ghost-clip.edl"'},
    )


@router.post("/export/shotlist", response_class=PlainTextResponse)
def export_shotlist(req: ExportRequest):
    return PlainTextResponse(
        to_shot_list(req.title, [c.model_dump() for c in req.clips], req.hook_overlay, req.caption),
        headers={"Content-Disposition": 'attachment; filename="ghost-clip-shotlist.md"'},
    )


# ---------- connections ----------


@router.get("/channels/{channel_id}/graph")
def graph(channel_id: str, session: Session = Depends(get_session)):
    _channel_or_404(session, channel_id)
    return video_graph(session, channel_id)


AUDIO_EXT = (".mp3", ".m4a", ".wav", ".webm", ".mp4", ".ogg", ".flac", ".mpeg", ".mpga")


@router.post("/videos/{video_id}/transcript")
async def upload_transcript(
    video_id: str, tasks: BackgroundTasks, file: UploadFile = File(...), session: Session = Depends(get_session)
):
    video = session.get(Video, video_id)
    if video is None:
        raise HTTPException(404, "Video not found")
    name = (file.filename or "").lower()
    if not name.endswith((".srt", ".vtt", *AUDIO_EXT)):
        raise HTTPException(400, "Upload a .srt/.vtt subtitle file or an audio file (mp3, m4a, wav...)")
    data = await file.read()
    if len(data) > 25 * 1024 * 1024:
        raise HTTPException(400, "File is larger than 25 MB (Groq Whisper limit). Upload subtitles or a smaller audio file.")
    job = Job(kind="upload", status="queued", stage="Queued", channel_id=video.channel_id)
    session.add(job)
    session.commit()
    tasks.add_task(run_upload_job, job.id, video_id, name, data)
    return _job_dict(job)


@router.get("/videos/{video_id}/related")
def related(video_id: str, session: Session = Depends(get_session)):
    return related_videos(session, video_id)
