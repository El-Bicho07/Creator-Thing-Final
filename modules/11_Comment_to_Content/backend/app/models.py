import json
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from backend.app.db import Base

def utcnow():
    return datetime.now(timezone.utc)

class Job(Base):
    __tablename__ = "jobs"

    id = Column(String(64), primary_key=True, index=True)
    status = Column(String(32), default="pending")  # pending, processing, completed, failed
    progress = Column(Integer, default=0)           # 0 to 100
    stage = Column(String(128), default="Initialized")
    error_message = Column(Text, nullable=True)
    stats_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    @property
    def stats(self):
        try:
            return json.loads(self.stats_json) if self.stats_json else {}
        except Exception:
            return {}

    @stats.setter
    def stats(self, val):
        self.stats_json = json.dumps(val)


class RawComment(Base):
    __tablename__ = "raw_comments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String(64), index=True)
    comment_id = Column(String(64), index=True)
    post_id = Column(String(64), nullable=True, index=True)
    post_format = Column(String(32), default="reel", index=True)  # reel, carousel, image
    username = Column(String(128), index=True)
    text = Column(Text)
    likes = Column(Integer, default=0)
    reply_count = Column(Integer, default=0)
    mentions_count = Column(Integer, default=0)
    has_share_mention = Column(Boolean, default=False)
    timestamp = Column(String(64))
    post_caption = Column(Text, nullable=True)
    
    # Cleaning attributes
    is_cleaned = Column(Boolean, default=False)
    clean_text = Column(Text, nullable=True)
    is_removed = Column(Boolean, default=False)
    removal_reason = Column(String(64), nullable=True)  # spam, emoji_only, too_short, duplicate


class CommentIntent(Base):
    __tablename__ = "comment_intents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String(64), index=True)
    comment_id = Column(String(64), index=True)
    intent = Column(String(64), index=True)  # question, request, confusion, pain_point, criticism, praise, more_of_this, other
    confidence = Column(Float, default=1.0)
    explanation = Column(Text, nullable=True)


class Cluster(Base):
    __tablename__ = "clusters"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String(64), index=True)
    cluster_id = Column(Integer, index=True)
    name = Column(String(255))
    description = Column(Text, nullable=True)
    comment_count = Column(Integer, default=0)
    unique_commenters_count = Column(Integer, default=0)
    total_likes = Column(Integer, default=0)
    total_replies = Column(Integer, default=0)
    demand_score = Column(Float, default=0.0)
    intent_breakdown_json = Column(Text, default="{}")
    top_comment_ids_json = Column(Text, default="[]")

    @property
    def intent_breakdown(self):
        try:
            return json.loads(self.intent_breakdown_json) if self.intent_breakdown_json else {}
        except Exception:
            return {}

    @property
    def top_comment_ids(self):
        try:
            return json.loads(self.top_comment_ids_json) if self.top_comment_ids_json else []
        except Exception:
            return []


class Idea(Base):
    __tablename__ = "ideas"

    id = Column(String(64), primary_key=True, index=True)
    job_id = Column(String(64), index=True)
    cluster_id = Column(Integer, index=True)
    title = Column(String(255))
    hook = Column(Text)
    format = Column(String(32))  # reel, carousel, story
    caption_draft = Column(Text)
    why_now = Column(Text)
    demand_score = Column(Float, default=0.0)
    status = Column(String(32), default="new")  # new, saved, planned, posted
    
    # Instagram-Native Granular Fields
    suggested_length = Column(String(32), nullable=True)  # e.g. "45s", "60s" for reels
    on_screen_text = Column(Text, nullable=True)          # for reels first frame / key beats
    slide_outline_json = Column(Text, default="[]")       # for carousels (5-8 slides)
    story_validation_json = Column(Text, default="{}")    # poll or question-sticker text
    hashtags_json = Column(Text, default="[]")            # 5-8 relevant hashtags
    story_mention_caption = Column(Text, nullable=True)   # Story-mention caption with @tags
    
    # Gap analysis
    gap_status = Column(String(64), default="new_opportunity")  # new_opportunity, already_covered
    gap_similarity = Column(Float, default=0.0)
    gap_matched_post = Column(Text, nullable=True)
    
    # Evidence
    supporting_comment_ids_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    @property
    def supporting_comment_ids(self):
        try:
            return json.loads(self.supporting_comment_ids_json) if self.supporting_comment_ids_json else []
        except Exception:
            return []

    @supporting_comment_ids.setter
    def supporting_comment_ids(self, val):
        self.supporting_comment_ids_json = json.dumps(val)

    @property
    def slide_outline(self):
        try:
            return json.loads(self.slide_outline_json) if self.slide_outline_json else []
        except Exception:
            return []

    @slide_outline.setter
    def slide_outline(self, val):
        self.slide_outline_json = json.dumps(val)

    @property
    def story_validation(self):
        try:
            return json.loads(self.story_validation_json) if self.story_validation_json else {}
        except Exception:
            return {}

    @story_validation.setter
    def story_validation(self, val):
        self.story_validation_json = json.dumps(val)

    @property
    def hashtags(self):
        try:
            return json.loads(self.hashtags_json) if self.hashtags_json else []
        except Exception:
            return []

    @hashtags.setter
    def hashtags(self, val):
        self.hashtags_json = json.dumps(val)


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(String(64), primary_key=True, index=True)
    idea_id = Column(String(64), ForeignKey("ideas.id"), index=True)
    scheduled_date = Column(String(32), index=True)  # YYYY-MM-DD
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)


class ReplyDraft(Base):
    __tablename__ = "reply_drafts"

    id = Column(String(64), primary_key=True, index=True)
    idea_id = Column(String(64), ForeignKey("ideas.id"), index=True)
    comment_id = Column(String(64), index=True)
    username = Column(String(128))
    reply_text = Column(Text)
    created_at = Column(DateTime, default=utcnow)


class LLMCache(Base):
    __tablename__ = "llm_cache"

    cache_key = Column(String(128), primary_key=True, index=True)
    task_type = Column(String(64), index=True)
    response_json = Column(Text)
    created_at = Column(DateTime, default=utcnow)
