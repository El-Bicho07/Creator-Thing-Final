from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.db.session import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    creator_handle = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    posts = relationship("Post", back_populates="project", cascade="all, delete-orphan")
    style_profile = relationship("StyleProfile", back_populates="project", uselist=False, cascade="all, delete-orphan")
    drafts = relationship("GeneratedDraft", back_populates="project", cascade="all, delete-orphan")
