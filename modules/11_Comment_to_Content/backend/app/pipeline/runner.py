import json
import logging
from typing import Dict, Any
from sqlalchemy.orm import Session

from backend.app.db import SessionLocal
from backend.app.models import (
    Job, RawComment, CommentIntent, Cluster, Idea, ReplyDraft
)
from backend.app.pipeline.clean import clean_comments
from backend.app.pipeline.intent import classify_intents
from backend.app.pipeline.cluster import cluster_and_name_comments
from backend.app.pipeline.score import compute_cluster_scores
from backend.app.pipeline.ideas import generate_ideas_for_clusters
from backend.app.pipeline.gap import perform_gap_analysis
from backend.app.pipeline.replies import draft_replies_for_ideas

logger = logging.getLogger(__name__)

def update_job_status(
    job_id: str,
    status: str,
    progress: int,
    stage: str,
    stats: Dict[str, Any] = None,
    error_message: str = None
):
    db: Session = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.status = status
            job.progress = progress
            job.stage = stage
            if stats is not None:
                job.stats_json = json.dumps(stats)
            if error_message:
                job.error_message = error_message
            db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update job {job_id}: {e}")
    finally:
        db.close()


def run_pipeline_for_job(job_id: str):
    """
    Executes the full 7-step ComIdea Instagram comment-to-content pipeline.
    """
    logger.info(f"Starting Instagram-first ComIdea pipeline for job: {job_id}")
    db: Session = SessionLocal()

    try:
        # Load raw comments for this job
        db_raw_comments = db.query(RawComment).filter(RawComment.job_id == job_id).all()
        if not db_raw_comments:
            update_job_status(job_id, "failed", 0, "No comments found", error_message="No comments available for processing.")
            return

        raw_comments_data = [
            {
                "id": c.id,
                "comment_id": c.comment_id,
                "post_id": c.post_id,
                "post_format": c.post_format or "reel",
                "username": c.username,
                "text": c.text,
                "likes": c.likes or 0,
                "reply_count": c.reply_count or 0,
                "mentions_count": c.mentions_count or 0,
                "has_share_mention": c.has_share_mention or False,
                "timestamp": c.timestamp,
                "post_caption": c.post_caption
            }
            for c in db_raw_comments
        ]

        # STEP 1: Cleaning & Normalization + Mention Detection
        update_job_status(job_id, "processing", 15, "Filtering spam & analyzing Instagram share mentions")
        cleaned_comments, removed_comments = clean_comments(raw_comments_data)

        comment_id_map = {c.comment_id: c for c in db_raw_comments}
        for item in cleaned_comments:
            c = comment_id_map.get(item["comment_id"])
            if c:
                c.is_cleaned = True
                c.clean_text = item["clean_text"]
                c.is_removed = False
                c.removal_reason = None
                c.has_share_mention = item.get("has_share_mention", False)
                c.mentions_count = item.get("mentions_count", 0)

        for item in removed_comments:
            c = comment_id_map.get(item["comment_id"])
            if c:
                c.is_cleaned = False
                c.is_removed = True
                c.removal_reason = item["removal_reason"]
                c.has_share_mention = item.get("has_share_mention", False)
                c.mentions_count = item.get("mentions_count", 0)

        db.commit()

        if not cleaned_comments:
            update_job_status(job_id, "failed", 20, "All comments filtered", error_message="All comments were identified as spam or too short.")
            return

        # STEP 2: Intent Classification (Request patterns & Emojis)
        update_job_status(job_id, "processing", 35, "Classifying audience intents with Instagram signals")
        classified_comments = classify_intents(cleaned_comments)

        db.query(CommentIntent).filter(CommentIntent.job_id == job_id).delete()
        for c in classified_comments:
            intent_obj = CommentIntent(
                job_id=job_id,
                comment_id=c["comment_id"],
                intent=c.get("intent", "other"),
                confidence=c.get("confidence", 0.9),
                explanation=c.get("intent_explanation")
            )
            db.add(intent_obj)
        db.commit()

        # STEP 3: Multilingual Clustering & Theme Naming
        update_job_status(job_id, "processing", 55, "Clustering themes & generating theme labels")
        cluster_summaries, _ = cluster_and_name_comments(classified_comments)

        # STEP 4: Demand Scoring (Likes, Replies, Mentions, Recency)
        update_job_status(job_id, "processing", 70, "Computing Instagram engagement & demand scores")
        scored_clusters = compute_cluster_scores(cluster_summaries)

        db.query(Cluster).filter(Cluster.job_id == job_id).delete()
        for cs in scored_clusters:
            cluster_model = Cluster(
                job_id=job_id,
                cluster_id=cs["cluster_id"],
                name=cs["name"],
                description=cs["description"],
                comment_count=cs["comment_count"],
                unique_commenters_count=cs["unique_commenters_count"],
                total_likes=cs["total_likes"],
                total_replies=cs.get("total_replies", 0),
                demand_score=cs["demand_score"],
                intent_breakdown_json=json.dumps(cs["intent_breakdown"]),
                top_comment_ids_json=json.dumps(cs["top_comment_ids"])
            )
            db.add(cluster_model)
        db.commit()

        # STEP 5: Instagram-Native Idea Generation
        update_job_status(job_id, "processing", 82, "Generating Instagram Reels, Carousels & Stories")
        generated_ideas = generate_ideas_for_clusters(scored_clusters)

        # STEP 6: Content Gap Analysis vs Past Captions
        update_job_status(job_id, "processing", 90, "Evaluating past post content gap")
        analyzed_ideas = perform_gap_analysis(generated_ideas, raw_comments_data)

        # Persist Ideas
        db.query(Idea).filter(Idea.job_id == job_id).delete()
        for idea_item in analyzed_ideas:
            idea_model = Idea(
                id=idea_item["id"],
                job_id=job_id,
                cluster_id=idea_item["cluster_id"],
                title=idea_item["title"],
                format=idea_item.get("format", "reel"),
                hook=idea_item["hook"],
                caption_draft=idea_item["caption_draft"],
                why_now=idea_item["why_now"],
                demand_score=idea_item["demand_score"],
                status=idea_item.get("status", "new"),
                gap_status=idea_item.get("gap_status", "new_opportunity"),
                gap_similarity=idea_item.get("gap_similarity", 0.0),
                gap_matched_post=idea_item.get("gap_matched_post"),
                suggested_length=idea_item.get("suggested_length"),
                on_screen_text=idea_item.get("on_screen_text"),
                slide_outline_json=json.dumps(idea_item.get("slide_outline") or []),
                story_validation_json=json.dumps(idea_item.get("story_validation") or {}),
                hashtags_json=json.dumps(idea_item.get("hashtags") or []),
                story_mention_caption=idea_item.get("story_mention_caption"),
                supporting_comment_ids_json=json.dumps(idea_item.get("supporting_comment_ids", []))
            )
            db.add(idea_model)
        db.commit()

        # STEP 7: Reply Drafts & Story Shoutouts
        update_job_status(job_id, "processing", 96, "Drafting 'You asked, I made it' creator replies")
        comments_by_id = {c["comment_id"]: c for c in classified_comments}
        reply_drafts = draft_replies_for_ideas(analyzed_ideas, comments_by_id)

        db.query(ReplyDraft).filter(ReplyDraft.idea_id.in_([i["id"] for i in analyzed_ideas])).delete(synchronize_session=False)
        for rep in reply_drafts:
            reply_model = ReplyDraft(
                id=rep["id"],
                idea_id=rep["idea_id"],
                comment_id=rep["comment_id"],
                username=rep["username"],
                reply_text=rep["reply_text"]
            )
            db.add(reply_model)
        db.commit()

        # FINAL METRICS
        stats = {
            "total_raw": len(raw_comments_data),
            "total_cleaned": len(cleaned_comments),
            "spam_filtered": len(removed_comments),
            "clusters_count": len(scored_clusters),
            "ideas_count": len(analyzed_ideas),
            "replies_count": len(reply_drafts),
            "new_opportunities": sum(1 for i in analyzed_ideas if i.get("gap_status") == "new_opportunity"),
            "already_covered": sum(1 for i in analyzed_ideas if i.get("gap_status") == "already_covered")
        }

        update_job_status(job_id, "completed", 100, "Pipeline completed successfully", stats=stats)
        logger.info(f"ComIdea pipeline completed for job {job_id} with {len(analyzed_ideas)} Instagram-native ideas.")

    except Exception as e:
        logger.exception(f"Pipeline failed for job {job_id}: {e}")
        update_job_status(job_id, "failed", 0, "Execution error", error_message=str(e))
    finally:
        db.close()
