from sqlalchemy import Column, String, DateTime, Text, Integer, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.db.session import Base

class Post(Base):
    __tablename__ = "posts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    original_id = Column(String, nullable=True)  # From imported dataset if present
    caption = Column(Text, nullable=False)
    hashtags = Column(JSON, default=list)  # List of strings
    media_path = Column(String, nullable=True)
    post_type = Column(String, default="educational")  # educational, promotional, storytelling, carousel, etc.
    published_at = Column(DateTime, nullable=True, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="posts")
    text_features = relationship("PostTextFeatures", back_populates="post", uselist=False, cascade="all, delete-orphan")
    visual_features = relationship("PostVisualFeatures", back_populates="post", uselist=False, cascade="all, delete-orphan")
    embedding = relationship("Embedding", back_populates="post", uselist=False, cascade="all, delete-orphan")


class PostTextFeatures(Base):
    __tablename__ = "post_text_features"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    post_id = Column(String, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    
    char_count = Column(Integer, default=0)
    word_count = Column(Integer, default=0)
    sentence_count = Column(Integer, default=0)
    paragraph_count = Column(Integer, default=0)
    avg_sentence_length = Column(Float, default=0.0)
    avg_word_length = Column(Float, default=0.0)
    
    # Punctuation counts
    punctuation_counts = Column(JSON, default=dict)
    question_count = Column(Integer, default=0)
    exclamation_count = Column(Integer, default=0)
    
    # Formatting
    line_break_count = Column(Integer, default=0)
    has_bullet_points = Column(Integer, default=0)  # 0 or 1
    has_numbered_list = Column(Integer, default=0)  # 0 or 1
    capitalization_style = Column(String, default="standard")
    
    # Emojis & Hashtags
    emoji_count = Column(Integer, default=0)
    emojis = Column(JSON, default=list)
    hashtag_count = Column(Integer, default=0)
    
    # CTA & Links
    has_cta = Column(Integer, default=0)
    cta_phrase = Column(String, nullable=True)
    has_url = Column(Integer, default=0)
    
    # Vocabulary & Pronoun / Tone Indicators
    vocabulary_stats = Column(JSON, default=dict)
    first_person_ratio = Column(Float, default=0.0)
    second_person_ratio = Column(Float, default=0.0)
    formality_score = Column(Float, default=0.0)
    conversational_score = Column(Float, default=0.0)
    educational_score = Column(Float, default=0.0)
    promotional_score = Column(Float, default=0.0)
    storytelling_score = Column(Float, default=0.0)
    
    # Structure breakdown (e.g. ["hook", "explanation", "cta"])
    structure_components = Column(JSON, default=list)

    post = relationship("Post", back_populates="text_features")


class PostVisualFeatures(Base):
    __tablename__ = "post_visual_features"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    post_id = Column(String, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    aspect_ratio = Column(Float, nullable=True)
    brightness = Column(Float, nullable=True)
    contrast = Column(Float, nullable=True)
    saturation = Column(Float, nullable=True)
    dominant_colors = Column(JSON, default=list)  # List of hex strings e.g. ["#FFFFFF", "#000000"]
    color_histogram = Column(JSON, default=dict)
    text_area_ratio = Column(Float, default=0.0)
    ocr_text = Column(Text, nullable=True)

    post = relationship("Post", back_populates="visual_features")
