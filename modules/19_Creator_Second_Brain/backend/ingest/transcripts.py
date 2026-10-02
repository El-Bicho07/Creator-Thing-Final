"""Timestamped transcripts from YouTube captions, subtitle files or audio (Groq Whisper), plus chunking."""

import re

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import IpBlocked, RequestBlocked
from youtube_transcript_api.proxies import GenericProxyConfig

from config import settings

_proxy = (
    GenericProxyConfig(http_url=settings.transcript_proxy, https_url=settings.transcript_proxy)
    if settings.transcript_proxy
    else None
)
_api = YouTubeTranscriptApi(proxy_config=_proxy)
_NOISE = re.compile(r"\[(music|applause|laughter|__)\]", re.I)


class TranscriptBlocked(Exception):
    """YouTube is refusing transcript requests from this IP."""


def _clean(snippets: list[dict]) -> list[dict]:
    out = []
    for s in snippets:
        text = _NOISE.sub("", re.sub(r"<[^>]+>", "", s["text"]).replace("\n", " ")).strip()
        if text:
            out.append({"start": float(s["start"]), "duration": float(s.get("duration", 0)), "text": text})
    return out


def fetch_transcript(video_id: str) -> list[dict] | None:
    """Return [{start, duration, text}] (English preferred), None if the video has no captions.
    Raises TranscriptBlocked when YouTube blocks the request."""
    try:
        listing = _api.list(video_id)
        try:
            transcript = listing.find_transcript(["en", "en-US", "en-GB", "en-IN"])
        except Exception:
            transcript = None
            for t in listing:
                transcript = t.translate("en") if t.is_translatable else t
                break
        if transcript is None:
            return None
        raw = transcript.fetch().to_raw_data()
    except (RequestBlocked, IpBlocked) as e:
        raise TranscriptBlocked(str(e).splitlines()[0]) from e
    except Exception:
        return None
    return _clean(raw) or None


# ---------- uploaded subtitle files (.srt / .vtt from YouTube Studio) ----------

_TIME = r"(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})"
_CUE = re.compile(_TIME + r"\s*-->\s*" + _TIME)


def _secs(h, m, s, ms) -> float:
    return int(h or 0) * 3600 + int(m) * 60 + int(s) + int(ms.ljust(3, "0")) / 1000


def parse_subtitles(content: str) -> list[dict]:
    snippets, block = [], None
    for line in content.replace("\r", "").split("\n"):
        m = _CUE.search(line)
        if m:
            g = m.groups()
            start, end = _secs(*g[:4]), _secs(*g[4:])
            block = {"start": start, "duration": max(0.0, end - start), "text": ""}
            snippets.append(block)
        elif not line.strip():
            block = None
        elif block is not None:
            block["text"] = (block["text"] + " " + line.strip()).strip()
    # auto-generated VTT repeats lines across cues — drop consecutive duplicates
    deduped = []
    for s in _clean(snippets):
        if deduped and s["text"] == deduped[-1]["text"]:
            continue
        deduped.append(s)
    return deduped


def transcribe_audio(filename: str, data: bytes) -> list[dict]:
    from ai.llm import _get_client

    result = _get_client().audio.transcriptions.create(
        file=(filename, data), model=settings.whisper_model, response_format="verbose_json"
    )
    segments = getattr(result, "segments", None)
    if segments is None and hasattr(result, "model_extra"):
        segments = (result.model_extra or {}).get("segments")
    return _clean(
        [
            {"start": s["start"], "duration": s["end"] - s["start"], "text": s["text"]}
            for s in (segments or [])
        ]
    )


# ---------- chunking ----------


def chunk_transcript(snippets: list[dict], seconds: int | None = None) -> list[dict]:
    """Group snippets into ~`seconds`-long windows, keeping per-line timestamps for precise cuts."""
    seconds = seconds or settings.chunk_seconds
    chunks, current = [], []
    for s in snippets:
        current.append(s)
        if current[-1]["start"] + current[-1]["duration"] - current[0]["start"] >= seconds:
            chunks.append(current)
            current = []
    if current:
        if chunks and current[-1]["start"] - current[0]["start"] < seconds / 3:
            chunks[-1].extend(current)  # merge a tiny tail into the previous chunk
        else:
            chunks.append(current)

    return [
        {
            "start": c[0]["start"],
            "end": c[-1]["start"] + c[-1]["duration"],
            "text": " ".join(s["text"] for s in c),
            "segments": [[round(s["start"], 1), s["text"]] for s in c],
        }
        for c in chunks
    ]
