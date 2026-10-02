from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime
from app.db.session import get_db
from app.models.project import Project
from app.models.post import Post, PostTextFeatures, PostVisualFeatures
from app.models.embedding import Embedding
from app.schemas.post import PostDatasetImport, PostResponse
from app.services.text_analyzer import TextAnalyzer
from app.services.image_analyzer import ImageAnalyzer
from app.services.content_analyzer import ContentAnalyzer
from app.services.embedding_service import EmbeddingService

router = APIRouter(prefix="/projects/{project_id}/posts", tags=["posts"])

@router.post("/import", response_model=Dict[str, Any])
def import_posts(project_id: str, dataset: PostDatasetImport, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    embedding_service = EmbeddingService()
    imported_count = 0

    for item in dataset.posts:
        # Parse publication date if provided
        pub_date = None
        if item.published_at:
            try:
                pub_date = datetime.strptime(item.published_at, "%Y-%m-%d")
            except Exception:
                pub_date = datetime.utcnow()

        # 1. Create base Post record
        post = Post(
            project_id=project_id,
            original_id=item.id,
            caption=item.caption,
            hashtags=item.hashtags or [],
            media_path=item.media_path,
            post_type=item.post_type or "educational",
            published_at=pub_date
        )
        db.add(post)
        db.flush()

        # 2. Extract Text Features
        text_feats = TextAnalyzer.extract_features(item.caption, item.hashtags)
        detected_type = ContentAnalyzer.classify_post_type(item.caption, text_feats)
        post.post_type = item.post_type or detected_type

        post_tf = PostTextFeatures(
            post_id=post.id,
            char_count=text_feats["char_count"],
            word_count=text_feats["word_count"],
            sentence_count=text_feats["sentence_count"],
            paragraph_count=text_feats["paragraph_count"],
            avg_sentence_length=text_feats["avg_sentence_length"],
            avg_word_length=text_feats["avg_word_length"],
            punctuation_counts=text_feats["punctuation_counts"],
            question_count=text_feats["question_count"],
            exclamation_count=text_feats["exclamation_count"],
            line_break_count=text_feats["line_break_count"],
            has_bullet_points=text_feats["has_bullet_points"],
            has_numbered_list=text_feats["has_numbered_list"],
            capitalization_style=text_feats["capitalization_style"],
            emoji_count=text_feats["emoji_count"],
            emojis=text_feats["emojis"],
            hashtag_count=text_feats["hashtag_count"],
            has_cta=text_feats["has_cta"],
            cta_phrase=text_feats["cta_phrase"],
            has_url=text_feats["has_url"],
            first_person_ratio=text_feats["first_person_ratio"],
            second_person_ratio=text_feats["second_person_ratio"],
            formality_score=text_feats["formality_score"],
            conversational_score=text_feats["conversational_score"],
            educational_score=text_feats["educational_score"],
            promotional_score=text_feats["promotional_score"],
            storytelling_score=text_feats["storytelling_score"],
            structure_components=text_feats["structure_components"]
        )
        db.add(post_tf)

        # 3. Extract Visual Features
        vis_feats = ImageAnalyzer.extract_features(item.media_path)
        post_vf = PostVisualFeatures(
            post_id=post.id,
            width=vis_feats["width"],
            height=vis_feats["height"],
            aspect_ratio=vis_feats["aspect_ratio"],
            brightness=vis_feats["brightness"],
            contrast=vis_feats["contrast"],
            saturation=vis_feats["saturation"],
            dominant_colors=vis_feats["dominant_colors"],
            color_histogram=vis_feats["color_histogram"],
            text_area_ratio=vis_feats["text_area_ratio"],
            ocr_text=vis_feats["ocr_text"]
        )
        db.add(post_vf)

        # 4. Generate & Store Vector Embedding
        combined_text = f"{item.caption} {' '.join(item.hashtags or [])} {vis_feats['ocr_text'] or ''}"
        vector = embedding_service.generate_embedding(combined_text)
        post_emb = Embedding(
            post_id=post.id,
            vector=vector
        )
        db.add(post_emb)

        imported_count += 1

    db.commit()
    return {"message": f"Successfully imported {imported_count} posts into project {project_id}", "count": imported_count}

@router.get("", response_model=List[PostResponse])
def get_posts(project_id: str, db: Session = Depends(get_db)):
    posts = db.query(Post).filter(Post.project_id == project_id).all()
    return posts
