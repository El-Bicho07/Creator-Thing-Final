from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.db.session import Base

class StyleProfile(Base):
    __tablename__ = "style_profiles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Aggregated Tone Indicators (0.0 to 1.0)
    tone_scores = Column(JSON, default=dict)  # {"formality": 0.3, "conversational": 0.8, "educational": 0.7, ...}
    
    # Caption Statistics
    caption_stats = Column(JSON, default=dict)  # {"average_word_count": 120, "average_sentence_length": 14, ...}
    
    # Formatting Preferences
    formatting_patterns = Column(JSON, default=dict)  # {"short_paragraphs": true, "line_break_frequency": 0.7, ...}
    
    # Emoji & Hashtag Behavior
    emoji_profile = Column(JSON, default=dict)  # {"frequency": 0.4, "top_emojis": ["🚀", "🔥"]}
    hashtag_profile = Column(JSON, default=dict)  # {"avg_count": 5, "common_hashtags": ["#ai", "#tech"]}
    
    # CTA Profile
    cta_profile = Column(JSON, default=dict)  # {"frequency": 0.65, "common_phrases": ["Comment below", "Save for later"]}
    
    # Common Structural Templates
    common_structures = Column(JSON, default=list)  # [["hook", "body", "cta"], ...]
    
    # Common Vocabulary & Phrases
    vocabulary_profile = Column(JSON, default=dict)  # {"top_keywords": [...], "frequent_phrases": [...]}
    
    # Visual Style Summary
    visual_profile = Column(JSON, default=dict)  # {"avg_aspect_ratio": 1.0, "dominant_colors": [...], ...}
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="style_profile")
