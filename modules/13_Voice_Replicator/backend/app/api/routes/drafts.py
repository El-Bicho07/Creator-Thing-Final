from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.draft import GeneratedDraft
from app.schemas.generation import GenerationResponse

router = APIRouter(prefix="/projects/{project_id}/drafts", tags=["drafts"])

@router.get("", response_model=List[GenerationResponse])
def get_project_drafts(project_id: str, db: Session = Depends(get_db)):
    drafts = db.query(GeneratedDraft).filter(GeneratedDraft.project_id == project_id).order_by(GeneratedDraft.created_at.desc()).all()
    return drafts

@router.get("/{draft_id}", response_model=GenerationResponse)
def get_draft_by_id(project_id: str, draft_id: str, db: Session = Depends(get_db)):
    draft = db.query(GeneratedDraft).filter(GeneratedDraft.id == draft_id, GeneratedDraft.project_id == project_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    return draft

@router.delete("/{draft_id}")
def delete_draft(project_id: str, draft_id: str, db: Session = Depends(get_db)):
    draft = db.query(GeneratedDraft).filter(GeneratedDraft.id == draft_id, GeneratedDraft.project_id == project_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    db.delete(draft)
    db.commit()
    return {"message": "Draft deleted successfully"}
