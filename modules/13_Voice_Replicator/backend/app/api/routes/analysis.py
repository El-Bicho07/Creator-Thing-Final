from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.project import Project
from app.models.post import Post
from app.models.style_profile import StyleProfile
from app.schemas.style import StyleProfileResponse
from app.services.style_analyzer import StyleAnalyzer

router = APIRouter(prefix="/projects/{project_id}", tags=["analysis"])

@router.post("/analyze", response_model=StyleProfileResponse)
def analyze_project_style(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    posts = db.query(Post).filter(Post.project_id == project_id).all()
    if not posts:
        raise HTTPException(status_code=400, detail="Cannot analyze project without historical posts. Please import a dataset first.")

    posts_data = []
    for p in posts:
        posts_data.append({
            "id": p.id,
            "caption": p.caption,
            "post_type": p.post_type,
            "text_features": {
                "word_count": p.text_features.word_count if p.text_features else 0,
                "avg_sentence_length": p.text_features.avg_sentence_length if p.text_features else 0,
                "paragraph_count": p.text_features.paragraph_count if p.text_features else 0,
                "formality_score": p.text_features.formality_score if p.text_features else 0.5,
                "conversational_score": p.text_features.conversational_score if p.text_features else 0.5,
                "educational_score": p.text_features.educational_score if p.text_features else 0.5,
                "promotional_score": p.text_features.promotional_score if p.text_features else 0.2,
                "storytelling_score": p.text_features.storytelling_score if p.text_features else 0.3,
                "emoji_count": p.text_features.emoji_count if p.text_features else 0,
                "emojis": p.text_features.emojis if p.text_features else [],
                "hashtag_count": p.text_features.hashtag_count if p.text_features else 0,
                "hashtags": p.hashtags or [],
                "has_cta": p.text_features.has_cta if p.text_features else 0,
                "cta_phrase": p.text_features.cta_phrase if p.text_features else None,
                "line_break_count": p.text_features.line_break_count if p.text_features else 0,
                "has_bullet_points": p.text_features.has_bullet_points if p.text_features else 0,
                "structure_components": p.text_features.structure_components if p.text_features else []
            },
            "visual_features": {
                "aspect_ratio": p.visual_features.aspect_ratio if p.visual_features else 1.0,
                "brightness": p.visual_features.brightness if p.visual_features else 0.6,
                "dominant_colors": p.visual_features.dominant_colors if p.visual_features else []
            }
        })

    profile_dict = StyleAnalyzer.aggregate_style_profile(posts_data)

    existing_sp = db.query(StyleProfile).filter(StyleProfile.project_id == project_id).first()
    if existing_sp:
        existing_sp.tone_scores = profile_dict["tone_scores"]
        existing_sp.caption_stats = profile_dict["caption_stats"]
        existing_sp.formatting_patterns = profile_dict["formatting_patterns"]
        existing_sp.emoji_profile = profile_dict["emoji_profile"]
        existing_sp.hashtag_profile = profile_dict["hashtag_profile"]
        existing_sp.cta_profile = profile_dict["cta_profile"]
        existing_sp.common_structures = profile_dict["common_structures"]
        existing_sp.vocabulary_profile = profile_dict["vocabulary_profile"]
        existing_sp.visual_profile = profile_dict["visual_profile"]
        sp = existing_sp
    else:
        sp = StyleProfile(
            project_id=project_id,
            tone_scores=profile_dict["tone_scores"],
            caption_stats=profile_dict["caption_stats"],
            formatting_patterns=profile_dict["formatting_patterns"],
            emoji_profile=profile_dict["emoji_profile"],
            hashtag_profile=profile_dict["hashtag_profile"],
            cta_profile=profile_dict["cta_profile"],
            common_structures=profile_dict["common_structures"],
            vocabulary_profile=profile_dict["vocabulary_profile"],
            visual_profile=profile_dict["visual_profile"]
        )
        db.add(sp)

    db.commit()
    db.refresh(sp)
    return sp

@router.get("/style-profile", response_model=StyleProfileResponse)
def get_style_profile(project_id: str, db: Session = Depends(get_db)):
    sp = db.query(StyleProfile).filter(StyleProfile.project_id == project_id).first()
    if not sp:
        raise HTTPException(status_code=404, detail="Style profile not generated yet. Trigger /analyze first.")
    return sp
