import csv
import io
import json
import os
import re
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from backend.app.db import get_db
from backend.app.models import Job, RawComment
from backend.app.schemas import IngestResponse
from backend.app.services.instagram_connector import instagram_connector

router = APIRouter(prefix="/ingest", tags=["Ingest"])

DEMO_DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "demo_comments.json")
MENTION_REGEX = re.compile(r"@([A-Za-z0-9_]+)")

@router.post("/demo", response_model=IngestResponse)
def ingest_demo_comments(db: Session = Depends(get_db)):
    """
    Ingests 300 realistic Instagram comments across 18 posts (reels, carousels, images).
    """
    if not os.path.exists(DEMO_DATA_PATH):
        raise HTTPException(status_code=404, detail="Demo data file not found.")

    with open(DEMO_DATA_PATH, "r", encoding="utf-8") as f:
        comments_data = json.load(f)

    job_id = f"job_{uuid.uuid4().hex[:12]}"
    
    job = Job(
        id=job_id,
        status="pending",
        progress=0,
        stage="Demo data ingested",
        stats_json=json.dumps({"total_raw": len(comments_data)})
    )
    db.add(job)

    raw_models = []
    for item in comments_data:
        text = item.get("text", "")
        mentions = MENTION_REGEX.findall(text)
        raw_models.append(RawComment(
            job_id=job_id,
            comment_id=item["comment_id"],
            post_id=item.get("post_id"),
            post_format=item.get("post_format", "reel"),
            username=item["username"],
            text=text,
            likes=item.get("likes", 0),
            reply_count=item.get("reply_count", 0),
            mentions_count=len(mentions),
            has_share_mention=len(mentions) > 0,
            timestamp=item["timestamp"],
            post_caption=item.get("post_caption")
        ))
    
    db.bulk_save_objects(raw_models)
    db.commit()

    return IngestResponse(
        message=f"Ingested {len(comments_data)} Instagram comments across 18 posts.",
        count=len(comments_data),
        job_id=job_id
    )


@router.post("/csv", response_model=IngestResponse)
async def ingest_csv_comments(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Ingests comments from an uploaded CSV file.
    Expected columns: comment_id, username, text, likes, timestamp, post_caption (optional), post_id (optional), post_format (optional), reply_count (optional)
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported.")

    content = await file.read()
    try:
        decoded = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        decoded = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(decoded))
    rows = list(reader)

    if not rows:
        raise HTTPException(status_code=400, detail="CSV file is empty.")

    required_cols = {"comment_id", "username", "text"}
    if not required_cols.issubset(set(reader.fieldnames or [])):
        raise HTTPException(
            status_code=400,
            detail=f"CSV missing required columns. Required: {list(required_cols)}, Found: {reader.fieldnames}"
        )

    job_id = f"job_{uuid.uuid4().hex[:12]}"
    job = Job(
        id=job_id,
        status="pending",
        progress=0,
        stage="CSV comments ingested",
        stats_json=json.dumps({"total_raw": len(rows)})
    )
    db.add(job)

    raw_models = []
    for idx, row in enumerate(rows):
        cid = row.get("comment_id") or f"csv_{idx+1}"
        uname = row.get("username", "user")
        if not uname.startswith("@"):
            uname = f"@{uname}"
        
        try:
            likes = int(row.get("likes", 0))
        except (ValueError, TypeError):
            likes = 0

        try:
            reply_count = int(row.get("reply_count", 0))
        except (ValueError, TypeError):
            reply_count = 0

        text = row.get("text", "")
        mentions = MENTION_REGEX.findall(text)
        post_format = (row.get("post_format") or "reel").lower()

        raw_models.append(RawComment(
            job_id=job_id,
            comment_id=cid,
            post_id=row.get("post_id"),
            post_format=post_format,
            username=uname,
            text=text,
            likes=likes,
            reply_count=reply_count,
            mentions_count=len(mentions),
            has_share_mention=len(mentions) > 0,
            timestamp=row.get("timestamp", ""),
            post_caption=row.get("post_caption")
        ))

    db.bulk_save_objects(raw_models)
    db.commit()

    return IngestResponse(
        message=f"Successfully uploaded {len(raw_models)} comments from CSV.",
        count=len(raw_models),
        job_id=job_id
    )


@router.get("/instagram/status")
def get_instagram_connector_status():
    """
    Returns connection status and instructions for the Instagram Graph API connector.
    Compliance: The connector is strictly for the user's own Business/Creator account.
    """
    return {
        "enabled": instagram_connector.enabled,
        "configured": instagram_connector.is_configured(),
        "status": "connected" if instagram_connector.is_configured() else "coming_soon",
        "description": "Instagram Graph API requires a Meta Business / Creator account linked to Facebook Page.",
        "compliance_notice": "Only authorized for Business/Creator accounts you own. Scraping is strictly prohibited.",
        "todo": "Configure INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, and INSTAGRAM_ACCESS_TOKEN in environment to enable live sync."
    }
