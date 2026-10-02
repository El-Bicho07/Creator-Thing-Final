from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class PostImportItem(BaseModel):
    id: Optional[str] = None
    caption: str
    hashtags: Optional[List[str]] = []
    media_path: Optional[str] = None
    post_type: Optional[str] = "educational"
    published_at: Optional[str] = None

class PostDatasetImport(BaseModel):
    posts: List[PostImportItem]

class TextFeaturesResponse(BaseModel):
    char_count: int
    word_count: int
    sentence_count: int
    paragraph_count: int
    avg_sentence_length: float
    avg_word_length: float
    punctuation_counts: Dict[str, int]
    emoji_count: int
    emojis: List[str]
    hashtag_count: int
    has_cta: bool
    cta_phrase: Optional[str]
    first_person_ratio: float
    second_person_ratio: float
    formality_score: float
    conversational_score: float
    educational_score: float
    promotional_score: float
    storytelling_score: float
    structure_components: List[str]

    class Config:
        from_attributes = True

class VisualFeaturesResponse(BaseModel):
    width: Optional[int]
    height: Optional[int]
    aspect_ratio: Optional[float]
    brightness: Optional[float]
    contrast: Optional[float]
    saturation: Optional[float]
    dominant_colors: List[str]
    text_area_ratio: float
    ocr_text: Optional[str]

    class Config:
        from_attributes = True

class PostResponse(BaseModel):
    id: str
    project_id: str
    original_id: Optional[str]
    caption: str
    hashtags: List[str]
    media_path: Optional[str]
    post_type: str
    published_at: Optional[datetime]
    created_at: datetime
    text_features: Optional[TextFeaturesResponse] = None
    visual_features: Optional[VisualFeaturesResponse] = None

    class Config:
        from_attributes = True
