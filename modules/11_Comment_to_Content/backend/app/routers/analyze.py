import json
import logging
from typing import Optional
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.db import get_db
from backend.app.models import Job, RawComment
from backend.app.schemas import JobStatusResponse
from backend.app.pipeline.runner import run_pipeline_for_job
from backend.app.routers.ingest import ingest_demo_comments

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Analyze & Jobs"])

class AnalyzeRequest(BaseModel):
    job_id: Optional[str] = None

@router.post("/analyze")
def start_pipeline_analysis(
    request: Optional[AnalyzeRequest] = None,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db)
):
    """
    Kicks off the ComIdea analysis pipeline for a job in the background.
    If no job_id is provided, auto-ingests demo comments if needed and runs.
    """
    job_id = request.job_id if request else None

    if not job_id:
        # Check if there is an existing pending job
        latest_job = db.query(Job).order_by(Job.created_at.desc()).first()
        if latest_job and db.query(RawComment).filter(RawComment.job_id == latest_job.id).count() > 0:
            job_id = latest_job.id
        else:
            # Auto ingest demo comments
            ingest_res = ingest_demo_comments(db)
            job_id = ingest_res.job_id

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    job.status = "processing"
    job.progress = 5
    job.stage = "Starting comment analysis"
    db.commit()

    # Schedule background execution
    background_tasks.add_task(run_pipeline_for_job, job_id)

    return {
        "job_id": job_id,
        "status": "processing",
        "message": "Analysis pipeline launched in background."
    }


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    """
    Polls current status and progress of an analysis job.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    return JobStatusResponse(
        id=job.id,
        status=job.status,
        progress=job.progress,
        stage=job.stage,
        error_message=job.error_message,
        stats=job.stats,
        created_at=job.created_at,
        updated_at=job.updated_at
    )
