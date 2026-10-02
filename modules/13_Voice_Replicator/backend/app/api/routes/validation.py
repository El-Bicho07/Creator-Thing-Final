from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.draft import GeneratedDraft
from app.models.validation import ValidationResult
from app.schemas.validation import ValidationResponse

router = APIRouter(prefix="/drafts", tags=["validation"])

@router.get("/{draft_id}/validation", response_model=ValidationResponse)
def get_draft_validation(draft_id: str, db: Session = Depends(get_db)):
    val = db.query(ValidationResult).filter(ValidationResult.draft_id == draft_id).first()
    if not val:
        raise HTTPException(status_code=404, detail="Validation result not found for draft")
    return val
