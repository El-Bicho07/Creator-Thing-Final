from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime

# --- Comment & Ingest Schemas ---
class CommentInput(BaseModel):
    comment_id: str
    username: str
    text: str
    likes: int = 0
    reply_count: int = 0
    timestamp: str
    post_id: Optional[str] = None
    post_format: Optional[str] = "reel"  # reel, carousel, image
    post_caption: Optional[str] = None

class EvidenceComment(BaseModel):
    comment_id: str
    username: str
    text: str
    clean_text: Optional[str] = None
    likes: int = 0
    reply_count: int = 0
    timestamp: str
    post_id: Optional[str] = None
    post_format: Optional[str] = "reel"
    has_share_mention: bool = False
    intent: Optional[str] = None

class IngestResponse(BaseModel):
    message: str
    count: int
    job_id: Optional[str] = None

# --- Job Schemas ---
class JobStatusResponse(BaseModel):
    id: str
    status: str
    progress: int
    stage: str
    error_message: Optional[str] = None
    stats: Dict[str, Any] = {}
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# --- Cluster Schemas ---
class ClusterRead(BaseModel):
    id: int
    cluster_id: int
    job_id: str
    name: str
    description: Optional[str] = None
    comment_count: int
    unique_commenters_count: int
    total_likes: int
    total_replies: int = 0
    demand_score: float
    intent_breakdown: Dict[str, int] = {}
    top_comment_ids: List[str] = []

# --- Idea Schemas ---
class SlideItem(BaseModel):
    slide_number: int
    title: str
    visual: str
    content: str

class StoryValidation(BaseModel):
    type: Literal["poll", "question"] = "poll"
    prompt: str
    options: Optional[List[str]] = None  # e.g. ["Yes, need it! 🔥", "Already know this 🤷‍♂️"]
    sticker_preview: str

class ReplyDraftRead(BaseModel):
    id: str
    idea_id: str
    comment_id: str
    username: str
    reply_text: str
    created_at: Optional[datetime] = None

class IdeaRead(BaseModel):
    id: str
    job_id: str
    cluster_id: int
    cluster_name: Optional[str] = None
    title: str
    hook: str
    format: str  # reel, carousel, story
    caption_draft: str
    why_now: str
    demand_score: float
    status: str  # new, saved, planned, posted
    gap_status: str  # new_opportunity, already_covered
    gap_similarity: float
    gap_matched_post: Optional[str] = None
    
    # Instagram-Native Fields
    suggested_length: Optional[str] = None
    on_screen_text: Optional[str] = None
    slide_outline: List[Dict[str, Any]] = []
    story_validation: Optional[Dict[str, Any]] = None
    hashtags: List[str] = []
    story_mention_caption: Optional[str] = None
    
    # Evidence & Responses
    supporting_comment_ids: List[str] = []
    evidence_comments: List[EvidenceComment] = []
    replies: List[ReplyDraftRead] = []
    created_at: Optional[datetime] = None

class IdeaStatusUpdate(BaseModel):
    status: str = Field(..., description="saved, planned, posted, or new")

# --- Calendar Schemas ---
class CalendarEventCreate(BaseModel):
    idea_id: str
    scheduled_date: str  # YYYY-MM-DD
    notes: Optional[str] = None

class CalendarEventRead(BaseModel):
    id: str
    idea_id: str
    scheduled_date: str
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    idea: Optional[IdeaRead] = None

# --- Insights Schemas ---
class IntentDistributionItem(BaseModel):
    intent: str
    count: int
    percentage: float
    color: Optional[str] = None

class TopThemeItem(BaseModel):
    cluster_id: int
    name: str
    demand_score: float
    comment_count: int
    unique_commenters: int
    total_likes: int
    total_replies: int = 0

class TimelinePoint(BaseModel):
    date: str
    comment_count: int
    likes_count: int

class FormatIntentMatrixItem(BaseModel):
    format: str  # reel, carousel, image
    total_comments: int
    intent_counts: Dict[str, int]
    top_intent: str
    share_mentions: int

class InsightsResponse(BaseModel):
    total_raw_comments: int
    total_cleaned_comments: int
    spam_filtered_count: int
    intent_distribution: List[IntentDistributionItem]
    top_themes: List[TopThemeItem]
    timeline: List[TimelinePoint]
    opportunity_stats: Dict[str, int]
    format_intent_matrix: List[FormatIntentMatrixItem] = []
    format_takeaways: List[str] = []

# --- LLM Structured Output Pydantic Schemas ---
class CommentIntentClassification(BaseModel):
    comment_id: str
    intent: str = Field(
        ...,
        description="One of: question, request, confusion, pain_point, criticism, praise, more_of_this, other"
    )
    confidence: float = Field(default=0.9, ge=0.0, le=1.0)
    has_share_mention: bool = Field(default=False, description="True if comment mentions a friend e.g. @username")
    explanation: Optional[str] = None

class BatchIntentClassificationResponse(BaseModel):
    classifications: List[CommentIntentClassification]

class ClusterNamingResponse(BaseModel):
    name: str = Field(..., description="Short, punchy 3-6 word theme name")
    description: str = Field(..., description="1-2 sentences summarizing audience requests/questions")

class SingleIdeaItem(BaseModel):
    title: str = Field(..., description="Engaging, clickable content title")
    format: str = Field(..., description="reel, carousel, or story")
    hook: str = Field(..., description="Attention-grabbing first 3 seconds hook")
    suggested_length: Optional[str] = Field(default="45s", description="For reels: e.g. 30s, 45s, 60s")
    on_screen_text: Optional[str] = Field(default=None, description="For reels: text overlay for the first frame")
    slide_outline: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="For carousels: 5 to 8 slide-by-slide outline (slide_number, title, visual, content)"
    )
    story_validation: Optional[Dict[str, Any]] = Field(
        default=None,
        description="For stories / story validation: poll or question sticker text and options"
    )
    caption_draft: str = Field(..., description="Ready-to-post Instagram caption")
    hashtags: List[str] = Field(default=[], description="5 to 8 targeted Instagram hashtags")
    story_mention_caption: Optional[str] = Field(default=None, description="Story shoutout caption tagging commenters")
    why_now: str = Field(..., description="Audience demand rationale")
    supporting_comment_ids: List[str] = Field(..., description="Exact IDs of top comments that inspired this idea")

class ClusterIdeasResponse(BaseModel):
    ideas: List[SingleIdeaItem]

class ReplyTemplateItem(BaseModel):
    comment_id: str
    username: str
    reply_text: str

class ClusterRepliesResponse(BaseModel):
    replies: List[ReplyTemplateItem]
