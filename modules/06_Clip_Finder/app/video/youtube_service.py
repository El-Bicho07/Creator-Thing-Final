import os
import re
import uuid
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
import yt_dlp
from app.config import UPLOADS_DIR

def is_youtube_url(url: str) -> bool:
    """Check if string is a valid YouTube video URL."""
    if not url or not isinstance(url, str):
        return False
    pattern = r"^(https?://)?(www\.)?(youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/|youtube\.com/shorts/)[A-Za-z0-9_-]+"
    return bool(re.match(pattern, url.strip()))

def get_youtube_info(url: str) -> Optional[Dict[str, Any]]:
    """Retrieve video title, duration, and thumbnail without downloading."""
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return {
                "title": info.get("title", "YouTube Video"),
                "duration": info.get("duration", 0),
                "thumbnail": info.get("thumbnail", ""),
                "id": info.get("id", "")
            }
    except Exception as e:
        print(f"[Warning] Failed to fetch YouTube metadata: {e}")
        return None

def download_youtube_video(url: str, job_id: Optional[str] = None) -> Tuple[str, str, float]:
    """
    Download YouTube video into data/uploads directory.
    Returns: (file_path, video_title, duration)
    """
    jid = job_id or uuid.uuid4().hex[:12]
    out_tmpl = str(UPLOADS_DIR / f"{jid}_%(title).50s.%(ext)s")

    ydl_opts = {
        "format": "bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "outtmpl": out_tmpl,
        "quiet": True,
        "no_warnings": True,
        "merge_output_format": "mp4",
        "postprocessors": [{
            "key": "FFmpegVideoConvertor",
            "preferedformat": "mp4",
        }]
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        title = info.get("title", "YouTube Video")
        duration = float(info.get("duration", 0.0))
        filename = ydl.prepare_filename(info)
        # Ensure mp4 extension
        if not filename.endswith(".mp4"):
            filename = str(Path(filename).with_suffix(".mp4"))
        
        return filename, title, duration
