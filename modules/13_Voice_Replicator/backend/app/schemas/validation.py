from pydantic import BaseModel
from typing import Dict, List, Any, Optional
from datetime import datetime

class ValidationResponse(BaseModel):
    id: str
    draft_id: str
    overall_score: float
    metrics_breakdown: Dict[str, float]
    originality_status: str
    max_ngram_overlap: float
    flagged_phrases: List[str]
    retrieved_examples_used: List[str]
    created_at: datetime

    class Config:
        from_attributes = True
