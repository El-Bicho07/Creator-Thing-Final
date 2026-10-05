"""Studio API — `/api/studio`.

Replaces the Phase 1 stub. Ownership is derived from the authenticated identity
only: there is no `user_id` parameter anywhere in this router, so a client cannot
ask for another creator's session. PostgreSQL RLS is the authoritative boundary
regardless of what the application layer does.
"""
from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user, get_db_with_user
from app.core.logging import get_logger
from app.studio.api.schemas import (
    ApprovalRequest,
    CapabilityListResponse,
    ContextPreviewResponse,
    CritiqueRequest,
    CritiqueResponse,
    GenerationRequest,
    GenerationResponse,
    RefineRequest,
    SessionCreateRequest,
    SessionListResponse,
    SessionResponse,
    SessionUpdateRequest,
    VersionInfo,
    VersionListResponse,
)
from app.studio.domain import rules
from app.studio.orchestrator import WORKFLOW_STEPS, StudioOrchestrator
from app.studio.registry import CapabilityError

router = APIRouter(prefix="/studio", tags=["studio"])
logger = get_logger(__name__)


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def get_orchestrator(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
) -> StudioOrchestrator:
    return StudioOrchestrator(db, uuid.UUID(current_user.id))


async def _load_session(orchestrator: StudioOrchestrator, session_id: uuid.UUID):
    """Fetch a session, or raise 404.

    RLS means another creator's session simply is not visible, so this returns 404
    rather than 403: a 403 would confirm that the id exists.
    """
    session = await orchestrator.repository.get_session(session_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Studio session not found",
        )
    return session


_ERROR_STATUS = {
    "invalid_input": status.HTTP_422_UNPROCESSABLE_ENTITY,
    "unknown_capability": status.HTTP_404_NOT_FOUND,
    "not_found": status.HTTP_404_NOT_FOUND,
    "budget_exceeded": status.HTTP_429_TOO_MANY_REQUESTS,
    "timeout": status.HTTP_504_GATEWAY_TIMEOUT,
    "rate_limited": status.HTTP_429_TOO_MANY_REQUESTS,
    "empty_content": status.HTTP_409_CONFLICT,
    "empty_output": status.HTTP_502_BAD_GATEWAY,
    "provider_error": status.HTTP_502_BAD_GATEWAY,
}


def _capability_http_error(exc: CapabilityError) -> HTTPException:
    code = _ERROR_STATUS.get(exc.status, status.HTTP_400_BAD_REQUEST)
    return HTTPException(status_code=code, detail=str(exc))


#: Substrings in an orchestrator failure message that indicate a client error
#: rather than a backend failure. The orchestrator returns failures as warnings,
#: so the router classifies them here.
_CLIENT_ERROR_MARKERS = (
    "invalid input",
    "unknown capability",
    "no content to refine",
    "there is nothing to critique",
)


def _failure_status(warnings: List[str]) -> int:
    """Map an orchestrator failure message onto an HTTP status."""
    message = (warnings[0] if warnings else "").lower()
    for marker in _CLIENT_ERROR_MARKERS:
        if marker in message:
            if "no content" in marker or "nothing to critique" in marker:
                return status.HTTP_409_CONFLICT
            return status.HTTP_422_UNPROCESSABLE_ENTITY
    if "limit" in message and ("session" in message or "refined" in message):
        return status.HTTP_429_TOO_MANY_REQUESTS
    return status.HTTP_502_BAD_GATEWAY


# --------------------------------------------------------------------------- #
# Health / catalogue
# --------------------------------------------------------------------------- #

@router.get("/health")
async def studio_health():
    """Unauthenticated liveness probe for the Studio feature."""
    return {
        "status": "ok",
        "feature": "studio",
        "phase": 3,
        "workflow_steps": list(WORKFLOW_STEPS),
    }


@router.get("/capabilities", response_model=CapabilityListResponse)
async def list_capabilities(
    orchestrator: StudioOrchestrator = Depends(get_orchestrator),
):
    """Every capability Studio can run, with its input/output schema and donor."""
    infos = orchestrator.capabilities()
    return CapabilityListResponse(
        capabilities=infos, total=len(infos)
    )


@router.get("/platforms")
async def list_platforms(
    orchestrator: StudioOrchestrator = Depends(get_orchestrator),
):
    """Platform metadata the Studio UI needs to render constraints."""
    _ = orchestrator  # authenticated: the catalogue is creator-visible
    return {
        "platforms": [
            {
                "key": key,
                "label": config.label,
                "kind": config.kind,
                "default_duration_sec": config.default_duration_sec,
                "caption_char_cap": config.caption_char_cap,
                "caption_aim_chars": config.caption_aim_chars,
                "hashtag_min": config.hashtag_min,
                "hashtag_max": config.hashtag_max,
                "allowed_formats": rules.allowed_formats(key),
            }
            for key, config in sorted(rules.PLATFORMS.items())
        ]
    }


@router.get("/workflow")
async def get_workflow(
    orchestrator: StudioOrchestrator = Depends(get_orchestrator),
):
    _ = orchestrator
    return {
        "steps": [
            {"key": "context", "label": "Context"},
            {"key": "generate", "label": "Create"},
            {"key": "review", "label": "Critique"},
            {"key": "refine", "label": "Refine"},
            {"key": "done", "label": "Publish-ready"},
        ]
    }


# --------------------------------------------------------------------------- #
# Sessions
# --------------------------------------------------------------------------- #

@router.post(
    "/sessions",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_session(
    payload: SessionCreateRequest,
    orchestrator: StudioOrchestrator = Depends(get_orchestrator),
):
    """Start a Studio session.

    The session is server state: it survives page refreshes and API restarts.
    """
    record = await orchestrator.repository.create_session(
        title=payload.title,
        brief=payload.brief,
        idea_id=payload.idea_id,
        current_step="context",
    )
    return SessionResponse(**record.as_dict())


@router.get("/sessions", response_model=SessionListResponse)
async def list_sessions(
    session_status: Optional[str] = Query(
        None, alias="status", description="Filter by session status."
    ),
    limit: int = Query(25, ge=1, le=100),
    orchestrator: StudioOrchestrator = Depends(get_orchestrator),
):
    records = await orchestrator.repository.list_sessions(
        limit=limit, status=session_status
    )
    return SessionListResponse(
        sessions=[SessionResponse(**r.as_dict()) for r in records],
        total=len(records),
    )


@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: uuid.UUID,
    orchestrator: StudioOrchestrator = Depends(get_orchestrator),
):
    record = await _load_session(orchestrator, session_id)
    return SessionResponse(**record.as_dict())


@router.patch("/sessions/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: uuid.UUID,
    payload: SessionUpdateRequest,
    orchestrator: StudioOrchestrator = Depends(get_orchestrator),
):
    """Partial update. Studio never changes content through this endpoint."""
    await _load_session(orchestrator, session_id)
    updated = await orchestrator.repository.update_session(
        session_id,
        title=payload.title,
        brief=payload.brief,
        status=payload.status.value if payload.status else None,
        current_step=payload.current_step.value if payload.current_step else None,
        idea_id=payload.idea_id,
    )
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Studio session not found",
        )
    return SessionResponse(**updated.as_dict())


@router.delete(
    "/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_session(
    session_id: uuid.UUID,
    orchestrator: StudioOrchestrator = Depends(get_orchestrator),
):
    """Delete a session and everything generated in it.

    An explicit creator action: Studio never deletes content on its own.
    Generations and their content_assets rows cascade.
    """
    deleted = await orchestrator.repository.delete_session(session_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Studio session not found",
        )
    return None


@router.get(
    "/sessions/{session_id}/context", response_model=ContextPreviewResponse
)
async def preview_context(
    session_id: uuid.UUID,
    orchestrator: StudioOrchestrator = Depends(get_orchestrator),
):
    """Show exactly what context a generation would use.

    Retrieval is real (it goes through the Memory Engine and Voice Engine), so
    this is the honest answer to 'why did it write that?'.
    """
    record = await _load_session(orchestrator, session_id)
    context = await orchestrator.assembler.assemble(
        brief=record.brief or record.title,
        query=(record.brief or record.title)[:300],
        platform=None,
    )
    return ContextPreviewResponse(
        session_id=str(record.id),
        memory_used=context.memory_used,
        voice_available=context.voice_available,
        prior_work_used=context.prior_work_used,
        retrieved_memory=context.memory,
        creator_voice=context.voice,
        prior_work=context.prior_work,
        notes=context.notes,
    )


# --------------------------------------------------------------------------- #
# Generation
# --------------------------------------------------------------------------- #

@router.post("/generate", response_model=GenerationResponse)
async def generate(
    payload: GenerationRequest,
    orchestrator: StudioOrchestrator = Depends(get_orchestrator),
):
    """Run a Studio capability and persist the result as a new version.

    Persisting into `content_assets` plus `studio_generations` means every
    generation keeps full provenance: capability, prompt name and version, donor
    origin, and the context actually used.
    """
    record = await _load_session(orchestrator, payload.session_id)

    try:
        result = await orchestrator.run_capability(
            record,
            payload.capability,
            payload.input,
            platform=payload.platform,
            tone=payload.tone,
            goal=payload.goal,
            duration_sec=payload.duration_sec,
        )
    except CapabilityError as exc:
        raise _capability_http_error(exc) from exc

    if result.generation is None or result.outcome is None:
        # A capability-level failure. The message is already creator-safe, but the
        # status code must distinguish "the client asked for something impossible"
        # from "the backend failed": an unfixable input is a 422, not a 502.
        detail = (
            result.warnings[0]
            if result.warnings
            else "Generation did not complete."
        )
        raise HTTPException(
            status_code=_failure_status(result.warnings), detail=detail
        )

    generation = result.generation
    outcome = result.outcome
    return GenerationResponse(
        generation_id=str(generation.id),
        session_id=str(record.id),
        version=generation.version,
        capability=generation.capability,
        asset_id=str(generation.asset_id),
        output=outcome.output,
        prompt_name=generation.prompt_name,
        prompt_version=generation.prompt_version,
        input_tokens=generation.input_tokens,
        output_tokens=generation.output_tokens,
        estimated_cost_usd=generation.estimated_cost,
        latency_ms=generation.latency_ms,
        context_summary=result.context_summary,
        warnings=result.warnings,
    )


@router.post("/critique", response_model=CritiqueResponse)
async def critique(
    payload: CritiqueRequest,
    orchestrator: StudioOrchestrator = Depends(get_orchestrator),
):
    """Review content and return structured feedback.

    Critique never modifies anything: the creator decides what happens next.
    """
    record = await _load_session(orchestrator, payload.session_id)
    try:
        target, feedback, warnings = await orchestrator.critique(
            record,
            generation_id=payload.generation_id,
            text=payload.text,
        )
    except CapabilityError as exc:
        raise _capability_http_error(exc) from exc

    if "Review unavailable" in feedback.verdict:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=warnings[0] if warnings else feedback.verdict,
        )

    return CritiqueResponse(
        generation_id=str(target.id) if target else None,
        overall_score=feedback.overall_score,
        verdict=feedback.verdict,
        items=[
            {
                "dimension": item.dimension,
                "severity": item.severity,
                "finding": item.finding,
                "suggestion": item.suggestion,
            }
            for item in feedback.items
        ],
        strengths=list(feedback.strengths),
    )


@router.post("/refine", response_model=GenerationResponse)
async def refine(
    payload: RefineRequest,
    orchestrator: StudioOrchestrator = Depends(get_orchestrator),
):
    """Create a new version from an explicit creator instruction.

    The previous version is preserved: refinement appends rather than overwrites.
    """
    record = await _load_session(orchestrator, payload.session_id)
    try:
        result = await orchestrator.refine(
            record,
            instruction=payload.instruction,
            modifier=payload.modifier.value if payload.modifier else None,
            generation_id=payload.generation_id,
        )
    except CapabilityError as exc:
        raise _capability_http_error(exc) from exc

    if result.generation is None or result.outcome is None:
        detail = (
            result.warnings[0]
            if result.warnings
            else "Refinement did not complete."
        )
        raise HTTPException(
            status_code=_failure_status(result.warnings), detail=detail
        )

    generation = result.generation
    return GenerationResponse(
        generation_id=str(generation.id),
        session_id=str(record.id),
        version=generation.version,
        capability=generation.capability,
        asset_id=str(generation.asset_id),
        output=result.outcome.output,
        prompt_name=generation.prompt_name,
        prompt_version=generation.prompt_version,
        input_tokens=generation.input_tokens,
        output_tokens=generation.output_tokens,
        estimated_cost_usd=generation.estimated_cost,
        latency_ms=generation.latency_ms,
        context_summary=result.context_summary,
        warnings=result.warnings,
    )


# --------------------------------------------------------------------------- #
# Versions
# --------------------------------------------------------------------------- #

@router.get(
    "/sessions/{session_id}/versions", response_model=VersionListResponse
)
async def list_versions(
    session_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=200),
    orchestrator: StudioOrchestrator = Depends(get_orchestrator),
):
    """Version history for a session, oldest first."""
    record = await _load_session(orchestrator, session_id)
    records = await orchestrator.repository.list_generations(record.id, limit=limit)

    versions: List[VersionInfo] = []
    for gen in records:
        versions.append(
            VersionInfo(
                id=str(gen.id),
                version=gen.version,
                capability=gen.capability,
                asset_id=str(gen.asset_id),
                prompt_name=gen.prompt_name,
                prompt_version=gen.prompt_version,
                parent_generation_id=(
                    str(gen.parent_generation_id) if gen.parent_generation_id else None
                ),
                critique=gen.critique,
                creator_approved=gen.creator_approved,
                input_tokens=gen.input_tokens,
                output_tokens=gen.output_tokens,
                estimated_cost_usd=gen.estimated_cost,
                latency_ms=gen.latency_ms,
                text=await orchestrator.repository.get_asset_text(gen.asset_id),
                created_at=gen.created_at.isoformat() if gen.created_at else None,
            )
        )
    return VersionListResponse(
        session_id=str(record.id), versions=versions, total=len(versions)
    )


@router.post("/versions/{generation_id}/approve", response_model=VersionInfo)
async def approve_version(
    generation_id: uuid.UUID,
    payload: ApprovalRequest,
    orchestrator: StudioOrchestrator = Depends(get_orchestrator),
):
    """Record an explicit creator approval.

    This is the only place `creator_approved` becomes true. Studio never approves
    on the creator's behalf, and approval does not publish anything.
    """
    gen = await orchestrator.repository.get_generation(generation_id)
    if gen is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Version not found",
        )
    updated = await orchestrator.repository.set_approved(
        generation_id, payload.approved
    )
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Version not found"
        )
    return VersionInfo(
        id=str(updated.id),
        version=updated.version,
        capability=updated.capability,
        asset_id=str(updated.asset_id),
        prompt_name=updated.prompt_name,
        prompt_version=updated.prompt_version,
        parent_generation_id=(
            str(updated.parent_generation_id) if updated.parent_generation_id else None
        ),
        critique=updated.critique,
        creator_approved=updated.creator_approved,
        input_tokens=updated.input_tokens,
        output_tokens=updated.output_tokens,
        estimated_cost_usd=updated.estimated_cost,
        latency_ms=updated.latency_ms,
        text=await orchestrator.repository.get_asset_text(updated.asset_id),
        created_at=(
            updated.created_at.isoformat() if updated.created_at else None
        ),
    )


@router.delete(
    "/versions/{generation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_version(
    generation_id: uuid.UUID,
    orchestrator: StudioOrchestrator = Depends(get_orchestrator),
):
    """Delete one version. Explicit creator action only."""
    gen = await orchestrator.repository.get_generation(generation_id)
    if gen is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Version not found"
        )
    session = await orchestrator.repository.get_session(gen.session_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Studio session not found",
        )
    # Remove the underlying content too, so Studio does not orphan assets.
    await orchestrator.repository.delete_generation(generation_id)
    return None
