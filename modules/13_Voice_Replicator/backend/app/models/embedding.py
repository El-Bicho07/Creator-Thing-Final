from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.db.session import Base

class Embedding(Base):
    __tablename__ = "embeddings"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    post_id = Column(String, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Store embedding vector float array in JSON (works across Postgres, SQLite, etc.)
    vector = Column(JSON, nullable=False)
    dimension = Column(String, default="384")
    model_name = Column(String, default="all-MiniLM-L6-v2")
    created_at = Column(DateTime, default=datetime.utcnow)

    post = relationship("Post", back_populates="embedding")
