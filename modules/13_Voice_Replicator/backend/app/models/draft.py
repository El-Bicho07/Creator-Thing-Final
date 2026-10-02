from sqlalchemy import Column, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.db.session import Base

class GeneratedDraft(Base):
    __tablename__ = "generated_drafts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    
    topic = Column(Text, nullable=False)
    post_type = Column(String, default="educational")
    
    hook = Column(Text, nullable=True)
    caption = Column(Text, nullable=False)
    cta = Column(Text, nullable=True)
    hashtags = Column(JSON, default=list)
    slides = Column(JSON, default=list)  # Carousel slides if applicable
    
    status = Column(String, default="draft")  # draft, saved, archived
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="drafts")
    validation_result = relationship("ValidationResult", back_populates="draft", uselist=False, cascade="all, delete-orphan")
