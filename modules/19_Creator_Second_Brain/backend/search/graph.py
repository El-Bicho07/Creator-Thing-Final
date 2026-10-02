"""Connect ideas: video-to-video similarity graph and related-video lookup."""

import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session

from models import Video


def _videos_with_vectors(session: Session, channel_id: str) -> tuple[list[Video], np.ndarray]:
    videos = session.scalars(
        select(Video).where(Video.channel_id == channel_id, Video.embedding.is_not(None))
    ).all()
    if not videos:
        return [], np.zeros((0, 0))
    mat = np.array([np.asarray(v.embedding, dtype=float) for v in videos])
    mat /= np.linalg.norm(mat, axis=1, keepdims=True) + 1e-9
    return list(videos), mat


def video_graph(session: Session, channel_id: str, neighbours: int = 3, min_sim: float = 0.6) -> dict:
    videos, mat = _videos_with_vectors(session, channel_id)
    if not videos:
        return {"nodes": [], "links": []}
    sims = mat @ mat.T
    np.fill_diagonal(sims, -1)

    links, seen = [], set()
    for i in range(len(videos)):
        for j in np.argsort(-sims[i])[:neighbours]:
            key = tuple(sorted((i, int(j))))
            if sims[i, j] >= min_sim and key not in seen:
                seen.add(key)
                links.append({"source": videos[i].id, "target": videos[int(j)].id, "similarity": round(float(sims[i, j]), 3)})

    nodes = [
        {
            "id": v.id,
            "title": v.title,
            "thumbnail": v.thumbnail,
            "views": v.view_count,
            "year": v.published_at.year,
            "published_at": v.published_at.isoformat(),
        }
        for v in videos
    ]
    return {"nodes": nodes, "links": links}


def related_videos(session: Session, video_id: str, limit: int = 6) -> list[dict]:
    video = session.get(Video, video_id)
    if video is None or video.embedding is None:
        return []
    videos, mat = _videos_with_vectors(session, video.channel_id)
    target = np.asarray(video.embedding, dtype=float)
    target /= np.linalg.norm(target) + 1e-9
    sims = mat @ target
    order = [i for i in np.argsort(-sims) if videos[i].id != video_id][:limit]
    return [
        {
            "video_id": videos[i].id,
            "title": videos[i].title,
            "thumbnail": videos[i].thumbnail,
            "published_at": videos[i].published_at.isoformat(),
            "similarity": round(float(sims[i]), 3),
        }
        for i in order
    ]
