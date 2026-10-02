from sqlalchemy import Column, String, DateTime, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.db.session import Base

class ValidationResult(Base):
    __tablename__ = "validation_results"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    draft_id = Column(String, ForeignKey("generated_drafts.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    overall_score = Column(Float, default=0.0)  # 0 to 100
    metrics_breakdown = Column(JSON, default=dict)  # {"tone": 88, "length": 91, "structure": 85, "emoji": 72, "hashtag": 81, "cta": 86}
    
    originality_status = Column(String, default="PASS")  # PASS, FLAG, REJECT
    max_ngram_overlap = Column(Float, default=0.0)
    flagged_phrases = Column(JSON, default=list)
    retrieved_examples_used = Column(JSON, default=list)  # List of post IDs used in prompt
    
    created_at = Column(DateTime, default=datetime.utcnow)

    draft = relationship("GeneratedDraft", back_populates="validation_result")
