from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from config import settings
from db import Base

DIM = settings.embedding_dim


class Channel(Base):
    __tablename__ = "channels"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # YouTube channel id (UC...)
    title: Mapped[str] = mapped_column(String)
    handle: Mapped[str | None] = mapped_column(String, nullable=True)
    thumbnail: Mapped[str | None] = mapped_column(String, nullable=True)
    uploads_playlist: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    videos: Mapped[list["Video"]] = relationship(back_populates="channel", cascade="all, delete-orphan")


class Video(Base):
    __tablename__ = "videos"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # YouTube video id
    channel_id: Mapped[str] = mapped_column(ForeignKey("channels.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text, default="")
    published_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    duration_sec: Mapped[int] = mapped_column(Integer, default=0)
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    thumbnail: Mapped[str | None] = mapped_column(String, nullable=True)
    # pending -> transcribed -> analyzed | no_transcript | failed
    status: Mapped[str] = mapped_column(String, default="pending")
    embedding = mapped_column(Vector(DIM), nullable=True)  # mean of chunk embeddings

    channel: Mapped[Channel] = relationship(back_populates="videos")
    chunks: Mapped[list["Chunk"]] = relationship(back_populates="video", cascade="all, delete-orphan")


class Chunk(Base):
    __tablename__ = "chunks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    video_id: Mapped[str] = mapped_column(ForeignKey("videos.id", ondelete="CASCADE"), index=True)
    start: Mapped[float] = mapped_column(Float)
    end: Mapped[float] = mapped_column(Float)
    text: Mapped[str] = mapped_column(Text)
    segments: Mapped[list] = mapped_column(JSON)  # [[start_sec, text], ...] for precise cuts
    embedding = mapped_column(Vector(DIM))

    video: Mapped[Video] = relationship(back_populates="chunks")


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    channel_id: Mapped[str | None] = mapped_column(String, nullable=True)
    kind: Mapped[str] = mapped_column(String, default="index")
    status: Mapped[str] = mapped_column(String, default="queued")  # queued|running|done|failed
    stage: Mapped[str] = mapped_column(String, default="")
    progress: Mapped[int] = mapped_column(Integer, default=0)
    total: Mapped[int] = mapped_column(Integer, default=0)
    message: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class ReelCandidate(Base):
    __tablename__ = "reel_candidates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    video_id: Mapped[str] = mapped_column(ForeignKey("videos.id", ondelete="CASCADE"), index=True)
    start: Mapped[float] = mapped_column(Float)
    end: Mapped[float] = mapped_column(Float)
    score: Mapped[float] = mapped_column(Float)  # 0-100
    hook: Mapped[str] = mapped_column(Text)
    caption: Mapped[str] = mapped_column(Text, default="")
    reason: Mapped[str] = mapped_column(Text, default="")
    scores: Mapped[dict] = mapped_column(JSON, default=dict)  # hook/standalone/emotion/value
    transcript: Mapped[str] = mapped_column(Text, default="")
    embedding = mapped_column(Vector(DIM), nullable=True)


class Promise(Base):
    __tablename__ = "promises"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    video_id: Mapped[str] = mapped_column(ForeignKey("videos.id", ondelete="CASCADE"), index=True)
    timestamp: Mapped[float] = mapped_column(Float)
    quote: Mapped[str] = mapped_column(Text)
    promise: Mapped[str] = mapped_column(Text)  # normalised: "Make a part 2 on budgeting apps"
    kind: Mapped[str] = mapped_column(String, default="video")  # video|series|review|update|other
    status: Mapped[str] = mapped_column(String, default="open")  # open|fulfilled
    manual: Mapped[bool] = mapped_column(Boolean, default=False)  # creator overrode status
    fulfilled_video_id: Mapped[str | None] = mapped_column(
        ForeignKey("videos.id", ondelete="SET NULL"), nullable=True
    )
    fulfilled_timestamp: Mapped[float | None] = mapped_column(Float, nullable=True)
    evidence: Mapped[str] = mapped_column(Text, default="")
    embedding = mapped_column(Vector(DIM), nullable=True)


class Stance(Base):
    __tablename__ = "stances"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    video_id: Mapped[str] = mapped_column(ForeignKey("videos.id", ondelete="CASCADE"), index=True)
    timestamp: Mapped[float] = mapped_column(Float)
    topic: Mapped[str] = mapped_column(String, index=True)
    stance: Mapped[str] = mapped_column(Text)
    quote: Mapped[str] = mapped_column(Text)
    embedding = mapped_column(Vector(DIM), nullable=True)


class AgentThread(Base):
    """A Brain chat conversation. Messages live in the LangGraph SQLite checkpointer, keyed by this id."""

    __tablename__ = "agent_threads"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # uuid4 hex, also the LangGraph thread_id
    channel_id: Mapped[str] = mapped_column(ForeignKey("channels.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
