import sys
import os

# Add root directory to python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.app.db import SessionLocal, Base, engine
from backend.app.routers.ingest import ingest_demo_comments
from backend.app.pipeline.runner import run_pipeline_for_job
from backend.app.models import Job, Idea, Cluster, CommentIntent, ReplyDraft

def test_full_pipeline():
    print("1. Creating database tables...")
    Base.metadata.create_all(bind=engine)

    print("2. Ingesting demo comments...")
    db = SessionLocal()
    ingest_res = ingest_demo_comments(db)
    job_id = ingest_res.job_id
    print(f"Ingested {ingest_res.count} comments under Job ID: {job_id}")

    print("3. Executing pipeline...")
    run_pipeline_for_job(job_id)

    print("4. Validating output records...")
    job = db.query(Job).filter(Job.id == job_id).first()
    print(f"Job Status: {job.status}, Progress: {job.progress}%, Stage: {job.stage}")
    print(f"Job Stats: {job.stats}")

    clusters = db.query(Cluster).filter(Cluster.job_id == job_id).all()
    print(f"\nDiscovered {len(clusters)} clusters:")
    for c in clusters:
        print(f" - [{c.cluster_id}] {c.name} | Demand Score: {c.demand_score} | Comments: {c.comment_count} | Unique: {c.unique_commenters_count}")

    ideas = db.query(Idea).filter(Idea.job_id == job_id).all()
    print(f"\nGenerated {len(ideas)} Ideas:")
    for idea in ideas:
        print(f"\n* [{idea.format}] {idea.title} (Demand: {idea.demand_score}, Gap: {idea.gap_status})")
        print(f"   Hook: {idea.hook}")
        print(f"   Supporting Comments: {idea.supporting_comment_ids}")

    replies = db.query(ReplyDraft).all()
    print(f"\nDrafted {len(replies)} Replies:")
    for r in replies[:3]:
        clean_rep = r.reply_text.encode("ascii", "ignore").decode("ascii")
        print(f" - To {r.username}: {clean_rep}")

    db.close()
    assert job.status == "completed", f"Job failed: {job.error_message}"
    assert len(ideas) > 0, "No ideas generated!"
    assert all(len(i.supporting_comment_ids) > 0 for i in ideas), "Every idea must have supporting comments!"
    print("\n[SUCCESS] PIPELINE TEST PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_full_pipeline()
