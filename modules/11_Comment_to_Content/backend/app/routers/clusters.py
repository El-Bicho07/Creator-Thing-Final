from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.db import get_db
from backend.app.models import Cluster
from backend.app.schemas import ClusterRead

router = APIRouter(prefix="/clusters", tags=["Clusters"])

@router.get("", response_model=List[ClusterRead])
def list_clusters(
    job_id: Optional[str] = Query(None, description="Filter clusters by job ID"),
    db: Session = Depends(get_db)
):
    """
    Returns discovered clusters and themes ranked by demand score.
    """
    query = db.query(Cluster)
    if job_id:
        query = query.filter(Cluster.job_id == job_id)

    clusters = query.order_by(Cluster.demand_score.desc()).all()

    return [
        ClusterRead(
            id=c.id,
            cluster_id=c.cluster_id,
            job_id=c.job_id,
            name=c.name,
            description=c.description,
            comment_count=c.comment_count,
            unique_commenters_count=c.unique_commenters_count,
            total_likes=c.total_likes,
            demand_score=c.demand_score,
            intent_breakdown=c.intent_breakdown,
            top_comment_ids=c.top_comment_ids
        )
        for c in clusters
    ]
