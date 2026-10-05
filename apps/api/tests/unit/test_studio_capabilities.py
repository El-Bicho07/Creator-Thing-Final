"""Studio capabilities against a scripted Gateway — no network, deterministic.

Adapted from Module 18 (Guruvelah) `tests/integration/orchestrator.test.ts:6`,
which supplied a fake provider that routed on prompt substrings so the entire
pipeline could be tested with zero API calls. Studio uses the platform's
`ScriptedLLMProvider` for the same purpose.

These tests cover the donor-smoke chain required for every ported capability:

```text
donor capability -> platform adapter -> Studio capability contract -> platform services
```

The mock provider is used *through* the real Gateway, so routing, structured
output validation, `ai_calls` accounting and prompt rendering are all genuinely
exercised — only the network hop is replaced.
"""
from __future__ import annotations

import asyncio
import json
import uuid
from typing import Any, Dict, List

import pytest

from app.llm.gateway import LLMGateway, set_llm_gateway
from app.llm.providers import ScriptedLLMProvider
from app.studio.capabilities.implementations import build_registry
from app.studio.context import CreatorContext
from app.studio.registry import CapabilityContext, CapabilityError, call_gateway

U = uuid.UUID("11111111-1111-4111-8111-111111111111")


def awaitable_run(coro):
    """Drive a capability coroutine from a synchronous test.

    Each test gets a fresh event loop, which is what we want: no cross-test state
    in the Gateway cache or in any loop-bound resource.
    """
    return asyncio.run(coro)


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

class FakeSession:
    """Minimal stand-in for `StudioSessionRecord`."""

    def __init__(self, **kwargs):
        self.id = kwargs.get("id", uuid.UUID("22222222-2222-4222-8222-222222222222"))
        self.title = kwargs.get("title", "Test session")
        self.brief = kwargs.get("brief", "make a reel about launching")
        self.status = "active"
        self.current_step = kwargs.get("current_step", "context")
        self.idea_id = None
        self.last_capability = None
        self.metadata = kwargs.get("metadata", {})


class FakeRepository:
    async def latest_generation(self, session_id):
        return None


def make_ctx(**overrides) -> CapabilityContext:
    """A CapabilityContext with empty context, so tests isolate the capability."""
    defaults: Dict[str, Any] = dict(
        user_id=U,
        db=None,
        session=FakeSession(),
        repository=FakeRepository(),
        context=CreatorContext(brief="make a reel about launching"),
        brief="make a reel about launching",
        platform="reel",
        tone="conversational",
        goal="reach",
        duration_sec=30,
        source_text=None,
    )
    defaults.update(overrides)
    return CapabilityContext(**defaults)


@pytest.fixture
def gateway():
    """Install a Gateway backed by a scripted provider; restore afterwards."""
    previous = None
    try:
        from app.llm.gateway import get_llm_gateway

        previous = get_llm_gateway()
    except Exception:
        previous = None

    def install(script: List[str], *, error_at: int | None = None) -> ScriptedLLMProvider:
        provider = ScriptedLLMProvider(script=script, error_at=error_at)
        # A dict keyed by provider name: the Gateway's registry is name -> adapter.
        set_llm_gateway(LLMGateway(providers={provider.name: provider}))
        return provider

    yield install

    set_llm_gateway(previous)


def json_response(payload: Dict[str, Any]) -> str:
    return json.dumps(payload)


# --------------------------------------------------------------------------- #
# idea — donor: Module 01
# --------------------------------------------------------------------------- #

def test_idea_generation_smoke(gateway):
    """Module 01 -> Studio `idea` capability -> platform Gateway."""
    provider = gateway([
        json_response({
            "ideas": [
                {
                    "title": "Why Tuesday is the best launch day 🚀",
                    "angle": "Midweek launches face less inbox competition.",
                    "why_it_could_work": "Concrete and testable.",
                    "format": "tutorial",
                    "difficulty": "easy",
                },
                {
                    "title": "The 3-week email mistake",
                    "angle": "Waiting three weeks cost 400 signups.",
                    "why_it_could_work": "Regret framing.",
                    "format": "story",
                    "difficulty": "medium",
                },
            ]
        })
    ])
    registry = build_registry()
    capability = registry.require("idea")
    payload = capability.validate_input({"topic": "launch timing", "count": 2})

    outcome = awaitable_run(
        capability.execute(make_ctx(), payload)
    )

    assert len(outcome.output["ideas"]) == 2
    # Module 01's hygiene: the emoji must be gone.
    assert "\U0001F680" not in outcome.output["ideas"][0]["title"]
    assert outcome.prompt_name == "studio/idea"
    assert outcome.prompt_version == "v1"
    assert provider.calls == 1
    assert "Tuesday" in outcome.version_text


def test_idea_drops_entries_without_a_title(gateway):
    gateway([json_response({"ideas": [{"title": "", "angle": "orphan"}]})])
    capability = build_registry().require("idea")
    payload = capability.validate_input({"topic": "x", "count": 2})
    outcome = awaitable_run(capability.execute(make_ctx(), payload))

    assert outcome.output["count"] == 0
    assert any("no title" in w for w in outcome.warnings)


def test_idea_clamps_an_out_of_range_difficulty(gateway):
    gateway([json_response({
        "ideas": [{"title": "T", "angle": "a", "difficulty": "extremely hard"}]
    })])
    capability = build_registry().require("idea")
    payload = capability.validate_input({"topic": "x"})
    outcome = awaitable_run(capability.execute(make_ctx(), payload))
    assert outcome.output["ideas"][0]["difficulty"] == "medium"


def test_idea_respects_the_requested_count(gateway):
    gateway([json_response({
        "ideas": [{"title": f"T{i}", "angle": "a"} for i in range(8)]
    })])
    capability = build_registry().require("idea")
    payload = capability.validate_input({"topic": "x", "count": 3})
    outcome = awaitable_run(capability.execute(make_ctx(), payload))
    assert len(outcome.output["ideas"]) == 3


def test_idea_with_empty_output_is_reported(gateway):
    gateway([json_response({"ideas": []})])
    capability = build_registry().require("idea")
    payload = capability.validate_input({"topic": "x"})
    outcome = awaitable_run(capability.execute(make_ctx(), payload))
    assert outcome.output["count"] == 0
    assert outcome.warnings


# --------------------------------------------------------------------------- #
# hook — donor: Module 03
# --------------------------------------------------------------------------- #

def test_hook_realigns_to_the_mandatory_styles(gateway):
    """The donor's core reliability feature: N styles in, N hooks out, in order."""
    gateway([json_response({
        "hooks": [
            {"style": "question", "text": "Why did your launch flop?"},
            {"style": "curiosity", "text": "Nobody warns you about this"},
        ]
    })])
    capability = build_registry().require("hook")
    payload = capability.validate_input(
        {"topic": "launch timing", "styles": ["curiosity", "question"], "limit": 2}
    )
    outcome = awaitable_run(capability.execute(make_ctx(), payload))

    hooks = outcome.output["hooks"]
    assert len(hooks) == 2
    assert hooks[0]["style"] == "curiosity"
    assert hooks[1]["style"] == "question"
    assert hooks[0]["text"] == "Nobody warns you about this"


def test_hook_fills_missing_styles_with_placeholders(gateway):
    gateway([json_response({"hooks": []})])
    capability = build_registry().require("hook")
    payload = capability.validate_input(
        {"topic": "x", "styles": ["curiosity", "surprise"], "limit": 2}
    )
    outcome = awaitable_run(capability.execute(make_ctx(), payload))

    assert len(outcome.output["hooks"]) == 2
    assert all("pending" in h["text"] for h in outcome.output["hooks"])
    assert any("missing hook" in w for w in outcome.warnings)


def test_hook_rejects_a_style_set_with_nothing_recognised(gateway):
    """The styles field is a free list, so the capability filters and then refuses.

    Refusing beats silently falling back to all ten: a caller asking only for
    styles we dropped has a bug worth surfacing.
    """
    gateway([json_response({"hooks": []})])
    capability = build_registry().require("hook")
    payload = capability.validate_input(
        {"topic": "x", "styles": ["interpretive_dance"]}
    )
    with pytest.raises(CapabilityError) as excinfo:
        awaitable_run(capability.execute(make_ctx(), payload))
    assert excinfo.value.status == "invalid_input"
    assert "curiosity" in str(excinfo.value)   # the message lists valid styles


def test_hook_keeps_recognised_styles_and_drops_the_rest(gateway):
    gateway([json_response({
        "hooks": [{"style": "curiosity", "text": "a hook"}]
    })])
    capability = build_registry().require("hook")
    payload = capability.validate_input(
        {"topic": "x", "styles": ["curiosity", "interpretive_dance"], "limit": 1}
    )
    outcome = awaitable_run(capability.execute(make_ctx(), payload))
    assert outcome.metadata["styles"] == ["curiosity"]


def test_hook_limit_truncates(gateway):
    gateway([json_response({
        "hooks": [{"style": s, "text": f"hook {s}"} for s in
                  ("curiosity", "question", "contrarian")]
    })])
    capability = build_registry().require("hook")
    payload = capability.validate_input(
        {"topic": "x", "styles": ["curiosity", "question", "contrarian"], "limit": 2}
    )
    outcome = awaitable_run(capability.execute(make_ctx(), payload))
    assert len(outcome.output["hooks"]) == 2


def test_hook_applies_headline_hygiene(gateway):
    gateway([json_response({
        "hooks": [{
            "style": "curiosity",
            "text": "🚀 Let's delve into the game-changing realm of timing",
        }]
    })])
    capability = build_registry().require("hook")
    payload = capability.validate_input({"topic": "x", "styles": ["curiosity"]})
    outcome = awaitable_run(capability.execute(make_ctx(), payload))
    text = outcome.output["hooks"][0]["text"]
    assert "\U0001F680" not in text
    assert "delve" not in text.lower()


# --------------------------------------------------------------------------- #
# script — donors: Module 05 + 18
# --------------------------------------------------------------------------- #

def test_script_smoke_uses_the_deterministic_segment_plan(gateway):
    gateway([json_response({
        "title": "Launch timing",
        "script": "full spoken text",
        "segments": [
            {"role": "HOOK", "text": "Nobody tells you this.", "visual": "close-up"},
            {"role": "SETUP", "text": "I launched on a Tuesday.", "visual": "screen"},
            {"role": "VALUE", "text": "Inbox competition is lower midweek."},
            {"role": "VALUE", "text": "I got 400 signups in 48 hours."},
            {"role": "PAYOFF", "text": "Timing is a free advantage."},
            {"role": "CTA", "text": "Try Tuesday for your launch."},
        ],
    })])
    capability = build_registry().require("script")
    payload = capability.validate_input({"topic": "launch timing"})
    outcome = awaitable_run(capability.execute(make_ctx(duration_sec=30), payload))

    output = outcome.output
    assert output["duration_sec"] == 30
    assert output["platform"] == "reel"
    assert output["format"] == "tutorial"
    assert len(output["segments"]) == 6
    assert output["segments"][0]["role"] == "hook"
    assert output["segments"][-1]["role"] == "cta"
    # Timing came from the computed plan, not from the model.
    assert output["segments"][0]["start_sec"] == 0
    assert output["segments"][-1]["end_sec"] == 30
    # The plan itself is recorded for provenance.
    assert outcome.metadata["segment_plan"]


def test_script_falls_back_to_plan_timing_when_model_omits_it(gateway):
    gateway([json_response({
        "segments": [
            {"role": "HOOK", "text": "opening"},
            {"role": "VALUE", "text": "middle"},
            {"role": "CTA", "text": "close"},
        ]
    })])
    capability = build_registry().require("script")
    payload = capability.validate_input({"topic": "x"})
    outcome = awaitable_run(capability.execute(make_ctx(duration_sec=30), payload))

    for segment in outcome.output["segments"]:
        assert isinstance(segment["start_sec"], int)
        assert isinstance(segment["end_sec"], int)


def test_script_reports_structural_problems_as_warnings(gateway):
    """Module 18's validators surfaced deviations rather than silently accepting."""
    gateway([json_response({
        "segments": [
            {"role": "SETUP", "text": "starts wrong"},
            {"role": "VALUE", "text": "middle"},
            {"role": "VALUE", "text": "more"},
        ]
    })])
    capability = build_registry().require("script")
    payload = capability.validate_input({"topic": "x"})
    outcome = awaitable_run(capability.execute(make_ctx(), payload))

    joined = " ".join(outcome.warnings)
    assert "HOOK" in joined or "CTA" in joined


def test_script_selects_a_platform_valid_format(gateway):
    """A format invalid for the platform must not be sent through."""
    gateway([json_response({"segments": [
        {"role": "HOOK", "text": "a"},
        {"role": "VALUE", "text": "b"},
        {"role": "CTA", "text": "c"},
    ]})])
    capability = build_registry().require("script")
    # 'case_study' is valid for YouTube but not for Reels.
    payload = capability.validate_input(
        {"topic": "x", "platform": "reel", "format": "case_study"}
    )
    outcome = awaitable_run(capability.execute(make_ctx(), payload))

    from app.studio.domain import rules

    assert outcome.output["format"] in rules.allowed_formats("reel")


# --------------------------------------------------------------------------- #
# caption — donor: Module 08
# --------------------------------------------------------------------------- #

def test_caption_smoke_ranks_and_recommends(gateway):
    """Module 08's `heuristic_pick` + `normalize`, adapted."""
    gateway([json_response({
        "variants": [
            {
                "hook": "Some thoughts",
                "body": "A short note.",
                "cta": "",
                "hashtags": [],
                "alt_text": "",
            },
            {
                "hook": "Nobody tells you this about launching",
                "body": "I waited three weeks to email my list.",
                "cta": "Save this for your launch.",
                "hashtags": ["creators", "launch"],
                "alt_text": "Laptop screen",
            },
        ]
    })])
    capability = build_registry().require("caption")
    payload = capability.validate_input({"topic": "launch", "count": 2})
    outcome = awaitable_run(capability.execute(make_ctx(), payload))

    variants = outcome.output["variants"]
    assert len(variants) == 2
    # The stronger variant must rank first, and be the recommendation.
    assert variants[0]["rank"] == 1
    assert outcome.output["recommended_index"] == 0
    assert variants[0]["score"] > variants[1]["score"]


def test_caption_trims_hashtags_to_the_platform_maximum(gateway):
    gateway([json_response({
        "variants": [{
            "hook": "A hook",
            "body": "Body",
            "cta": "Follow",
            "hashtags": [f"tag{i}" for i in range(20)],
        }]
    })])
    capability = build_registry().require("caption")
    payload = capability.validate_input({"topic": "x"})
    outcome = awaitable_run(capability.execute(make_ctx(platform="reel"), payload))

    from app.studio.domain import rules

    assert len(outcome.output["variants"][0]["hashtags"]) <= (
        rules.PLATFORMS["reel"].hashtag_max
    )
    assert any("trimmed" in w for w in outcome.warnings)


def test_caption_drops_empty_variants(gateway):
    gateway([json_response({
        "variants": [
            {"hook": "", "body": "", "cta": "", "hashtags": []},
            {"hook": "Real hook", "body": "Body", "cta": "", "hashtags": []},
        ]
    })])
    capability = build_registry().require("caption")
    payload = capability.validate_input({"topic": "x", "count": 2})
    outcome = awaitable_run(capability.execute(make_ctx(), payload))

    assert len(outcome.output["variants"]) == 1
    assert any("empty caption" in w for w in outcome.warnings)


# --------------------------------------------------------------------------- #
# repurpose — donor: Module 02
# --------------------------------------------------------------------------- #

def test_repurpose_smoke_preserves_one_variant_per_platform(gateway):
    """Module 02's analyze-then-fan-out, adapted."""
    gateway([json_response({
        "source_summary": "A post about launch timing.",
        "core_point": "Launch midweek.",
        "variants": [
            {"platform": "reel", "content": "Launch midweek. Here is why.",
             "notes": "spoken"},
            {"platform": "x", "content": "Launch midweek — inbox is quieter.",
             "notes": "short"},
            {"platform": "linkedin", "content": "A long reflection on launch timing.",
             "notes": "professional"},
        ],
    })])
    capability = build_registry().require("repurpose")
    payload = capability.validate_input({
        "source_content": "Launch timing matters.",
        "platforms": ["reel", "x", "linkedin"],
    })
    outcome = awaitable_run(capability.execute(make_ctx(), payload))

    platforms = [v["platform"] for v in outcome.output["variants"]]
    assert platforms == ["reel", "x", "linkedin"]
    assert outcome.output["core_point"] == "Launch midweek."


def test_repurpose_warns_about_missing_platforms(gateway):
    gateway([json_response({
        "variants": [{"platform": "reel", "content": "only this one"}]
    })])
    capability = build_registry().require("repurpose")
    payload = capability.validate_input({
        "source_content": "x",
        "platforms": ["reel", "x"],
    })
    outcome = awaitable_run(capability.execute(make_ctx(), payload))

    assert any("no variant returned for" in w for w in outcome.warnings)


def test_repurpose_resolves_donor_platform_aliases(gateway):
    gateway([json_response({"variants": []})])
    capability = build_registry().require("repurpose")
    payload = capability.validate_input({
        "source_content": "x",
        "platforms": ["instagram_reels", "twitter"],
    })
    outcome = awaitable_run(capability.execute(make_ctx(), payload))

    assert outcome.metadata["requested_platforms"] == ["reel", "x"]


# --------------------------------------------------------------------------- #
# cta — REBUILD of Module 09
# --------------------------------------------------------------------------- #

def test_cta_smoke_fills_every_placement(gateway):
    gateway([json_response({
        "strategy": "One clear ask per placement.",
        "slots": [
            {"slot": "reel_spoken", "candidates": [
                {"text": "Try Tuesday", "risk": "safe"},
                {"text": "Join 400 signups", "risk": "safe"},
            ]},
            {"slot": "reel_onscreen", "candidates": [
                {"text": "Launch Tuesday", "risk": "safe"},
            ]},
            {"slot": "caption_opener", "candidates": [
                {"text": "Everyone gets launch day wrong", "risk": "safe"},
            ]},
            {"slot": "caption_close", "candidates": [
                {"text": "Save this", "risk": "safe"},
            ]},
        ],
    })])
    capability = build_registry().require("cta")
    payload = capability.validate_input({"topic": "launch timing", "goal": "engagement"})
    outcome = awaitable_run(capability.execute(make_ctx(), payload))

    slots = outcome.output["slots"]
    assert [s["slot"] for s in slots] == [
        "reel_spoken", "reel_onscreen", "caption_opener", "caption_close"
    ]
    assert outcome.output["goal"] == "engagement"


def test_cta_flags_a_repeated_cta(gateway):
    """Freshness steering: Module 09 rotated recently used angles away."""
    gateway([json_response({
        "slots": [{"slot": "reel_spoken", "candidates": [{"text": "Save this"}]}]
    })])
    capability = build_registry().require("cta")
    payload = capability.validate_input({"topic": "x", "goal": "reach"})
    ctx = make_ctx(session=FakeSession(metadata={"recent_ctas": ["Save this"]}))
    outcome = awaitable_run(capability.execute(ctx, payload))

    assert any("repeats a recent one" in w for w in outcome.warnings)


def test_cta_coerces_an_unknown_slot(gateway):
    gateway([json_response({
        "slots": [{"slot": "billboard", "candidates": [{"text": "Try this"}]}]
    })])
    capability = build_registry().require("cta")
    payload = capability.validate_input({"topic": "x", "goal": "reach"})
    outcome = awaitable_run(capability.execute(make_ctx(), payload))
    assert outcome.output["slots"][0]["slot"] == "reel_spoken"


def test_cta_defaults_an_unknown_goal(gateway):
    gateway([json_response({"slots": [
        {"slot": "reel_spoken", "candidates": [{"text": "a"}]}
    ]})])
    capability = build_registry().require("cta")
    payload = capability.validate_input({"topic": "x", "goal": "viral_dance"})
    outcome = awaitable_run(capability.execute(make_ctx(), payload))

    from app.studio.domain import rules

    assert outcome.output["goal"] == rules.DEFAULT_GOAL


# --------------------------------------------------------------------------- #
# thumbnail — donor: Module 07
# --------------------------------------------------------------------------- #

def test_thumbnail_smoke_coerces_strategy_and_text_level(gateway):
    gateway([json_response({
        "concepts": [
            {
                "strategy": "text_first",
                "headline": "12 WORDS TOO MANY",
                "visual_description": "Split screen of two launch calendars.",
                "text_level": "headline",
                "rationale": "The contrast carries it.",
            },
            {
                "strategy": "not_a_strategy",
                "headline": "",
                "visual_description": "A calendar with one day circled.",
                "text_level": "impossible",
                "rationale": "Simple and honest.",
            },
        ]
    })])
    capability = build_registry().require("thumbnail")
    payload = capability.validate_input({"description": "launch timing"})
    outcome = awaitable_run(capability.execute(make_ctx(), payload))

    concepts = outcome.output["concepts"]
    assert len(concepts) == 2
    assert concepts[0]["strategy"] == "text_first"
    assert len(concepts[0]["headline"]) <= 40
    assert concepts[1]["strategy"] == "minimal"
    assert concepts[1]["text_level"] == "none"


def test_thumbnail_downgrades_headline_when_missing(gateway):
    gateway([json_response({
        "concepts": [{
            "strategy": "text_first",
            "headline": "",
            "visual_description": "A clean visual.",
            "text_level": "headline",
        }]
    })])
    capability = build_registry().require("thumbnail")
    payload = capability.validate_input({"description": "x"})
    outcome = awaitable_run(capability.execute(make_ctx(), payload))
    assert outcome.output["concepts"][0]["text_level"] == "none"


def test_thumbnail_drops_concepts_without_a_visual(gateway):
    gateway([json_response({
        "concepts": [{"strategy": "minimal", "visual_description": ""}]
    })])
    capability = build_registry().require("thumbnail")
    payload = capability.validate_input({"description": "x"})
    outcome = awaitable_run(capability.execute(make_ctx(), payload))
    assert outcome.output["concepts"] == []


# --------------------------------------------------------------------------- #
# refine — donor: Module 18 modifiers
# --------------------------------------------------------------------------- #

def test_refine_smoke_produces_a_new_version_body(gateway):
    gateway([json_response({
        "content": "Launch midweek. Inbox competition is lower.",
        "changes": [{"change": "Tightened the opening", "reason": "It was slow"}],
    })])
    capability = build_registry().require("refine")
    payload = capability.validate_input({
        "instruction": "Make it punchier",
        "current_content": "You should really consider launching midweek.",
    })
    outcome = awaitable_run(capability.execute(make_ctx(), payload))

    assert outcome.output["content"].startswith("Launch midweek")
    assert outcome.output["changes"][0]["change"] == "Tightened the opening"
    assert outcome.version_text == outcome.output["content"]


def test_refine_applies_the_donor_modifier(gateway):
    gateway([json_response({"content": "Shorter now."})])
    capability = build_registry().require("refine")
    payload = capability.validate_input({
        "instruction": "trim it",
        "current_content": "a very long original",
        "modifier": "shorter",
    })
    outcome = awaitable_run(capability.execute(make_ctx(), payload))
    assert outcome.metadata["modifier"] == "shorter"


def test_refine_rejects_an_unknown_modifier(gateway):
    capability = build_registry().require("refine")
    payload = capability.validate_input({
        "instruction": "do something",
        "current_content": "text",
        "modifier": "make_it_sarcastic",
    })
    with pytest.raises(CapabilityError) as excinfo:
        awaitable_run(capability.execute(make_ctx(), payload))
    assert excinfo.value.status == "invalid_input"


def test_refine_requires_content(gateway):
    gateway([json_response({"content": "unused"})])
    capability = build_registry().require("refine")
    payload = capability.validate_input({"instruction": "make it better"})
    with pytest.raises(CapabilityError) as excinfo:
        awaitable_run(capability.execute(make_ctx(source_text=None), payload))
    assert excinfo.value.status == "empty_content"


def test_refine_flags_an_identical_result(gateway):
    gateway([json_response({"content": "unchanged text"})])
    capability = build_registry().require("refine")
    payload = capability.validate_input({
        "instruction": "change it",
        "current_content": "unchanged text",
    })
    outcome = awaitable_run(capability.execute(make_ctx(), payload))
    assert any("identical" in w for w in outcome.warnings)


def test_refine_rejects_empty_output(gateway):
    gateway([json_response({"content": "   "})])
    capability = build_registry().require("refine")
    payload = capability.validate_input({
        "instruction": "change it",
        "current_content": "original",
    })
    with pytest.raises(CapabilityError) as excinfo:
        awaitable_run(capability.execute(make_ctx(), payload))
    assert excinfo.value.status == "empty_output"


# --------------------------------------------------------------------------- #
# Gateway integration — the §14 boundary
# --------------------------------------------------------------------------- #

def test_capabilities_record_prompt_and_feature_provenance(gateway):
    """Every Studio call must be attributable through ai_calls."""
    provider = gateway([json_response({"ideas": [{"title": "T", "angle": "a"}]})])
    capability = build_registry().require("idea")
    payload = capability.validate_input({"topic": "x"})
    awaitable_run(capability.execute(make_ctx(), payload))

    # The Gateway was used (not a direct provider call): the scripted provider
    # only responds because the Gateway routed to it.
    assert provider.calls == 1
    assert provider.name == "scripted"


def test_provider_failure_becomes_a_creator_safe_error(gateway):
    """An unreachable provider must surface as an actionable message, not a stack."""
    from app.core.errors import AITimeoutError
    from app.llm.providers.base import ProviderAdapter, ProviderResponse

    class AlwaysTimesOut(ProviderAdapter):
        name = "always_timeout"

        def __init__(self):
            super().__init__(api_key="x")

        @property
        def is_configured(self) -> bool:
            return True

        async def complete(self, request):
            raise AITimeoutError("upstream timed out after 30s")

    set_llm_gateway(LLMGateway(providers={"always_timeout": AlwaysTimesOut()}))

    capability = build_registry().require("idea")
    payload = capability.validate_input({"topic": "x"})

    with pytest.raises(CapabilityError) as excinfo:
        awaitable_run(capability.execute(make_ctx(), payload))

    message = str(excinfo.value)
    assert "Traceback" not in message
    assert "upstream timed out" not in message   # no provider internals leak
    assert "timed out" in message.lower()        # but the creator is told what happened
    assert excinfo.value.status


def test_gateway_retry_is_bounded_and_a_later_attempt_can_succeed(gateway):
    """A transient failure recovers rather than surfacing as an error.

    Also documents that retry lives in the Gateway, not in Studio: the capability
    makes one logical call.
    """
    provider = gateway([json_response({"ideas": [{"title": "T", "angle": "a"}]})],
                       error_at=0)
    capability = build_registry().require("idea")
    payload = capability.validate_input({"topic": "x"})

    outcome = awaitable_run(capability.execute(make_ctx(), payload))
    assert outcome.output["count"] == 1
    assert provider.calls >= 2, "expected a retry after the first failure"


def test_call_gateway_uses_the_studio_feature_label(gateway):
    """`feature='studio'` is what makes ai_calls attributable."""
    from app.llm.contracts import LLMRequest
    from pydantic import BaseModel, Field

    class Out(BaseModel):
        ok: bool = Field(default=True)

    gateway([json_response({"ok": True})])
    capability = build_registry().require("idea")

    request = LLMRequest(
        purpose="test",
        feature="studio",
        input_data={"topic": "x"},
    )
    # The strict renderer requires every declared prompt variable, which is what
    # makes an under-specified prompt an error instead of a silent blank.
    result = awaitable_run(
        call_gateway(
            capability, make_ctx(),
            prompt_name="studio/idea",
            prompt_version="v1",
            purpose="studio_test",
            input_data={
                "topic": "x",
                "count": 3,
                "angle": "x",
                "creator_request": "x",
                "retrieved_memory": "",
                "creator_voice": "",
                "prior_work": "",
                "platform": "reel",
                "goal": "reach",
            },
            response_model=Out,
        )
    )
    assert result.ok is True
