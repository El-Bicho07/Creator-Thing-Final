"""YouTube Data API v3 client: resolve a channel, list its uploads, fetch video details."""

import re
from datetime import datetime

import httpx

from config import settings

API = "https://www.googleapis.com/youtube/v3"


class YouTubeError(Exception):
    pass


def _get(path: str, **params) -> dict:
    if not settings.youtube_api_key:
        raise YouTubeError("YOUTUBE_API_KEY is not set in .env")
    params["key"] = settings.youtube_api_key
    resp = httpx.get(f"{API}/{path}", params=params, timeout=30)
    if resp.status_code != 200:
        try:
            msg = resp.json()["error"]["message"]
        except Exception:
            msg = resp.text[:300]
        raise YouTubeError(f"YouTube API error ({resp.status_code}): {msg}")
    return resp.json()


def _parse_channel_input(raw: str) -> tuple[str, str]:
    """Return (kind, value) where kind is id | handle | username | query."""
    s = raw.strip()
    if m := re.search(r"youtube\.com/channel/(UC[\w-]{22})", s):
        return "id", m.group(1)
    if re.fullmatch(r"UC[\w-]{22}", s):
        return "id", s
    if m := re.search(r"youtube\.com/@([\w.\-]+)", s):
        return "handle", "@" + m.group(1)
    if re.fullmatch(r"@[\w.\-]+", s):
        return "handle", s
    if m := re.search(r"youtube\.com/user/([\w.\-]+)", s):
        return "username", m.group(1)
    if m := re.search(r"youtube\.com/c/([\w.\-]+)", s):
        return "query", m.group(1)
    return "handle", "@" + s.lstrip("@") if " " not in s else s


def resolve_channel(raw: str) -> dict:
    kind, value = _parse_channel_input(raw)
    part = "snippet,contentDetails"
    items = []
    if kind == "id":
        items = _get("channels", part=part, id=value).get("items", [])
    elif kind == "handle":
        items = _get("channels", part=part, forHandle=value).get("items", [])
    elif kind == "username":
        items = _get("channels", part=part, forUsername=value).get("items", [])
    if not items:  # fall back to search (costs more quota)
        found = _get("search", part="snippet", q=value.lstrip("@"), type="channel", maxResults=1)
        if not found.get("items"):
            raise YouTubeError(f"Could not find a YouTube channel for '{raw}'")
        cid = found["items"][0]["snippet"]["channelId"]
        items = _get("channels", part=part, id=cid).get("items", [])
    if not items:
        raise YouTubeError(f"Could not find a YouTube channel for '{raw}'")

    ch = items[0]
    snip = ch["snippet"]
    return {
        "id": ch["id"],
        "title": snip["title"],
        "handle": snip.get("customUrl"),
        "thumbnail": snip.get("thumbnails", {}).get("default", {}).get("url"),
        "uploads_playlist": ch["contentDetails"]["relatedPlaylists"]["uploads"],
    }


def list_upload_ids(uploads_playlist: str, limit: int) -> list[str]:
    ids: list[str] = []
    token = None
    while len(ids) < limit:
        params = {"part": "contentDetails", "playlistId": uploads_playlist, "maxResults": 50}
        if token:
            params["pageToken"] = token
        data = _get("playlistItems", **params)
        ids += [it["contentDetails"]["videoId"] for it in data.get("items", [])]
        token = data.get("nextPageToken")
        if not token:
            break
    return ids[:limit]


def _iso_duration(d: str) -> int:
    m = re.fullmatch(r"P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", d or "")
    if not m:
        return 0
    days, h, mi, s = (int(x) if x else 0 for x in m.groups())
    return days * 86400 + h * 3600 + mi * 60 + s


def video_details(video_ids: list[str]) -> list[dict]:
    out = []
    for i in range(0, len(video_ids), 50):
        batch = video_ids[i : i + 50]
        data = _get("videos", part="snippet,contentDetails,statistics", id=",".join(batch))
        for v in data.get("items", []):
            snip = v["snippet"]
            if snip.get("liveBroadcastContent") in ("live", "upcoming"):
                continue
            thumbs = snip.get("thumbnails", {})
            out.append(
                {
                    "id": v["id"],
                    "title": snip["title"],
                    "description": snip.get("description", ""),
                    "published_at": datetime.fromisoformat(snip["publishedAt"].replace("Z", "+00:00")).replace(
                        tzinfo=None
                    ),
                    "duration_sec": _iso_duration(v["contentDetails"].get("duration", "")),
                    "view_count": int(v.get("statistics", {}).get("viewCount", 0)),
                    "thumbnail": (thumbs.get("medium") or thumbs.get("default") or {}).get("url"),
                }
            )
    return out
