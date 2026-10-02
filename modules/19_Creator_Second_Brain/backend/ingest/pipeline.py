"""Background index job: channel -> videos -> transcripts -> chunks + embeddings -> AI analysis -> promise matching."""

import logging
import traceback

from sqlalchemy import select

from ai.analyze import analyze_video
from ai.llm import LLMConfigError
from ai.promises import match_all_promises
from config import settings
from db import SessionLocal
from ingest.transcripts import (
    TranscriptBlocked,
    chunk_transcript,
    fetch_transcript,
    parse_subtitles,
    transcribe_audio,
)
from ingest.youtube import list_upload_ids, resolve_channel, video_details
from models import Channel, Chunk, Job, Video
from search.embeddings import embed_texts, mean_vector

log = logging.getLogger("pipeline")


def _update(session, job: Job, **fields) -> None:
    for k, v in fields.items():
        setattr(job, k, v)
    session.commit()


def run_index_job(job_id: int, channel_input: str, max_videos: int | None = None) -> None:
    session = SessionLocal()
    job = session.get(Job, job_id)
    try:
        _update(session, job, status="running", stage="Finding channel")
        info = resolve_channel(channel_input)
        channel = session.get(Channel, info["id"])
        if channel is None:
            channel = Channel(**info)
            session.add(channel)
        else:
            for k, v in info.items():
                setattr(channel, k, v)
        _update(session, job, channel_id=channel.id, stage="Fetching video list")

        ids = list_upload_ids(channel.uploads_playlist, max_videos or settings.max_videos)
        for d in video_details(ids):
            video = session.get(Video, d["id"])
            if video is None:
                session.add(Video(channel_id=channel.id, **d))
            else:
                video.view_count, video.title = d["view_count"], d["title"]
        session.commit()

        # 1) transcripts + embeddings (no LLM needed)
        pending = session.scalars(
            select(Video).where(Video.channel_id == channel.id, Video.status.in_(["pending", "blocked"]))
        ).all()
        _update(session, job, stage="Fetching transcripts & embedding", progress=0, total=len(pending))
        blocked_streak = 0
        for i, video in enumerate(pending):
            if blocked_streak >= 3:  # stop hammering YouTube once it is clearly blocking us
                video.status = "blocked"
            else:
                try:
                    snippets = fetch_transcript(video.id)
                    blocked_streak = 0
                    if snippets:
                        store_transcript(session, video, snippets)
                    else:
                        video.status = "no_transcript"
                except TranscriptBlocked:
                    blocked_streak += 1
                    video.status = "blocked"
            _update(session, job, progress=i + 1)

        # 2) AI analysis: reels, promises, stances
        to_analyze = session.scalars(
            select(Video)
            .where(Video.channel_id == channel.id, Video.status.in_(["transcribed", "failed"]))
            .order_by(Video.published_at)
        ).all()
        _update(session, job, stage="AI analysis (reels, promises, opinions)", progress=0, total=len(to_analyze))
        failures = 0
        for i, video in enumerate(to_analyze):
            try:
                analyze_video(session, video)
            except LLMConfigError:
                raise
            except Exception:
                session.rollback()
                log.exception("analysis failed for %s", video.id)
                video.status = "failed"
                failures += 1
            _update(session, job, progress=i + 1)

        # 3) promise ledger
        _update(session, job, stage="Checking which promises you kept", progress=0, total=0)
        match_all_promises(session, channel.id, on_progress=lambda d, t: _update(session, job, progress=d, total=t))

        msg = f"Indexed {len(ids)} videos."
        blocked = sum(1 for v in pending if v.status == "blocked")
        if blocked:
            msg += (
                f" YouTube blocked transcript downloads for {blocked} videos — re-index later, set TRANSCRIPT_PROXY,"
                " or upload subtitles/audio per video on the Videos tab."
            )
        if failures:
            msg += f" {failures} failed AI analysis — re-run indexing to retry them."
        _update(session, job, status="done", stage="Done", message=msg)
    except LLMConfigError as e:
        session.rollback()
        _update(
            session,
            job,
            status="failed",
            message=f"{e}. Transcripts and search are ready; add the key and re-index to run the AI features.",
        )
    except Exception as e:
        session.rollback()
        log.error(traceback.format_exc())
        _update(session, job, status="failed", message=str(e)[:1000])
    finally:
        session.close()


def store_transcript(session, video: Video, snippets: list[dict]) -> None:
    session.query(Chunk).filter(Chunk.video_id == video.id).delete()
    chunks = chunk_transcript(snippets)
    vecs = embed_texts([c["text"] for c in chunks])
    session.add_all(Chunk(video_id=video.id, embedding=v, **c) for c, v in zip(chunks, vecs))
    video.embedding = mean_vector(vecs)
    video.status = "transcribed"
    session.flush()
    session.expire(video, ["chunks"])


def run_upload_job(job_id: int, video_id: str, filename: str, data: bytes) -> None:
    """Transcript uploaded by the creator: subtitles are parsed, audio goes through Groq Whisper."""
    session = SessionLocal()
    job = session.get(Job, job_id)
    try:
        video = session.get(Video, video_id)
        if filename.lower().endswith((".srt", ".vtt")):
            _update(session, job, status="running", stage="Reading subtitles")
            snippets = parse_subtitles(data.decode("utf-8", errors="ignore"))
        else:
            _update(session, job, status="running", stage="Transcribing audio with Whisper")
            snippets = transcribe_audio(filename, data)
        if not snippets:
            raise ValueError("No speech/subtitle lines found in that file")

        _update(session, job, stage="Embedding")
        store_transcript(session, video, snippets)
        session.commit()

        _update(session, job, stage="AI analysis (reels, promises, opinions)")
        analyze_video(session, video)
        _update(session, job, stage="Checking which promises you kept")
        match_all_promises(session, video.channel_id)
        _update(session, job, status="done", stage="Done", message=f"Added {len(snippets)} transcript lines.")
    except LLMConfigError as e:
        session.rollback()
        _update(session, job, status="failed", message=f"Transcript saved, but AI analysis needs a key: {e}")
    except Exception as e:
        session.rollback()
        log.error(traceback.format_exc())
        _update(session, job, status="failed", message=str(e)[:1000])
    finally:
        session.close()


def run_promise_job(job_id: int, channel_id: str) -> None:
    session = SessionLocal()
    job = session.get(Job, job_id)
    try:
        _update(session, job, status="running", stage="Checking which promises you kept")
        match_all_promises(session, channel_id, on_progress=lambda d, t: _update(session, job, progress=d, total=t))
        _update(session, job, status="done", stage="Done")
    except Exception as e:
        session.rollback()
        _update(session, job, status="failed", message=str(e)[:1000])
    finally:
        session.close()
