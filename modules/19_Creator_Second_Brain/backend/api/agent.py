"""Brain chat endpoints: a streaming chat turn (Server-Sent Events) and thread history."""

import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from agents import chat
from db import SessionLocal, get_session
from models import AgentThread, Channel

router = APIRouter(prefix="/api/channels/{channel_id}/agent")


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    thread_id: str | None = None


def _thread_or_404(session: Session, channel_id: str, thread_id: str) -> AgentThread:
    thread = session.get(AgentThread, thread_id)
    if thread is None or thread.channel_id != channel_id:
        raise HTTPException(404, "Conversation not found")
    return thread


def _thread_dict(t: AgentThread) -> dict:
    return {
        "id": t.id,
        "title": t.title,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


@router.post("/chat")
def chat_turn(channel_id: str, req: ChatRequest, session: Session = Depends(get_session)):
    if session.get(Channel, channel_id) is None:
        raise HTTPException(404, "Channel not found")
    if req.thread_id:
        thread = _thread_or_404(session, channel_id, req.thread_id)
    else:
        thread = AgentThread(id=uuid.uuid4().hex, channel_id=channel_id, title=req.message.strip()[:80])
        session.add(thread)
        session.commit()
    thread_id = thread.id

    def sse():
        yield f"data: {json.dumps({'type': 'thread', 'thread_id': thread_id})}\n\n"
        for event in chat.stream_chat(channel_id, thread_id, req.message):
            yield f"data: {json.dumps(event, default=str)}\n\n"
        with SessionLocal() as s:  # bump updated_at so the thread list sorts by activity
            if (t := s.get(AgentThread, thread_id)) is not None:
                t.updated_at = func.now()
                s.commit()

    return StreamingResponse(
        sse(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )


@router.get("/threads")
def list_threads(channel_id: str, session: Session = Depends(get_session)):
    rows = session.scalars(
        select(AgentThread).where(AgentThread.channel_id == channel_id).order_by(AgentThread.updated_at.desc())
    ).all()
    return [_thread_dict(t) for t in rows]


@router.get("/threads/{thread_id}")
def get_thread(channel_id: str, thread_id: str, session: Session = Depends(get_session)):
    thread = _thread_or_404(session, channel_id, thread_id)
    return {**_thread_dict(thread), "messages": chat.history(thread_id)}


@router.delete("/threads/{thread_id}")
def delete_thread(channel_id: str, thread_id: str, session: Session = Depends(get_session)):
    thread = _thread_or_404(session, channel_id, thread_id)
    chat.delete_thread(thread_id)
    session.delete(thread)
    session.commit()
    return {"ok": True}
