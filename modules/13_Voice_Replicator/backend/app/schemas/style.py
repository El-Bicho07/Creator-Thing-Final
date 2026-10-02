from pydantic import BaseModel
from typing import Dict, List, Any, Optional
from datetime import datetime

class StyleProfileResponse(BaseModel):
    id: str
    project_id: str
    tone_scores: Dict[str, float]
    caption_stats: Dict[str, Any]
    formatting_patterns: Dict[str, Any]
    emoji_profile: Dict[str, Any]
    hashtag_profile: Dict[str, Any]
    cta_profile: Dict[str, Any]
    common_structures: List[List[str]]
    vocabulary_profile: Dict[str, Any]
    visual_profile: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
