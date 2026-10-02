import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.db import get_db
from backend.app.models import CalendarEvent, Idea
from backend.app.schemas import CalendarEventCreate, CalendarEventRead
from backend.app.routers.ideas import build_idea_read

router = APIRouter(prefix="/calendar", tags=["Calendar"])

@router.get("", response_model=List[CalendarEventRead])
def get_scheduled_events(db: Session = Depends(get_db)):
    """
    Returns all scheduled calendar events with associated idea details.
    """
    events = db.query(CalendarEvent).order_by(CalendarEvent.scheduled_date.asc()).all()
    results = []

    for event in events:
        idea = db.query(Idea).filter(Idea.id == event.idea_id).first()
        idea_read = build_idea_read(idea, db) if idea else None
        results.append(CalendarEventRead(
            id=event.id,
            idea_id=event.idea_id,
            scheduled_date=event.scheduled_date,
            notes=event.notes,
            created_at=event.created_at,
            idea=idea_read
        ))

    return results


@router.post("", response_model=CalendarEventRead)
def schedule_idea(payload: CalendarEventCreate, db: Session = Depends(get_db)):
    """
    Schedules an idea on a specific calendar date and sets idea status to 'planned'.
    """
    idea = db.query(Idea).filter(Idea.id == payload.idea_id).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found.")

    # Check if event already exists for this idea
    existing_event = db.query(CalendarEvent).filter(CalendarEvent.idea_id == payload.idea_id).first()
    if existing_event:
        existing_event.scheduled_date = payload.scheduled_date
        existing_event.notes = payload.notes
        event_obj = existing_event
    else:
        event_obj = CalendarEvent(
            id=f"cal_{uuid.uuid4().hex[:10]}",
            idea_id=payload.idea_id,
            scheduled_date=payload.scheduled_date,
            notes=payload.notes
        )
        db.add(event_obj)

    # Update idea status to 'planned'
    if idea.status != "posted":
        idea.status = "planned"

    db.commit()
    db.refresh(event_obj)

    idea_read = build_idea_read(idea, db)
    return CalendarEventRead(
        id=event_obj.id,
        idea_id=event_obj.idea_id,
        scheduled_date=event_obj.scheduled_date,
        notes=event_obj.notes,
        created_at=event_obj.created_at,
        idea=idea_read
    )


@router.delete("/{event_id}")
def delete_scheduled_event(event_id: str, db: Session = Depends(get_db)):
    """
    Removes a scheduled event from the calendar and resets idea status back to 'saved'.
    """
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Calendar event not found.")

    idea = db.query(Idea).filter(Idea.id == event.idea_id).first()
    if idea and idea.status == "planned":
        idea.status = "saved"

    db.delete(event)
    db.commit()
    return {"message": "Event removed successfully."}
