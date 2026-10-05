"""Critique capability.

Donor situation: no donor module reviewed an existing artifact. Module 18 scored
*candidate angles* for difficulty and uniqueness; Module 08 ranked caption variants
it had just generated. Studio's review stage is genuinely new work, so this is the
minimal platform-owned abstraction rather than a port.

Deliberate design constraint: critique **never edits**. It returns structured
findings and the creator decides. Refinement is a separate, explicit operation.
"""
from __future__ import annotations

from typing import Any, Dict, List, Tuple

from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.llm import get_llm_gateway
from app.llm.contracts import LLMRequest
from app.studio.capabilities import validation
from app.studio.context import CreatorContext
from app.studio.safety import wrap_brief

#: Review dimensions. Ordered from most to least impactful so the model's first
#: findings are the ones that matter most.
CRITIQUE_DIMENSIONS = (
    "hook",
    "specificity",
    "structure",
    "voice",
    "clarity",
    "credibility",
    "cta",
    "flow",
    "platform_fit",
)

SEVERITIES = ("strong", "medium", "light")


class CritiqueFinding(BaseModel):
    dimension: str
    severity: str
    finding: str
    suggestion: str


class CritiqueOutput(BaseModel):
    overall_score: float = 5.0
    verdict: str = ""
    items: List[CritiqueFinding] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)


async def run_critique(
    db: AsyncSession,
    user_id,
    session,
    context: CreatorContext,
    content: str,
    *,
    dimensions: Tuple[str, ...] = CRITIQUE_DIMENSIONS,
) -> Tuple[CritiqueOutput, List[str]]:
    """Review `content` and return structured feedback plus any warnings."""
    gateway = get_llm_gateway()
    warnings: List[str] = []

    request = LLMRequest(
        purpose="studio_critique",
        feature="studio",
        prompt_name="studio/critique",
        prompt_version="v1",
        input_data={
            "content": content[:40_000],
            "dimensions": ", ".join(dimensions),
            "creator_request": context.brief or wrap_brief(session.title),
            "creator_voice": context.voice,
            "retrieved_memory": context.memory,
        },
        temperature=0.3,
        max_tokens=1800,
        metadata={
            "session_id": str(session.id),
            "capability": "critique",
            "dimensions": list(dimensions),
        },
    )

    try:
        result = await gateway.generate(
            user_id=user_id,
            request=request,
            response_model=CritiqueOutput,
            db=db,
        )
    except Exception as exc:
        from app.studio.registry import _friendly

        warnings.append(_friendly(exc))
        # A failed review should not look like a good review: return an explicit
        # "unavailable" marker rather than an empty critique that implies approval.
        return (
            CritiqueOutput(
                overall_score=0.0,
                verdict="Review unavailable: the AI provider could not be reached.",
                items=[],
                strengths=[],
            ),
            warnings,
        )

    items: List[Dict[str, Any]] = []
    for raw in result.items:
        dimension = validation.coerce_enum(
            getattr(raw, "dimension", None), CRITIQUE_DIMENSIONS, default="clarity"
        )
        finding = validation.require_str(
            getattr(raw, "finding", None), field="finding", max_length=800
        )
        suggestion = validation.require_str(
            getattr(raw, "suggestion", None), field="suggestion", max_length=800
        )
        if not finding:
            warnings.append("dropped a finding with no description")
            continue
        if not suggestion:
            # A finding without an actionable fix is not actionable feedback.
            warnings.append(f"dropped a '{dimension}' finding with no suggestion")
            continue
        items.append(
            {
                "dimension": dimension,
                "severity": validation.coerce_enum(
                    getattr(raw, "severity", None), SEVERITIES, default="medium"
                ),
                "finding": finding,
                "suggestion": suggestion,
            }
        )

    strengths = [
        validation.require_str(s, field="strength", max_length=300)
        for s in (result.strengths or [])
    ]
    strengths = [s for s in strengths if s]

    return (
        CritiqueOutput(
            overall_score=validation.clamp(
                result.overall_score, 0.0, 10.0, default=5.0
            ),
            verdict=validation.require_str(
                result.verdict, field="verdict", max_length=800
            ),
            items=[CritiqueFinding(**item) for item in items],
            strengths=strengths,
        ),
        warnings,
    )


__all__ = ["run_critique", "CritiqueOutput", "CritiqueFinding", "CRITIQUE_DIMENSIONS"]
