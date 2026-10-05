"""Studio output validation and hygiene.

Adapted from Module 03 (`realign_slots`), Module 01 (`clean_headline`, `clamp`),
Module 08 (`extract_json`/`parse_json`, `rank_candidates`/`heuristic_pick`) and
Module 18 (`validate_segments`, `validateHooksOutput`).

These helpers are what make a capability's contract hold even when the model
returns something odd. They are tested in isolation because the whole point is
that they absorb bad model output rather than propagate it.
"""
from __future__ import annotations

import json

import pytest

from app.studio.capabilities import validation


# --------------------------------------------------------------------------- #
# JSON salvage (Module 08)
# --------------------------------------------------------------------------- #

def test_extract_plain_json():
    assert validation.extract_json_object('{"a": 1}') == {"a": 1}


def test_extract_fenced_json():
    assert validation.extract_json_object('```json\n{"a": 1}\n```') == {"a": 1}


def test_extract_json_wrapped_in_prose():
    raw = 'Here are your ideas:\n{"ideas": [{"title": "x"}]}\nHope that helps!'
    assert validation.extract_json_object(raw)["ideas"][0]["title"] == "x"


def test_extract_json_from_bare_list_wraps_it():
    """A model that returns a top-level array still yields something usable."""
    assert validation.extract_json_object("[1, 2, 3]") == {"items": [1, 2, 3]}


def test_extract_json_rejects_unparseable():
    with pytest.raises(ValueError):
        validation.extract_json_object("no json at all")
    with pytest.raises(ValueError):
        validation.extract_json_object("")


def test_coerce_to_dict_variants():
    from pydantic import BaseModel

    class Sample(BaseModel):
        x: int = 1

    assert validation.coerce_to_dict({"a": 1}) == {"a": 1}
    assert validation.coerce_to_dict([1]) == {"items": [1]}
    assert validation.coerce_to_dict(Sample()) == {"x": 1}
    with pytest.raises(ValueError):
        validation.coerce_to_dict("a string")


# --------------------------------------------------------------------------- #
# Scalar clamping (Module 01)
# --------------------------------------------------------------------------- #

def test_clamp_bounds_and_falls_back():
    assert validation.clamp(5, 55, 98, 70) == 55
    assert validation.clamp(500, 55, 98, 70) == 98
    assert validation.clamp(70, 55, 98, 70) == 70
    assert validation.clamp("high", 55, 98, 70) == 70
    assert validation.clamp(None, 55, 98, 70) == 70
    assert validation.clamp(float("nan"), 55, 98, 70) == 70


def test_require_str_truncates_and_falls_back():
    assert validation.require_str("  hi  ", field="x") == "hi"
    assert validation.require_str("", field="x") == ""
    assert validation.require_str("", field="x", fallback="none") == "none"
    assert validation.require_str(None, field="x", fallback="none") == "none"
    assert len(validation.require_str("abcdef", field="x", max_length=3)) == 3


def test_coerce_enum_tolerates_morphology():
    assert validation.coerce_enum("More Casual", ("more_casual",), default="x") == "more_casual"
    assert validation.coerce_enum("more-casual", ("more_casual",), default="x") == "more_casual"
    assert validation.coerce_enum("nope", ("a", "b"), default="b") == "b"
    assert validation.coerce_enum(None, ("a",), default="a") == "a"


def test_as_list_caps():
    assert validation.as_list(None) == []
    assert validation.as_list("one") == ["one"]
    assert len(validation.as_list(list(range(50)), max_items=10)) == 10


# --------------------------------------------------------------------------- #
# Slot realignment (Module 03)
# --------------------------------------------------------------------------- #

STYLES = ("curiosity", "question", "contrarian")


def test_realign_uses_style_match_when_available():
    items = [
        {"style": "question", "text": "why?"},
        {"style": "curiosity", "text": "what if"},
        {"style": "contrarian", "text": "actually no"},
    ]
    aligned = validation.realign_slots(items, styles=STYLES)
    assert [entry["style"] for entry in aligned] == list(STYLES)
    assert aligned[0]["text"] == "what if"
    assert aligned[1]["text"] == "why?"


def test_realign_falls_back_to_position_then_placeholder():
    """The contract promises N items, so N items are always returned."""
    items = [{"style": "unknown", "text": "first thing"}]
    aligned = validation.realign_slots(items, styles=STYLES)

    assert len(aligned) == len(STYLES)
    assert aligned[0]["text"] == "first thing"          # positional adoption
    assert "pending" in aligned[1]["text"]               # placeholder
    assert "pending" in aligned[2]["text"]


def test_realign_of_nothing_yields_all_placeholders():
    aligned = validation.realign_slots([], styles=STYLES)
    assert len(aligned) == len(STYLES)
    assert all("pending" in entry["text"] for entry in aligned)


def test_realign_accepts_bare_strings():
    aligned = validation.realign_slots(["hook one", "hook two"], styles=("a", "b"))
    assert aligned[0]["text"] == "hook one"
    assert aligned[1]["text"] == "hook two"


def test_realign_does_not_duplicate_a_style():
    items = [
        {"style": "curiosity", "text": "first"},
        {"style": "curiosity", "text": "second"},
    ]
    aligned = validation.realign_slots(items, styles=STYLES)
    curiosity_texts = [e["text"] for e in aligned if e["style"] == "curiosity"]
    assert len(curiosity_texts) == 1


# --------------------------------------------------------------------------- #
# Hygiene (Module 01)
# --------------------------------------------------------------------------- #

def test_clean_headline_removes_ai_filler_emoji_and_em_dash():
    raw = "🚀 Let's delve into the game-changing realm — of content"
    cleaned = validation.clean_headline(raw)
    assert "delve into" not in cleaned.lower()
    assert "game-changing" not in cleaned.lower()
    assert "\U0001F680" not in cleaned
    assert "—" not in cleaned


def test_clean_headline_respects_max_chars_on_word_boundary():
    raw = "one two three four five six seven eight nine ten eleven twelve"
    cleaned = validation.clean_headline(raw, max_chars=20)
    assert len(cleaned) <= 20
    assert not cleaned.endswith((" ", ","))


def test_clean_headline_of_empty_is_empty():
    assert validation.clean_headline("") == ""
    assert validation.clean_headline(None) == ""


# --------------------------------------------------------------------------- #
# Ranking (Module 08)
# --------------------------------------------------------------------------- #

def test_score_caption_rewards_cta_hook_and_hashtags():
    good = (
        "Nobody tells you this about launching.\n\n"
        "I lost two weeks waiting to email my list.\n\n"
        "Save this for your next launch.\n\n#creators #launch"
    )
    bare = "Some thoughts about launching."
    assert validation.score_caption(good) > validation.score_caption(bare)


def test_score_caption_penalises_hashtag_spam():
    spam = "Save this. " + " ".join(f"#tag{i}" for i in range(20))
    tidy = "Save this. #creators #launch"
    assert validation.score_caption(tidy) > validation.score_caption(spam)


def test_score_caption_is_bounded():
    assert validation.score_caption("") == 0.0
    huge = "save this " * 200 + "#a #b #c #d #e " + "comment below " * 50
    assert 0.0 <= validation.score_caption(huge) <= 10.0


def test_rank_candidates_orders_and_labels():
    items = [
        {"full_text": "plain text"},
        {"full_text": "Save this before you launch. #creators"},
    ]
    ranked = validation.rank_candidates(items, text_key="full_text")
    assert ranked[0]["rank"] == 1
    assert ranked[1]["rank"] == 2
    assert ranked[0]["score"] >= ranked[1]["score"]


def test_rank_candidates_is_stable_on_ties():
    items = [{"full_text": "same"}, {"full_text": "same"}, {"full_text": "same"}]
    ranked = validation.rank_candidates(items, text_key="full_text")
    assert [item["rank"] for item in ranked] == [1, 2, 3]
    assert all(item["score"] == ranked[0]["score"] for item in ranked)


def test_rank_candidates_preserves_other_fields():
    items = [{"full_text": "Save this. #a", "hashtags": ["#a"], "cta": "save"}]
    ranked = validation.rank_candidates(items, text_key="full_text")
    assert ranked[0]["hashtags"] == ["#a"]
    assert ranked[0]["cta"] == "save"


# --------------------------------------------------------------------------- #
# Structural validation (Module 18)
# --------------------------------------------------------------------------- #

def _segment(role, text, start, end):
    return {"role": role, "text": text, "start_sec": start, "end_sec": end}


def test_validate_segments_accepts_a_well_formed_script():
    segments = [
        _segment("hook", "opening line", 0, 3),
        _segment("setup", "the problem", 3, 8),
        _segment("value", "the insight", 8, 15),
        _segment("cta", "follow me", 15, 18),
    ]
    assert validation.validate_segments(segments, expected_duration=18) == []


def test_validate_segments_requires_hook_first_and_cta_last():
    reversed_order = [
        _segment("setup", "wrong start", 0, 3),
        _segment("value", "middle", 3, 6),
        _segment("cta", "middle too", 6, 9),
    ]
    problems = validation.validate_segments(reversed_order)
    assert any("HOOK" in p for p in problems)

    missing_cta = [
        _segment("hook", "right start", 0, 3),
        _segment("value", "middle", 3, 6),
        _segment("payoff", "wrong end", 6, 9),
    ]
    problems = validation.validate_segments(missing_cta)
    assert any("CTA" in p for p in problems)


def test_validate_segments_requires_three_segments():
    problems = validation.validate_segments(
        [_segment("hook", "a", 0, 3), _segment("cta", "b", 3, 6)]
    )
    assert any("at least 3" in p for p in problems)


def test_validate_segments_flags_empty_text():
    segments = [
        _segment("hook", "", 0, 3),
        _segment("value", "ok", 3, 8),
        _segment("cta", "done", 8, 12),
    ]
    problems = validation.validate_segments(segments)
    assert any("empty text" in p for p in problems)


def test_validate_segments_flags_duration_mismatch():
    segments = [
        _segment("hook", "a", 0, 3),
        _segment("value", "b", 3, 8),
        _segment("cta", "c", 8, 20),
    ]
    problems = validation.validate_segments(segments, expected_duration=15)
    assert any("expected 15s" in p for p in problems)


def test_validate_segments_flags_non_numeric_end():
    segments = [
        {"role": "hook", "text": "a", "end_sec": "soon"},
        {"role": "value", "text": "b"},
        {"role": "cta", "text": "c"},
    ]
    problems = validation.validate_segments(segments, expected_duration=10)
    assert any("non-numeric" in p for p in problems)


def test_validate_unique_non_empty():
    assert validation.validate_unique_non_empty(
        ["a", "b", "c"], key="text", expected=3
    ) == []
    assert validation.validate_unique_non_empty(
        ["a", "a", "c"], key="text", expected=3
    )
    assert validation.validate_unique_non_empty(
        ["a", "", "c"], key="text"
    )
    assert validation.validate_unique_non_empty(
        ["a", "b"], key="text", expected=5
    )
