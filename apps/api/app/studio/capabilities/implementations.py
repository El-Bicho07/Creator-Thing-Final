"""Studio capabilities.

Each capability is a `StudioCapability` with a validated input model, a validated
output model, a centralized prompt, and deterministic post-processing.

The pattern is uniform on purpose:

1. validate input (Pydantic) — before any LLM cost;
2. assemble prompt variables from `CreatorContext` plus domain rules;
3. one Gateway call;
4. coerce/clamp/realign the result so the contract holds even on a bad generation;
5. return a `CapabilityOutcome` whose `version_text` becomes a new `content_assets`
   row.

Donor provenance is recorded per capability in `donor` and `classification`, so the
API catalogue states where each capability came from.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.studio.capabilities import validation
from app.studio.domain import rules
from app.studio.registry import (
    CapabilityContext,
    CapabilityError,
    CapabilityOutcome,
    StudioCapability,
    call_gateway,
    render_lines,
)
from app.studio.safety import wrap_brief


# =========================================================================== #
# Idea generation — ADAPT from Module 01
# =========================================================================== #

class IdeaInput(BaseModel):
    topic: str = Field(..., min_length=1, max_length=300)
    count: int = Field(default=5, ge=1, le=10)
    angle: Optional[str] = Field(None, max_length=1000)
    platform: Optional[str] = Field(None, max_length=40)
    goal: Optional[str] = Field(None, max_length=40)


class IdeaItem(BaseModel):
    title: str
    angle: str = ""
    why_it_could_work: str = ""
    format: str = ""
    difficulty: str = "medium"


class IdeaOutput(BaseModel):
    ideas: List[IdeaItem] = Field(default_factory=list)


_DIFFICULTY = ("easy", "medium", "hard")


async def _run_idea(ctx: CapabilityContext, payload: IdeaInput) -> CapabilityOutcome:
    platform = payload.platform or ctx.platform or rules.resolve_platform(None).key
    variables = {
        "topic": payload.topic,
        "count": payload.count,
        "angle": payload.angle or payload.topic,
        "platform": platform,
        "goal": payload.goal or ctx.goal or rules.DEFAULT_GOAL,
        **ctx.context.prompt_variables(),
    }
    result = await call_gateway(
        _idea_capability,
        ctx,
        prompt_name="studio/idea",
        prompt_version="v1",
        purpose="studio_idea_generation",
        input_data=variables,
        response_model=IdeaOutput,
        temperature=0.8,
        max_tokens=2000,
    )

    warnings: List[str] = []
    ideas: List[Dict[str, Any]] = []
    for raw in list(result.ideas)[: payload.count]:
        title = validation.require_str(
            getattr(raw, "title", None), field="idea.title", max_length=200
        )
        if not title:
            warnings.append("dropped an idea with no title")
            continue
        ideas.append(
            {
                "title": validation.clean_headline(title, max_chars=90),
                "angle": validation.require_str(
                    getattr(raw, "angle", None), field="idea.angle", max_length=1000
                ),
                "why_it_could_work": validation.require_str(
                    getattr(raw, "why_it_could_work", None),
                    field="idea.why_it_could_work",
                    max_length=600,
                ),
                "format": validation.require_str(
                    getattr(raw, "format", None), field="idea.format", max_length=60
                ),
                "difficulty": validation.coerce_enum(
                    getattr(raw, "difficulty", None), _DIFFICULTY, default="medium"
                ),
            }
        )

    if len(ideas) < payload.count:
        warnings.append(
            f"requested {payload.count} ideas, received {len(ideas)}"
        )

    body = "\n\n".join(
        f"{item['title']}\n{item['angle']}"
        + (f"\nWhy: {item['why_it_could_work']}" if item["why_it_could_work"] else "")
        for item in ideas
    )
    return CapabilityOutcome(
        output={"ideas": ideas, "count": len(ideas)},
        version_text=body,
        warnings=warnings,
        prompt_name="studio/idea",
        prompt_version="v1",
        metadata={"requested": payload.count, "delivered": len(ideas)},
    )


_idea_capability = StudioCapability(
    id="idea",
    name="Idea generation",
    description="Ranked, distinct content ideas for a creator brief.",
    execute=_run_idea,
    input_model=IdeaInput,
    output_model=IdeaOutput,
    donor=("01_Content_Idea_Generator",),
    classification="ADAPT",
    requires_context=("memory", "voice", "prior_work"),
)


# =========================================================================== #
# Hook generation — ADAPT from Module 03
# =========================================================================== #

#: Module 03's mandatory taxonomy (`src/lib/gemini.ts:9`). Kept as a closed set:
#: the creator UI renders one slot per style, so the count is part of the contract.
HOOK_STYLES = (
    "curiosity", "question", "contrarian", "bold_claim",
    "data", "story", "problem", "urgency", "future", "surprise",
)


class HookInput(BaseModel):
    topic: str = Field(..., min_length=1, max_length=300)
    styles: Optional[List[str]] = Field(
        default=None,
        description="Subset of the mandatory styles; defaults to all ten.",
    )
    platform: Optional[str] = Field(None, max_length=40)
    angle: Optional[str] = Field(None, max_length=1000)
    limit: int = Field(default=5, ge=1, le=10)


class HookOutput(BaseModel):
    hooks: List[Dict[str, Any]] = Field(default_factory=list)


async def _run_hook(ctx: CapabilityContext, payload: HookInput) -> CapabilityOutcome:
    styles = list(HOOK_STYLES)
    if payload.styles:
        # Unknown styles are dropped rather than rejected: a client may pass the
        # full donor vocabulary including aliases we no longer support.
        styles = [s for s in HOOK_STYLES if s in set(payload.styles)]
        if not styles:
            raise CapabilityError(
                "No recognised hook styles requested. Valid styles: "
                + ", ".join(HOOK_STYLES),
                status="invalid_input",
            )

    variables = {
        "topic": payload.topic,
        "count": len(styles),
        "styles": ", ".join(styles),
        "angle": payload.angle or payload.topic,
        "platform": payload.platform or ctx.platform or rules.resolve_platform(None).key,
        **ctx.context.prompt_variables(),
    }
    result = await call_gateway(
        _hook_capability,
        ctx,
        prompt_name="studio/hook",
        prompt_version="v1",
        purpose="studio_hook_generation",
        input_data=variables,
        response_model=HookOutput,
        temperature=0.9,
        max_tokens=1500,
    )

    # Module 03's realignment: force one hook per requested style, in order.
    aligned = validation.realign_slots(
        result.hooks, styles=styles, key="style", text_key="text"
    )

    warnings: List[str] = []
    items: List[Dict[str, Any]] = []
    for entry in aligned:
        text = entry["text"]
        if text.endswith("hook pending]"):
            warnings.append(f"missing hook for style '{entry['style']}'")
        cleaned = validation.clean_headline(text, max_chars=140)
        items.append({"style": entry["style"], "text": cleaned})
        if len(items) >= payload.limit:
            break

    return CapabilityOutcome(
        output={"hooks": items},
        version_text=render_lines(items),
        warnings=warnings,
        prompt_name="studio/hook",
        prompt_version="v1",
        metadata={"styles": styles, "limit": payload.limit},
    )


_hook_capability = StudioCapability(
    id="hook",
    name="Hook generation",
    description="One opening hook per style, realigned to a fixed taxonomy.",
    execute=_run_hook,
    input_model=HookInput,
    output_model=HookOutput,
    donor=("03_Hook_Generator",),
    classification="ADAPT",
    requires_context=("memory", "voice", "prior_work"),
)


# =========================================================================== #
# Script generation — ADAPT from Module 05 + 18
# =========================================================================== #

class ScriptInput(BaseModel):
    topic: str = Field(..., min_length=1, max_length=300)
    hook: Optional[str] = Field(None, max_length=500)
    angle: Optional[str] = Field(None, max_length=1000)
    platform: Optional[str] = Field(None, max_length=40)
    format: Optional[str] = Field(None, max_length=60)
    duration_sec: Optional[int] = Field(None, ge=5, le=1800)
    goal: Optional[str] = Field(None, max_length=40)


class ScriptSegment(BaseModel):
    role: str
    text: str
    visual: str = ""
    start_sec: Optional[int] = None
    end_sec: Optional[int] = None


class ScriptOutput(BaseModel):
    title: str = ""
    script: str = ""
    segments: List[ScriptSegment] = Field(default_factory=list)


async def _run_script(ctx: CapabilityContext, payload: ScriptInput) -> CapabilityOutcome:
    platform = rules.resolve_platform(payload.platform or ctx.platform)
    duration = int(payload.duration_sec or ctx.duration_sec or platform.default_duration_sec)
    fmt = rules.resolve_format(payload.format, platform.key) or (
        rules.allowed_formats(platform.key)[0]
    )

    # Timing is arithmetic, not a generation: the segment plan is computed here
    # and the model only writes prose into it. Adapted from Module 18's
    # `allocate_segments`.
    slots = rules.allocate_segments(duration, format_hint=fmt)
    plan_lines = []
    for slot in slots:
        plan_lines.append(
            f"{slot.role} ({slot.start_sec}s-{slot.end_sec}s, "
            f"about {slot.words} spoken words): {slot.note}"
        )

    goal = payload.goal or ctx.goal
    variables = {
        "topic": payload.topic,
        "hook": payload.hook or ctx.source_text or "",
        "angle": payload.angle or payload.topic,
        "format": fmt,
        "platform": platform.label,
        "goal_directive": rules.goal_directive(goal),
        "lifecycle_directive": rules.lifecycle_directive(
            (ctx.session.metadata or {}).get("lifecycle_hint")
        ),
        "total_words": rules.total_words(slots),
        "segments": "\n".join(plan_lines),
        "cta_norm": platform.cta_norm,
        **ctx.context.prompt_variables(),
    }
    result = await call_gateway(
        _script_capability,
        ctx,
        prompt_name="studio/script",
        prompt_version="v1",
        purpose="studio_script_generation",
        input_data=variables,
        response_model=ScriptOutput,
        temperature=0.7,
        max_tokens=2500,
    )

    # Structural validation, adapted from Module 18's `validateScriptOutput`.
    raw_segments = [
        {
            "role": seg.role,
            "text": seg.text,
            "visual": seg.visual,
            "start_sec": seg.start_sec,
            "end_sec": seg.end_sec,
        }
        for seg in result.segments
    ]
    problems = validation.validate_segments(raw_segments)
    warnings: List[str] = []

    segments: List[Dict[str, Any]] = []
    for index, seg in enumerate(raw_segments):
        text = validation.require_str(
            seg["text"], field="segment.text", max_length=4000
        )
        if not text:
            continue
        # Fall back to the computed plan for timing when the model omits it.
        slot = slots[min(index, len(slots) - 1)]
        segments.append(
            {
                "role": validation.coerce_enum(
                    seg["role"],
                    ("hook", "setup", "value", "payoff", "cta"),
                    default=slot.role.lower(),
                ),
                "text": text,
                "visual": validation.require_str(
                    seg["visual"], field="segment.visual", max_length=500
                ),
                "start_sec": _int_or(seg["start_sec"], slot.start_sec),
                "end_sec": _int_or(seg["end_sec"], slot.end_sec),
                "words": len(text.split()),
            }
        )

    if problems:
        warnings.extend(problems[:4])

    spoken = " ".join(seg["text"] for seg in segments)
    return CapabilityOutcome(
        output={
            "title": validation.clean_headline(result.title, max_chars=90)
            or payload.topic,
            "script": spoken or result.script,
            "segments": segments,
            "duration_sec": duration,
            "platform": platform.key,
            "format": fmt,
        },
        version_text=spoken or result.script,
        warnings=warnings,
        prompt_name="studio/script",
        prompt_version="v1",
        metadata={
            "duration_sec": duration,
            "format": fmt,
            "platform": platform.key,
            "segment_plan": [s.as_dict() for s in slots],
        },
    )


def _int_or(value: Any, fallback: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


_script_capability = StudioCapability(
    id="script",
    name="Short-form script",
    description="Timed spoken script written against a deterministic segment plan.",
    execute=_run_script,
    input_model=ScriptInput,
    output_model=ScriptOutput,
    donor=("05_Reel_Script_Builder", "18_AI_Content_Director"),
    classification="ADAPT",
    requires_context=("memory", "voice", "prior_work"),
    supported_platforms=rules.list_platforms(),
)


# =========================================================================== #
# Caption — ADAPT from Module 08
# =========================================================================== #

class CaptionInput(BaseModel):
    topic: str = Field(..., min_length=1, max_length=300)
    script: Optional[str] = Field(None, max_length=20_000)
    platform: Optional[str] = Field(None, max_length=40)
    tone: Optional[str] = Field(None, max_length=60)
    count: int = Field(default=4, ge=1, le=4)


class CaptionVariant(BaseModel):
    hook: str = ""
    body: str = ""
    cta: str = ""
    hashtags: List[str] = Field(default_factory=list)
    alt_text: str = ""


class CaptionOutput(BaseModel):
    variants: List[CaptionVariant] = Field(default_factory=list)


async def _run_caption(
    ctx: CapabilityContext, payload: CaptionInput
) -> CapabilityOutcome:
    platform = rules.resolve_platform(payload.platform or ctx.platform)
    script = payload.script or ctx.source_text or ctx.context.prior_work

    variables = {
        "count": payload.count,
        "topic": payload.topic,
        "script": script,
        "platform": platform.label,
        "tone": payload.tone or ctx.tone or "conversational",
        "caption_aim_chars": platform.caption_aim_chars,
        "hashtag_min": platform.hashtag_min,
        "hashtag_max": platform.hashtag_max,
        "cta_norm": platform.cta_norm,
        **ctx.context.prompt_variables(),
    }
    result = await call_gateway(
        _caption_capability,
        ctx,
        prompt_name="studio/caption",
        prompt_version="v1",
        purpose="studio_caption_generation",
        input_data=variables,
        response_model=CaptionOutput,
        temperature=0.8,
        max_tokens=1500,
    )

    warnings: List[str] = []
    keywords = [w for w in payload.topic.split() if len(w) > 3][:3]
    variants: List[Dict[str, Any]] = []
    for raw in list(result.variants)[: payload.count]:
        hook = validation.require_str(getattr(raw, "hook", None), field="hook", max_length=300)
        body = validation.require_str(getattr(raw, "body", None), field="body", max_length=4000)
        if not (hook or body):
            warnings.append("dropped an empty caption variant")
            continue
        cta = validation.require_str(getattr(raw, "cta", None), field="cta", max_length=300)
        tags: List[str] = []
        for tag in validation.as_list(getattr(raw, "hashtags", None), max_items=20):
            text = str(tag).strip().lstrip("#")
            if text and text not in tags:
                tags.append(text)
        if platform.hashtag_max and len(tags) > platform.hashtag_max:
            tags = tags[: platform.hashtag_max]
            warnings.append("trimmed hashtags to the platform maximum")
        elif platform.hashtag_min and len(tags) < platform.hashtag_min:
            warnings.append(
                f"fewer hashtags than the {platform.key} minimum ({platform.hashtag_min})"
            )
        full = "\n".join(part for part in (hook, body, cta) if part)
        variants.append(
            {
                "hook": validation.clean_headline(hook, max_chars=125),
                "body": body,
                "cta": cta,
                "hashtags": tags,
                "alt_text": validation.require_str(
                    getattr(raw, "alt_text", None), field="alt_text", max_length=400
                ),
                "full_text": full,
            }
        )

    # Deterministic ranking, adapted from Module 08's `heuristic_pick`/`normalize`.
    ranked = validation.rank_candidates(
        variants, text_key="full_text", keywords=keywords
    )
    recommended = ranked[0]["rank"] - 1 if ranked else None

    return CapabilityOutcome(
        output={
            "variants": ranked,
            "recommended_index": recommended,
            "platform": platform.key,
        },
        version_text=render_lines(ranked, limit=4),
        warnings=warnings,
        prompt_name="studio/caption",
        prompt_version="v1",
        metadata={"platform": platform.key, "recommended_index": recommended},
    )


_caption_capability = StudioCapability(
    id="caption",
    name="Caption variants",
    description="Platform-native captions, deterministically ranked with a recommendation.",
    execute=_run_caption,
    input_model=CaptionInput,
    output_model=CaptionOutput,
    donor=("08_Caption_Assistant",),
    classification="ADAPT",
    requires_context=("voice", "memory"),
    supported_platforms=rules.list_platforms(),
)


# =========================================================================== #
# Repurpose — ADAPT from Module 02
# =========================================================================== #

class RepurposeInput(BaseModel):
    source_content: str = Field(..., min_length=1, max_length=40_000)
    platforms: List[str] = Field(
        default_factory=lambda: ["reel", "linkedin", "x"],
        min_length=1,
        max_length=6,
    )
    tone: Optional[str] = Field(None, max_length=60)


class RepurposeVariant(BaseModel):
    platform: str
    content: str = ""
    notes: str = ""


class RepurposeOutput(BaseModel):
    source_summary: str = ""
    core_point: str = ""
    variants: List[RepurposeVariant] = Field(default_factory=list)


async def _run_repurpose(
    ctx: CapabilityContext, payload: RepurposeInput
) -> CapabilityOutcome:
    platforms = [rules.resolve_platform(p).key for p in payload.platforms]
    # Preserve request order, drop duplicates.
    platforms = list(dict.fromkeys(platforms))

    rule_lines = []
    for key in platforms:
        config = rules.PLATFORMS[key]
        rule_lines.append(
            f"- {config.label}: max ~{config.caption_char_cap} characters, "
            f"CTA norm: {config.cta_norm}, "
            f"hashtags {config.hashtag_min}-{config.hashtag_max}"
        )

    variables = {
        "source_content": payload.source_content,
        "platforms": ", ".join(platforms),
        "tone": payload.tone or ctx.tone or "conversational",
        "platform_rules": "\n".join(rule_lines),
        **ctx.context.prompt_variables(),
    }
    result = await call_gateway(
        _repurpose_capability,
        ctx,
        prompt_name="studio/repurpose",
        prompt_version="v1",
        purpose="studio_repurposing",
        input_data=variables,
        response_model=RepurposeOutput,
        temperature=0.7,
        max_tokens=3000,
    )

    warnings: List[str] = []
    variants: List[Dict[str, Any]] = []
    for raw in result.variants:
        key = rules.resolve_platform(raw.platform).key
        content = validation.require_str(
            getattr(raw, "content", None), field="content", max_length=20_000
        )
        if not content:
            warnings.append(f"dropped empty variant for {key}")
            continue
        cap = rules.PLATFORMS[key].caption_char_cap
        if len(content) > cap * 1.5:
            warnings.append(f"{key} variant is well over its {cap}-character cap")
        variants.append(
            {
                "platform": key,
                "content": content,
                "notes": validation.require_str(
                    getattr(raw, "notes", None), field="notes", max_length=600
                ),
            }
        )

    missing = [p for p in platforms if p not in {v["platform"] for v in variants}]
    if missing:
        warnings.append("no variant returned for: " + ", ".join(missing))

    return CapabilityOutcome(
        output={
            "source_summary": validation.require_str(
                result.source_summary, field="source_summary", max_length=1500
            ),
            "core_point": validation.require_str(
                result.core_point, field="core_point", max_length=1000
            ),
            "variants": variants,
        },
        version_text="\n\n".join(
            f"[{v['platform']}]\n{v['content']}" for v in variants
        ),
        warnings=warnings,
        prompt_name="studio/repurpose",
        prompt_version="v1",
        metadata={"requested_platforms": platforms},
    )


_repurpose_capability = StudioCapability(
    id="repurpose",
    name="Repurpose content",
    description="Rewrite one source into platform-native variants.",
    execute=_run_repurpose,
    input_model=RepurposeInput,
    output_model=RepurposeOutput,
    donor=("02_Content_Repurposer",),
    classification="ADAPT",
    requires_context=("voice",),
    supported_platforms=rules.list_platforms(),
)


# =========================================================================== #
# CTA — REBUILD (Module 09's implementation is absent from the donor)
# =========================================================================== #

CTA_PLACEMENTS = ("reel_spoken", "reel_onscreen", "caption_opener", "caption_close")


class CTAInput(BaseModel):
    topic: str = Field(..., min_length=1, max_length=300)
    goal: str = Field(default="reach")
    offer: Optional[str] = Field(None, max_length=500)
    link_method: Optional[str] = Field(None, max_length=60)
    tone: Optional[str] = Field(None, max_length=60)


class CTACandidate(BaseModel):
    text: str = ""
    risk: str = "safe"


class CTASlot(BaseModel):
    slot: str
    candidates: List[CTACandidate] = Field(default_factory=list)


class CTAOutput(BaseModel):
    strategy: str = ""
    slots: List[CTASlot] = Field(default_factory=list)


async def _run_cta(ctx: CapabilityContext, payload: CTAInput) -> CapabilityOutcome:
    goal = rules.resolve_goal(payload.goal or ctx.goal)

    # Freshness steering: Module 09 rotated recently used angles out of the way.
    # The session metadata carries the creator's saved CTA history.
    history = (ctx.session.metadata or {}).get("recent_ctas") or []
    recent = [str(item) for item in history if str(item).strip()][-8:]

    variables = {
        "topic": payload.topic,
        "goal": goal,
        "placements": ", ".join(CTA_PLACEMENTS),
        "goal_directive": rules.goal_directive(goal),
        "recent_ctas": ", ".join(recent) if recent else "(none recorded)",
        "offer": payload.offer or "",
        "link_method": payload.link_method or "",
        "tone": payload.tone or ctx.tone or "conversational",
        **ctx.context.prompt_variables(),
    }
    result = await call_gateway(
        _cta_capability,
        ctx,
        prompt_name="studio/cta",
        prompt_version="v1",
        purpose="studio_cta_generation",
        input_data=variables,
        response_model=CTAOutput,
        temperature=0.85,
        max_tokens=1200,
    )

    warnings: List[str] = []
    slots: List[Dict[str, Any]] = []
    for raw in result.slots:
        name = validation.coerce_enum(
            getattr(raw, "slot", None), CTA_PLACEMENTS, default="reel_spoken"
        )
        candidates: List[Dict[str, Any]] = []
        for cand in list(raw.candidates)[:5]:
            text = validation.require_str(
                getattr(cand, "text", None), field="cta.text", max_length=200
            )
            if not text:
                continue
            if text in recent:
                # Freshness is a preference, not a hard failure: keep it but note it.
                warnings.append(f"CTA repeats a recent one: {text!r}")
            candidates.append(
                {
                    "text": text,
                    "risk": validation.coerce_enum(
                        getattr(cand, "risk", None),
                        ("safe", "reach_risk"),
                        default="safe",
                    ),
                }
            )
        if not candidates:
            warnings.append(f"no usable candidates for {name}")
            continue
        slots.append({"slot": name, "candidates": candidates})

    missing = [p for p in CTA_PLACEMENTS if p not in {s["slot"] for s in slots}]
    if missing:
        warnings.append("missing placements: " + ", ".join(missing))

    return CapabilityOutcome(
        output={
            "strategy": validation.require_str(
                result.strategy, field="strategy", max_length=600
            ),
            "slots": slots,
            "goal": goal,
        },
        version_text="\n\n".join(
            f"{s['slot']}: " + " | ".join(c["text"] for c in s["candidates"])
            for s in slots
        ),
        warnings=warnings,
        prompt_name="studio/cta",
        prompt_version="v1",
        metadata={"goal": goal, "placements": list(CTA_PLACEMENTS)},
    )


_cta_capability = StudioCapability(
    id="cta",
    name="Call to action",
    description="Per-placement CTA suggestions with reach-risk flags and freshness steering.",
    execute=_run_cta,
    input_model=CTAInput,
    output_model=CTAOutput,
    donor=("09_CTA_Generator",),
    classification="REBUILD",
    requires_context=("voice",),
)


# =========================================================================== #
# Thumbnail — ADAPT from Module 07
# =========================================================================== #

THUMBNAIL_STRATEGIES = (
    "face_first", "visual_first", "text_first", "hybrid",
    "comparison", "story_moment", "minimal",
)
TEXT_LEVELS = ("none", "minimal", "headline")
CONTENT_TYPES = (
    "tutorial", "story", "contrarian", "listicle",
    "before_after", "comparison", "interview", "review",
)


class ThumbnailInput(BaseModel):
    description: str = Field(..., min_length=1, max_length=4000)
    content_type: str = Field(default="tutorial")
    variation_hint: Optional[str] = Field(None, max_length=200)


class ThumbnailConcept(BaseModel):
    strategy: str = "minimal"
    headline: str = ""
    visual_description: str = ""
    text_level: str = "none"
    rationale: str = ""


class ThumbnailOutput(BaseModel):
    concepts: List[ThumbnailConcept] = Field(default_factory=list)


async def _run_thumbnail(
    ctx: CapabilityContext, payload: ThumbnailInput
) -> CapabilityOutcome:
    variables = {
        "topic": payload.description[:200],
        "description": payload.description,
        "content_type": validation.coerce_enum(
            payload.content_type, CONTENT_TYPES, default="tutorial"
        ),
        "variation_hint": payload.variation_hint or "",
        **ctx.context.prompt_variables(),
    }
    result = await call_gateway(
        _thumbnail_capability,
        ctx,
        prompt_name="studio/thumbnail",
        prompt_version="v1",
        purpose="studio_thumbnail_generation",
        input_data=variables,
        response_model=ThumbnailOutput,
        temperature=0.8,
        max_tokens=1500,
    )

    warnings: List[str] = []
    concepts: List[Dict[str, Any]] = []
    for raw in list(result.concepts)[:3]:
        visual = validation.require_str(
            getattr(raw, "visual_description", None),
            field="visual_description",
            max_length=600,
        )
        if not visual:
            continue
        level = validation.coerce_enum(
            getattr(raw, "text_level", None), TEXT_LEVELS, default="none"
        )
        headline = validation.clean_headline(
            getattr(raw, "headline", "") or "", max_chars=40
        )
        if level == "headline" and not headline:
            level = "none"
        if level == "none" and headline:
            # Keep the text but do not claim a headline the model did not place.
            warnings.append("headline supplied but text_level was 'none'")
        concepts.append(
            {
                "strategy": validation.coerce_enum(
                    getattr(raw, "strategy", None),
                    THUMBNAIL_STRATEGIES,
                    default="minimal",
                ),
                "headline": headline,
                "visual_description": visual,
                "text_level": level,
                "rationale": validation.require_str(
                    getattr(raw, "rationale", None), field="rationale", max_length=400
                ),
            }
        )

    if len(concepts) < 3:
        warnings.append(f"received {len(concepts)} of 3 requested directions")

    return CapabilityOutcome(
        output={"concepts": concepts},
        version_text="\n\n".join(
            f"{c['strategy']}: {c['visual_description']}"
            + (f" — “{c['headline']}”" if c["headline"] else "")
            for c in concepts
        ),
        warnings=warnings,
        prompt_name="studio/thumbnail",
        prompt_version="v1",
        metadata={"count": len(concepts)},
    )


_thumbnail_capability = StudioCapability(
    id="thumbnail",
    name="Thumbnail concepts",
    description="Cover directions with an explicit anti-clickbait rationale.",
    execute=_run_thumbnail,
    input_model=ThumbnailInput,
    output_model=ThumbnailOutput,
    donor=("07_Thumbnail_Ideator",),
    classification="ADAPT",
    requires_context=("voice",),
)


# =========================================================================== #
# Refinement — ADAPT from Module 18 (Guruvelah) modifier instructions
# =========================================================================== #

#: Module 18's `MODIFIER_INSTRUCTIONS` (`app/api/generations/[id]/regenerate/
#: route.ts:10`) expressed as directives the prompt can act on. The donor had four;
#: SIMPLER is added because a creator asking for "less jargon" has no other way to
# say it.
MODIFIER_INSTRUCTIONS = {
    "shorter": "Cut length substantially. Keep only what carries the point.",
    "more_casual": "Write more conversationally. Contractions, shorter clauses, less formality.",
    "more_bold": "Take a stronger position. Commit to the claim instead of hedging.",
    "more_educational": "Explain the reasoning more fully so a beginner can follow it.",
    "simpler": "Replace jargon and complex phrasing with plain language.",
}


class RefineInput(BaseModel):
    instruction: str = Field(..., min_length=1, max_length=4000)
    current_content: Optional[str] = Field(None, max_length=40_000)
    modifier: Optional[str] = Field(
        default=None, description="One of the supported refinement modifiers."
    )


class RefineChange(BaseModel):
    change: str = ""
    reason: str = ""


class RefineOutput(BaseModel):
    content: str = ""
    changes: List[RefineChange] = Field(default_factory=list)


async def _run_refine(ctx: CapabilityContext, payload: RefineInput) -> CapabilityOutcome:
    # The orchestrator may have already loaded the target version's text; prefer an
    # explicit one, then the session's latest output.
    current = (
        payload.current_content
        or ctx.source_text
        or ""
    )
    if not current.strip():
        raise CapabilityError(
            "There is no content to refine yet. Generate something first.",
            status="empty_content",
        )

    modifier_note = ""
    if payload.modifier:
        modifier_note = MODIFIER_INSTRUCTIONS.get(payload.modifier, "")
        if not modifier_note:
            raise CapabilityError(
                f"Unsupported modifier {payload.modifier!r}. Supported: "
                + ", ".join(sorted(MODIFIER_INSTRUCTIONS)),
                status="invalid_input",
            )

    # Surface the previous critique so a refinement can act on it, but only the
    # findings the instruction plausibly covers is the model's judgement.
    latest = await ctx.repository.latest_generation(ctx.session.id)
    critique_block = ""
    if latest is not None and latest.critique:
        critique_block = render_lines(
            [
                {
                    "title": item.get("dimension", "finding"),
                    "text": f"[{item.get('severity', '?')}] "
                    f"{item.get('finding', '')} -> {item.get('suggestion', '')}",
                }
                for item in (latest.critique.get("items") or [])
                if isinstance(item, dict)
            ],
            limit=8,
        )
        if not critique_block:
            critique_block = str(latest.critique.get("verdict") or "")

    variables = {
        "current_content": current,
        "instruction": wrap_brief(payload.instruction),
        "modifier_instruction": modifier_note,
        "critique": critique_block or "(no critique recorded)",
        "creator_request": ctx.brief,
        "creator_voice": ctx.context.voice,
        "retrieved_memory": ctx.context.memory,
        "platform": ctx.platform or rules.resolve_platform(None).label,
        "goal": ctx.goal or rules.DEFAULT_GOAL,
    }
    result = await call_gateway(
        _refine_capability,
        ctx,
        prompt_name="studio/refine",
        prompt_version="v1",
        purpose="studio_refinement",
        input_data=variables,
        response_model=RefineOutput,
        temperature=0.65,
        max_tokens=2500,
    )

    refined = validation.require_str(
        getattr(result, "content", None), field="content", max_length=60_000
    )
    if not refined:
        raise CapabilityError(
            "The refinement produced no usable text. Please retry.",
            status="empty_output",
        )

    changes: List[Dict[str, str]] = []
    for change in list(result.changes)[:15]:
        text = validation.require_str(
            getattr(change, "change", None), field="change", max_length=500
        )
        if not text:
            continue
        changes.append(
            {
                "change": text,
                "reason": validation.require_str(
                    getattr(change, "reason", None), field="reason", max_length=500
                ),
            }
        )

    warnings: List[str] = []
    if refined.strip() == current.strip():
        warnings.append("the refinement is identical to the previous version")

    return CapabilityOutcome(
        output={
            "content": refined,
            "changes": changes,
            "modifier": payload.modifier,
            "previous_version": latest.version if latest else None,
        },
        version_text=refined,
        warnings=warnings,
        prompt_name="studio/refine",
        prompt_version="v1",
        metadata={"modifier": payload.modifier, "change_count": len(changes)},
    )


_refine_capability = StudioCapability(
    id="refine",
    name="Refine version",
    description="Revise the current version on explicit instruction; the original is preserved.",
    execute=_run_refine,
    input_model=RefineInput,
    output_model=RefineOutput,
    donor=("18_AI_Content_Director", "07_Thumbnail_Ideator"),
    classification="ADAPT",
    requires_context=("voice", "memory", "critique"),
    supports_refinement=True,
)



# =========================================================================== #
# Registry
# =========================================================================== #

ALL_CAPABILITIES = (
    _idea_capability,
    _hook_capability,
    _script_capability,
    _caption_capability,
    _repurpose_capability,
    _cta_capability,
    _thumbnail_capability,
    _refine_capability,
)


def build_registry() -> "Any":
    from app.studio.registry import StudioCapabilityRegistry

    return StudioCapabilityRegistry(ALL_CAPABILITIES)


__all__ = [
    "ALL_CAPABILITIES",
    "build_registry",
    "IdeaInput", "IdeaOutput",
    "HookInput", "HookOutput", "HOOK_STYLES",
    "ScriptInput", "ScriptOutput",
    "CaptionInput", "CaptionOutput",
    "RepurposeInput", "RepurposeOutput",
    "CTAInput", "CTAOutput", "CTA_PLACEMENTS",
    "ThumbnailInput", "ThumbnailOutput",
    "RefineInput", "RefineOutput", "MODIFIER_INSTRUCTIONS",
    "wrap_brief",
]
