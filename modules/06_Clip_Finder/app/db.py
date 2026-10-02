import sqlite3
import json
from pathlib import Path
from typing import List, Optional, Dict, Any
from app.config import DATA_DIR
from app.models.schemas import TranscriptSegment, ClipCandidate

DB_PATH = DATA_DIR / "clipsmith.db"

def get_connection():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize SQLite tables for videos, transcripts, and ranked clips."""
    with get_connection() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS videos (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            duration REAL DEFAULT 0.0,
            file_path TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS transcript_segments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            video_id TEXT NOT NULL,
            segment_idx INTEGER NOT NULL,
            start_sec REAL NOT NULL,
            end_sec REAL NOT NULL,
            text TEXT NOT NULL,
            FOREIGN KEY (video_id) REFERENCES videos (id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS clips (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            video_id TEXT NOT NULL,
            rank_num INTEGER NOT NULL,
            title TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            start_sec REAL NOT NULL,
            end_sec REAL NOT NULL,
            duration REAL NOT NULL,
            score INTEGER NOT NULL,
            hook TEXT,
            topic TEXT,
            reason TEXT,
            context_required INTEGER DEFAULT 0,
            breakdown_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (video_id) REFERENCES videos (id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_clips_video ON clips (video_id);
        CREATE INDEX IF NOT EXISTS idx_transcripts_video ON transcript_segments (video_id);
        """)

init_db()

def save_video_metadata(video_id: str, filename: str, duration: float, file_path: str):
    """Save processed video metadata."""
    with get_connection() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO videos (id, filename, duration, file_path) VALUES (?, ?, ?, ?)",
            (video_id, filename, duration, file_path)
        )

def save_transcripts(video_id: str, segments: List[TranscriptSegment]):
    """Save speech-to-text transcript segments."""
    with get_connection() as conn:
        conn.execute("DELETE FROM transcript_segments WHERE video_id = ?", (video_id,))
        conn.executemany(
            """INSERT INTO transcript_segments (video_id, segment_idx, start_sec, end_sec, text)
               VALUES (?, ?, ?, ?, ?)""",
            [(video_id, idx, s.start, s.end, s.text) for idx, s in enumerate(segments)]
        )

def save_clips(video_id: str, clips: List[ClipCandidate]):
    """Save AI-evaluated clip candidates."""
    with get_connection() as conn:
        conn.execute("DELETE FROM clips WHERE video_id = ?", (video_id,))
        conn.executemany(
            """INSERT INTO clips (
                   video_id, rank_num, title, start_time, end_time, start_sec, end_sec,
                   duration, score, hook, topic, reason, context_required, breakdown_json
               ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            [
                (
                    video_id,
                    idx,
                    c.title,
                    c.start_time,
                    c.end_time,
                    c.start_sec,
                    c.end_sec,
                    c.duration,
                    c.score,
                    c.hook,
                    c.topic,
                    c.reason,
                    1 if c.context_required else 0,
                    json.dumps(c.breakdown)
                )
                for idx, c in enumerate(clips, 1)
            ]
        )

def get_clips_for_video(video_id: str) -> List[Dict[str, Any]]:
    """Retrieve persisted clips for a given video."""
    with get_connection() as conn:
        cursor = conn.execute(
            "SELECT * FROM clips WHERE video_id = ? ORDER BY rank_num ASC",
            (video_id,)
        )
        rows = cursor.fetchall()
        results = []
        for r in rows:
            d = dict(r)
            d["context_required"] = bool(d["context_required"])
            d["breakdown"] = json.loads(d["breakdown_json"]) if d.get("breakdown_json") else {}
            results.append(d)
        return results

def get_all_processed_videos() -> List[Dict[str, Any]]:
    """Retrieve list of all processed videos with their clip counts."""
    with get_connection() as conn:
        cursor = conn.execute("""
            SELECT v.id, v.filename, v.duration, v.created_at, COUNT(c.id) as clip_count
            FROM videos v
            LEFT JOIN clips c ON v.id = c.video_id
            GROUP BY v.id
            ORDER BY v.created_at DESC
        """)
        return [dict(r) for r in cursor.fetchall()]

def get_video(video_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve video metadata by ID."""
    with get_connection() as conn:
        cursor = conn.execute("SELECT * FROM videos WHERE id = ?", (video_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

