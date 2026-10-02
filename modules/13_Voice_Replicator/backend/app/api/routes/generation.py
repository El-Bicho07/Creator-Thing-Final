from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.project import Project
from app.models.post import Post
from app.models.style_profile import StyleProfile
from app.models.draft import GeneratedDraft
from app.models.validation import ValidationResult
from app.schemas.generation import GenerationRequest, GenerationResponse
from app.services.retrieval_service import RetrievalService
from app.services.prompt_builder import PromptBuilder
from app.services.llm_service import LLMService
from app.services.validation_service import ValidationService

router = APIRouter(prefix="/projects/{project_id}", tags=["generation"])

@router.post("/generate", response_model=GenerationResponse)
def generate_draft(project_id: str, req: GenerationRequest, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 1. Fetch Style Profile
    sp = db.query(StyleProfile).filter(StyleProfile.project_id == project_id).first()
    if not sp:
        raise HTTPException(status_code=400, detail="Style profile required for generation. Please analyze the project first.")

    style_profile_data = {
        "tone_scores": sp.tone_scores or {},
        "caption_stats": sp.caption_stats or {},
        "formatting_patterns": sp.formatting_patterns or {},
        "emoji_profile": sp.emoji_profile or {},
        "hashtag_profile": sp.hashtag_profile or {},
        "cta_profile": sp.cta_profile or {},
        "common_structures": sp.common_structures or []
    }

    # 2. Semantic Retrieval of Historical Posts
    retrieval_service = RetrievalService(db)
    relevant_examples = retrieval_service.retrieve_relevant_posts(
        project_id=project_id,
        query_text=req.topic,
        top_k=5,
        post_type_filter=req.post_type
    )

    # 3. Build Prompt
    prompt = PromptBuilder.build_generation_prompt(
        style_profile=style_profile_data,
        relevant_examples=relevant_examples,
        topic=req.topic,
        post_type=req.post_type,
        cta_requirement=req.cta_requirement,
        desired_length=req.desired_length,
        custom_instructions=req.custom_instructions
    )

    # 4. Call External Text-Generation LLM
    llm_service = LLMService.get_provider()
    generated_content = llm_service.generate(prompt)

    # 5. Create GeneratedDraft record
    draft = GeneratedDraft(
        project_id=project_id,
        topic=req.topic,
        post_type=req.post_type,
        hook=generated_content.get("hook", ""),
        caption=generated_content.get("caption", ""),
        cta=generated_content.get("cta", ""),
        hashtags=generated_content.get("hashtags", []),
        slides=generated_content.get("slides", []),
        status="draft"
    )
    db.add(draft)
    db.flush()

    # 6. Run Style Validation & Originality Audit
    historical_posts = db.query(Post).filter(Post.project_id == project_id).all()
    h_posts_list = [{"id": p.id, "caption": p.caption} for p in historical_posts]
    
    val_report = ValidationService.validate_draft(
        draft_caption=draft.caption,
        draft_hashtags=draft.hashtags or [],
        style_profile=style_profile_data,
        historical_posts=h_posts_list
    )

    val_res = ValidationResult(
        draft_id=draft.id,
        overall_score=val_report["overall_score"],
        metrics_breakdown=val_report["metrics_breakdown"],
        originality_status=val_report["originality_status"],
        max_ngram_overlap=val_report["max_ngram_overlap"],
        flagged_phrases=val_report["flagged_phrases"],
        retrieved_examples_used=[ex["id"] for ex in relevant_examples if "id" in ex]
    )
    db.add(val_res)
    db.commit()
    db.refresh(draft)

    return draft
