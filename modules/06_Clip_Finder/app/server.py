import asyncio
import os
import sys
import uuid
import urllib.parse
from pathlib import Path
from typing import Dict, Any, List

# Ensure base directory is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from fastapi import FastAPI, Request, Query, HTTPException, BackgroundTasks
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from pydantic import BaseModel
from app.config import UPLOADS_DIR, CLIPS_DIR, OLLAMA_MODEL, WHISPER_MODEL
from app.video.ffmpeg_service import check_ffmpeg_installed, get_video_duration, extract_audio, cut_clip
from app.transcription.whisper_service import transcribe_media, format_timestamped_transcript
from app.analysis.ollama_service import check_ollama_status
from app.analysis.clip_analyzer import analyze_transcript_for_clips
from app.models.schemas import seconds_to_timestamp
from app.db import save_video_metadata, save_transcripts, save_clips, get_all_processed_videos, get_clips_for_video
from app.video.youtube_service import is_youtube_url, download_youtube_video, get_youtube_info

app = FastAPI(title="Clipsmith API", version="1.0.0")

# Enable CORS for all local development requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory job state store: { id: { stage: int, result: list, error: str, video_path: str } }
JOBS: Dict[str, Dict[str, Any]] = {}

def get_best_available_model() -> str:
    """Detect the best local Ollama model currently installed."""
    _, available, _ = check_ollama_status()
    if not available:
        return OLLAMA_MODEL
    # If default model (llama3.2) is available, use it
    for m in available:
        if OLLAMA_MODEL in m:
            return m
    # Otherwise use first available model (e.g. mistral:latest or tinyllama:latest)
    return available[0]

def format_timestamp_ms(seconds: float) -> str:
    """Format seconds into HH:MM:SS.000 string."""
    tot = max(0.0, seconds)
    hrs = int(tot // 3600)
    mins = int((tot % 3600) // 60)
    secs = tot % 60
    return f"{hrs:02d}:{mins:02d}:{secs:06.3f}"

def run_pipeline(job_id: str, video_path: str, top: int):
    """Background task executing the video analysis pipeline."""
    try:
        # Stage 0: Transcribing
        JOBS[job_id]["stage"] = 0
        audio_path = str(UPLOADS_DIR / f"{job_id}_audio.wav")
        extract_audio(video_path, audio_path)
        segments = transcribe_media(audio_path, model_size=WHISPER_MODEL)
        if not segments:
            raise RuntimeError("Audio transcription produced no segments.")

        formatted_transcript = format_timestamped_transcript(segments)

        # Stage 1: Understanding
        JOBS[job_id]["stage"] = 1
        model_name = get_best_available_model()

        # Stage 2: Scoring
        JOBS[job_id]["stage"] = 2
        clips = analyze_transcript_for_clips(
            segments=segments,
            timestamped_transcript_str=formatted_transcript,
            model_name=model_name
        )

        # Stage 3: Ranking & Finalizing
        JOBS[job_id]["stage"] = 3
        clips = clips[:top]

        formatted_result = []
        for rank, c in enumerate(clips, 1):
            breakdown = c.breakdown or {
                "hook": 8.0,
                "engagement": 8.0,
                "info_value": 7.0,
                "emotion": 7.0,
                "clarity": 8.0,
                "standalone": 8.0
            }
            # Ensure 0-10 float values
            clean_breakdown = {k: float(v) for k, v in breakdown.items()}

            formatted_result.append({
                "rank": rank,
                "start": format_timestamp_ms(c.start_sec),
                "end": format_timestamp_ms(c.end_sec),
                "start_sec": c.start_sec,
                "end_sec": c.end_sec,
                "duration": round(c.duration, 1),
                "score": int(c.score),
                "title": c.title,
                "reason": c.reason or f"Strong clip on {c.topic}",
                "breakdown": clean_breakdown
            })

        JOBS[job_id]["result"] = formatted_result

        # Persist to SQLite
        try:
            video_dur = get_video_duration(video_path)
            save_video_metadata(job_id, Path(video_path).name, video_dur, video_path)
            save_transcripts(job_id, segments)
            save_clips(job_id, clips)
        except Exception as db_err:
            print(f"[Warning] Failed to persist to SQLite: {db_err}")

    except Exception as e:
        JOBS[job_id]["error"] = str(e)


@app.get("/history")
async def get_history():
    """Retrieve list of processed videos and their saved clip candidates from SQLite."""
    videos = get_all_processed_videos()
    return {"videos": videos}



@app.get("/", response_class=HTMLResponse)
async def serve_index():
    """Serve the Clipsmith single page app with no-cache headers."""
    index_file = BASE_DIR / "app" / "static" / "index.html"
    if not index_file.exists():
        raise HTTPException(status_code=404, detail="Frontend index.html not found.")
    return HTMLResponse(
        content=index_file.read_text(encoding="utf-8"),
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )



@app.get("/health")
async def health_check():
    """Health check endpoint for engine status."""
    ffmpeg_ok, _ = check_ffmpeg_installed()
    ollama_ok, available, _ = check_ollama_status()
    active_model = get_best_available_model() if available else None
    
    return {
        "status": "ok",
        "ffmpeg": ffmpeg_ok,
        "ollama": ollama_ok,
        "model": active_model
    }


@app.post("/analyze")
async def analyze_video(
    request: Request,
    background_tasks: BackgroundTasks,
    top: int = Query(default=6)
):
    """
    Accepts raw video body upload and starts asynchronous pipeline.
    Expects header 'X-Filename'.
    """
    raw_filename = request.headers.get("X-Filename", "video.mp4")
    clean_filename = urllib.parse.unquote(raw_filename)
    
    job_id = uuid.uuid4().hex[:12]
    safe_name = f"{job_id}_{Path(clean_filename).name}"
    video_path = str(UPLOADS_DIR / safe_name)

    # Stream video content to disk
    with open(video_path, "wb") as f:
        async for chunk in request.stream():
            f.write(chunk)

    # Initialize job entry
    JOBS[job_id] = {
        "stage": 0,
        "result": None,
        "error": None,
        "video_path": video_path
    }

    # Run processing asynchronously
    background_tasks.add_task(run_pipeline, job_id, video_path, top)

    return {"id": job_id}


class YouTubeAnalyzeRequest(BaseModel):
    url: str
    top: int = 6

def run_youtube_pipeline(job_id: str, url: str, top: int):
    """Download YouTube video then execute standard processing pipeline."""
    try:
        JOBS[job_id]["stage"] = -1
        JOBS[job_id]["stage_name"] = "Downloading YouTube Video..."
        video_path, title, duration = download_youtube_video(url, job_id=job_id)
        JOBS[job_id]["video_path"] = video_path
        JOBS[job_id]["filename"] = title
        run_pipeline(job_id, video_path, top)
    except Exception as e:
        JOBS[job_id]["error"] = f"YouTube processing failed: {e}"

@app.post("/analyze_url")
async def analyze_youtube_url(
    req: YouTubeAnalyzeRequest,
    background_tasks: BackgroundTasks
):
    """Accepts a YouTube URL, downloads it with yt-dlp, and runs the shorts discovery pipeline."""
    if not is_youtube_url(req.url):
        raise HTTPException(status_code=400, detail="Invalid YouTube URL. Please provide a valid youtube.com or youtu.be link.")

    job_id = uuid.uuid4().hex[:12]
    JOBS[job_id] = {
        "stage": -1,
        "stage_name": "Downloading YouTube Video...",
        "result": None,
        "error": None,
        "video_path": None,
        "filename": "YouTube Video"
    }

    background_tasks.add_task(run_youtube_pipeline, job_id, req.url.strip(), req.top)
    return {"id": job_id}



@app.get("/status")
async def check_status(id: str = Query(...)):
    """Return status, stage progress, error, or results for job_id."""
    job = JOBS.get(id)
    if job:
        if job.get("error"):
            return {"error": job["error"]}
        elif job.get("result") is not None:
            return {"result": job["result"]}
        else:
            return {
                "stage": job.get("stage", 0),
                "stage_name": job.get("stage_name", ""),
                "filename": job.get("filename", "")
            }


    # Fallback to SQLite persistence
    db_clips = get_clips_for_video(id)
    if db_clips:
        formatted = []
        for c in db_clips:
            formatted.append({
                "rank": c["rank_num"],
                "start": c["start_time"],
                "end": c["end_time"],
                "start_sec": c["start_sec"],
                "end_sec": c["end_sec"],
                "duration": c["duration"],
                "score": c["score"],
                "title": c["title"],
                "reason": c["reason"],
                "breakdown": c["breakdown"]
            })
        return {"result": formatted}

    return JSONResponse({"error": "Job not found"}, status_code=404)


@app.get("/clip")
async def get_clip(
    id: str = Query(...),
    s: float = Query(...),
    e: float = Query(...),
    crop: int = Query(default=1)
):
    """Cut and stream or download the requested video clip."""
    job = JOBS.get(id)
    video_path = job["video_path"] if job else None
    
    if not video_path:
        from app.db import get_video
        vid = get_video(id)
        if vid:
            video_path = vid["file_path"]

    if not video_path or not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Source video not found")


    clip_filename = f"clip_{id}_{int(s)}_{int(e)}_{'916' if crop==1 else 'orig'}.mp4"
    out_clip_path = str(CLIPS_DIR / clip_filename)

    if not os.path.exists(out_clip_path):
        cut_clip(
            video_path=video_path,
            start_sec=s,
            end_sec=e,
            output_clip_path=out_clip_path,
            vertical_crop=(crop == 1)
        )

    return FileResponse(
        out_clip_path,
        media_type="video/mp4",
        filename=clip_filename
    )
