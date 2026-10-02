from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.app.db import get_db
from backend.app.models import ReplyDraft, Idea, RawComment

router = APIRouter(prefix="/replies", tags=["Replies"])

class FullReplyDraftItem(BaseModel):
    id: str
    idea_id: str
    idea_title: str
    idea_format: str
    idea_status: str
    comment_id: str
    username: str
    original_comment_text: str
    reply_text: str

@router.get("", response_model=List[FullReplyDraftItem])
def list_reply_drafts(
    posted_only: bool = Query(False, description="Filter only ideas marked as 'posted'"),
    idea_id: Optional[str] = Query(None, description="Filter by idea ID"),
    db: Session = Depends(get_db)
):
    """
    Returns draft 'You asked, I made it' replies addressed to the commenters
    whose requests inspired each idea.
    """
    query = db.query(ReplyDraft).join(Idea, ReplyDraft.idea_id == Idea.id)

    if posted_only:
        query = query.filter(Idea.status == "posted")
    if idea_id:
        query = query.filter(ReplyDraft.idea_id == idea_id)

    reply_models = query.all()
    results = []

    for rep in reply_models:
        idea = db.query(Idea).filter(Idea.id == rep.idea_id).first()
        raw_c = db.query(RawComment).filter(
            RawComment.comment_id == rep.comment_id,
            RawComment.job_id == (idea.job_id if idea else "")
        ).first()

        results.append(FullReplyDraftItem(
            id=rep.id,
            idea_id=rep.idea_id,
            idea_title=idea.title if idea else "Idea",
            idea_format=idea.format if idea else "Reel",
            idea_status=idea.status if idea else "new",
            comment_id=rep.comment_id,
            username=rep.username,
            original_comment_text=raw_c.clean_text or raw_c.text if raw_c else "User comment",
            reply_text=rep.reply_text
        ))

    return results
