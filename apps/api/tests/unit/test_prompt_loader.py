"""Regression test for the versioned prompt asset loader.

Context: every prompt asset shipped in Phase 2 except `voice/profile_summary`
authored its body under the key `prompt`, while `PromptTemplate` reads
`template`. Those assets therefore loaded with an EMPTY template and rendered to
an empty user message -- so a feature got a silently empty prompt instead of an
error. Found while starting Phase 3, because Studio depends on these assets.

These tests pin the behaviour so the loader and the assets cannot drift apart
again.
"""
from __future__ import annotations

import pytest

from app.llm.prompts import (
    PROMPTS_ROOT,
    _ASSET_RE,
    build_prompt,
    list_prompts,
    load_prompt,
    render,
)


def _every_asset() -> list[tuple[str, str]]:
    """Every shipped asset as `(purpose/name, version)`."""
    found: list[tuple[str, str]] = []
    for path in PROMPTS_ROOT.rglob("*.json"):
        match = _ASSET_RE.match(path.name)
        if not match:
            continue
        found.append(
            (
                f"{path.parent.name}/{match.group('name')}",
                match.group("version"),
            )
        )
    return sorted(found)


def test_assets_are_discovered():
    found = _every_asset()
    assert found, f"no prompt assets found under {PROMPTS_ROOT}"
    # Sanity: the Phase 2 assets must be present.
    names = {name for name, _ in found}
    assert "hooks/hook_generator" in names
    assert "studio/stage4_script" in names
    assert "voice/profile_summary" in names


@pytest.mark.parametrize("name,version", _every_asset())
def test_every_asset_loads_a_non_empty_template(name, version):
    """No shipped asset may load with an empty template.

    This is the exact defect: a loader/asset key mismatch produced an empty
    template, and an empty template renders to an empty prompt.
    """
    template = load_prompt(name, version)
    assert template.template.strip(), (
        f"prompt asset {name}@{version} loaded with an empty template; "
        "the asset body key and the loader's expected key disagree"
    )


@pytest.mark.parametrize("name,version", _every_asset())
def test_every_asset_loads(name, version):
    template = load_prompt(name, version)
    assert template.name
    assert template.version == version
    assert template.purpose


def test_legacy_prompt_key_is_aliased_to_template():
    """An asset authored with `prompt` must populate `template`."""
    from app.llm.prompts import _parse

    parsed = _parse({"name": "x", "prompt": "BODY TEXT"}, "x", "v1")
    assert parsed.template == "BODY TEXT"


def test_explicit_template_wins_over_legacy_prompt_key():
    from app.llm.prompts import _parse

    parsed = _parse(
        {"name": "x", "template": "TEMPLATE", "prompt": "PROMPT"}, "x", "v1"
    )
    assert parsed.template == "TEMPLATE"


def test_hook_asset_renders_real_instructions():
    """End-to-end: a Studio-adjacent asset produces a usable prompt."""
    system, user, variables = build_prompt(
        prompt_name="hooks/hook_generator",
        prompt_version="v1",
        input_data={
            "topic": "launching on a Tuesday",
            "niche": "creator economy",
            "target_audience": "solo founders",
            "voice_profile": {},
        },
        default_purpose="studio",
    )
    assert user.strip(), "rendered user prompt must not be empty"
    assert "launching on a Tuesday" in user
    assert "creator economy" in user


def test_studio_script_asset_renders():
    """Every declared variable is supplied and the body renders.

    Also pins the fact that the strict renderer rejects an asset using
    Handlebars syntax: `{{#each}}`/`{{this}}` cannot be expressed, and silently
    ignoring them would drop the examples section.
    """
    system, user, _ = build_prompt(
        prompt_name="studio/stage4_script",
        prompt_version="v1",
        input_data={
            "topic": "SaaS launch",
            "angle": "contrarian take on launch timing",
            "narrative": "launch, dip, recovery",
            "research": "no external sources",
            "target_format": "reel",
            "target_duration_seconds": 30,
            "voice_profile": {
                "tone_keywords": ["direct", "wry"],
                "sentence_style": "short",
                "forbidden_words": ["delve"],
            },
            "relevant_examples": "",
        },
        default_purpose="studio",
    )
    assert "SaaS launch" in user
    assert "contrarian take on launch timing" in user
    assert "30" in user
    # No unrendered template syntax survives.
    assert "{{" not in user


@pytest.mark.parametrize("name,version", _every_asset())
def test_no_asset_uses_handlebars_syntax(name, version):
    """The renderer is a strict `{{ name }}` substituter, not Handlebars.

    `{{#each}}` / `{{this}}` would either raise or silently drop content, so
    assets must express loops with a single pre-joined variable.
    """
    body = load_prompt(name, version).template
    for marker in ("{{#", "{{/", "{{this}}", "{{else}}"):
        assert marker not in body, (
            f"{name}@{version} uses Handlebars marker {marker!r}, which the "
            "platform renderer does not support"
        )


def test_missing_asset_raises():
    with pytest.raises(FileNotFoundError):
        load_prompt("studio/definitely_not_a_real_asset")


def test_render_rejects_unsupplied_variable():
    """Never silently substitute an empty string for a missing variable."""
    with pytest.raises(KeyError):
        render("Hello {{ missing }}", {"other": "x"})


def test_render_substitutes_and_json_encodes_non_strings():
    out = render("A={{ a }} B={{ b }}", {"a": "x", "b": {"k": 1}})
    assert "A=x" in out
    assert '"k": 1' in out


def test_list_prompts_reports_versioned_assets():
    listed = list_prompts()
    assert "hooks/hook_generator@v1" in listed
    assert all("@v" in item for item in listed)
