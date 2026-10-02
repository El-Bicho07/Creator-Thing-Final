import json
import os
import hashlib
from typing import List
from app.models.schemas import TranscriptSegment, seconds_to_timestamp
from app.config import TRANSCRIPTS_DIR, WHISPER_MODEL

def _get_file_hash(filepath: str) -> str:
    """Generate SHA256 hash for file content/path to use as cache key."""
    h = hashlib.sha256()
    h.update(filepath.encode("utf-8"))
    if os.path.exists(filepath):
        h.update(str(os.path.getsize(filepath)).encode("utf-8"))
    return h.hexdigest()[:16]

# In-memory model cache to avoid reloading from disk on each request
_LOADED_MODELS = {}

def get_whisper_model(model_name: str):
    """Retrieve cached WhisperModel or initialize with optimal INT8 multithreaded settings."""
    if model_name not in _LOADED_MODELS:
        try:
            from faster_whisper import WhisperModel
        except ImportError:
            raise RuntimeError(
                "faster-whisper package is not installed. Please run: pip install faster-whisper"
            )
        # Optimal parameters: INT8 quantization is 3-4x faster on CPU/Apple Silicon than float32
        cores = max(2, (os.cpu_count() or 4) - 1)
        _LOADED_MODELS[model_name] = WhisperModel(
            model_name,
            device="auto",
            compute_type="int8",
            cpu_threads=cores,
            num_workers=1
        )
    return _LOADED_MODELS[model_name]

def transcribe_media(
    media_path: str,
    model_size: str = None
) -> List[TranscriptSegment]:
    """
    Transcribe audio/video using local faster-whisper.
    Returns list of TranscriptSegment instances with start, end, and text.
    """
    model_name = model_size or WHISPER_MODEL
    cache_key = _get_file_hash(media_path)
    cache_path = TRANSCRIPTS_DIR / f"{cache_key}_{model_name}.json"

    # Return cached transcript if available
    if os.path.exists(cache_path):
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return [TranscriptSegment(**item) for item in data]
        except Exception:
            pass

    # Retrieve cached warm model
    model = get_whisper_model(model_name)

    # Fast greedy beam_size=1 with VAD filtering
    segments_raw, info = model.transcribe(
        media_path,
        vad_filter=True,
        beam_size=1,
        best_of=1,
        temperature=0.0
    )

    segments: List[TranscriptSegment] = []
    for s in segments_raw:
        text = s.text.strip()
        if text:
            segments.append(TranscriptSegment(start=round(s.start, 2), end=round(s.end, 2), text=text))

    # Save cache
    try:
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump([s.model_dump() for s in segments], f, indent=2)
    except Exception:
        pass

    return segments


def format_timestamped_transcript(segments: List[TranscriptSegment]) -> str:
    """
    Format segments into a readable timestamped transcript string.
    Example:
    [00:00:15] When I started my company...
    [00:00:21] I had no employees...
    """
    lines = []
    for s in segments:
        ts = seconds_to_timestamp(s.start)
        lines.append(f"[{ts}] {s.text}")
    return "\n".join(lines)
