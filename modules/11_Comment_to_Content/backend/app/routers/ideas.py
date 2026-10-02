import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.db import get_db
from backend.app.models import Idea, RawComment, CommentIntent, Cluster, ReplyDraft
from backend.app.schemas import (
    IdeaRead, EvidenceComment, ReplyDraftRead, IdeaStatusUpdate
)

router = APIRouter(prefix="/ideas", tags=["Ideas"])

def build_idea_read(idea: Idea, db: Session) -> IdeaRead:
    # 1. Fetch supporting comments
    sup_ids = idea.supporting_comment_ids
    raw_comments = (
        db.query(RawComment)
        .filter(RawComment.job_id == idea.job_id, RawComment.comment_id.in_(sup_ids))
        .all()
    ) if sup_ids else []

    # Fetch intents for these comments
    intents = (
        db.query(CommentIntent)
        .filter(CommentIntent.job_id == idea.job_id, CommentIntent.comment_id.in_(sup_ids))
        .all()
    ) if sup_ids else []
    intent_map = {i.comment_id: i.intent for i in intents}

    evidence_comments = [
        EvidenceComment(
            comment_id=rc.comment_id,
            username=rc.username,
            text=rc.text,
            clean_text=rc.clean_text,
            likes=rc.likes or 0,
            reply_count=rc.reply_count or 0,
            timestamp=rc.timestamp or "",
            post_id=rc.post_id,
            post_format=rc.post_format or "reel",
            has_share_mention=rc.has_share_mention or False,
            intent=intent_map.get(rc.comment_id, "request")
        )
        for rc in raw_comments
    ]

    # 2. Fetch cluster name
    cluster = db.query(Cluster).filter(
        Cluster.job_id == idea.job_id,
        Cluster.cluster_id == idea.cluster_id
    ).first()
    cluster_name = cluster.name if cluster else f"Theme #{idea.cluster_id}"

    # 3. Fetch replies
    db_replies = db.query(ReplyDraft).filter(ReplyDraft.idea_id == idea.id).all()
    replies = [
        ReplyDraftRead(
            id=r.id,
            idea_id=r.idea_id,
            comment_id=r.comment_id,
            username=r.username,
            reply_text=r.reply_text,
            created_at=r.created_at
        )
        for r in db_replies
    ]

    return IdeaRead(
        id=idea.id,
        job_id=idea.job_id,
        cluster_id=idea.cluster_id,
        cluster_name=cluster_name,
        title=idea.title,
        hook=idea.hook,
        format=idea.format or "reel",
        caption_draft=idea.caption_draft,
        why_now=idea.why_now,
        demand_score=idea.demand_score,
        status=idea.status,
        gap_status=idea.gap_status,
        gap_similarity=idea.gap_similarity,
        gap_matched_post=idea.gap_matched_post,
        suggested_length=idea.suggested_length,
        on_screen_text=idea.on_screen_text,
        slide_outline=idea.slide_outline,
        story_validation=idea.story_validation,
        hashtags=idea.hashtags,
        story_mention_caption=idea.story_mention_caption,
        supporting_comment_ids=sup_ids,
        evidence_comments=evidence_comments,
        replies=replies,
        created_at=idea.created_at
    )


@router.get("", response_model=List[IdeaRead])
def list_ideas(
    status: Optional[str] = Query(None, description="Filter by status: new, saved, planned, posted"),
    gap_status: Optional[str] = Query(None, description="Filter by gap: new_opportunity, already_covered"),
    cluster_id: Optional[int] = Query(None, description="Filter by cluster ID"),
    job_id: Optional[str] = Query(None, description="Filter by job ID"),
    db: Session = Depends(get_db)
):
    """
    Returns ranked content ideas with complete supporting evidence comments and Instagram fields.
    """
    query = db.query(Idea)

    if job_id:
        query = query.filter(Idea.job_id == job_id)
    if status:
        query = query.filter(Idea.status == status)
    if gap_status:
        query = query.filter(Idea.gap_status == gap_status)
    if cluster_id is not None:
        query = query.filter(Idea.cluster_id == cluster_id)

    ideas = query.order_by(Idea.demand_score.desc()).all()

    return [build_idea_read(idea, db) for idea in ideas]


@router.get("/{idea_id}", response_model=IdeaRead)
def get_idea_detail(idea_id: str, db: Session = Depends(get_db)):
    """
    Returns single idea with supporting comments, slide outline, story validation, and reply drafts.
    """
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found.")

    return build_idea_read(idea, db)


@router.post("/{idea_id}/status", response_model=IdeaRead)
def update_idea_status(
    idea_id: str,
    payload: IdeaStatusUpdate,
    db: Session = Depends(get_db)
):
    """
    Updates idea status: 'new', 'saved', 'planned', 'posted'
    """
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found.")

    allowed_statuses = {"new", "saved", "planned", "posted"}
    if payload.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{payload.status}'. Allowed: {list(allowed_statuses)}"
        )

    idea.status = payload.status
    db.commit()
    db.refresh(idea)

    return build_idea_read(idea, db)
