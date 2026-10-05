"""Creator Voice Engine unit tests (deterministic analysis path)."""
import pytest

from app.voice import aggregate_profile, extract_features, validate_voice_match
from app.voice.engine import TONE_AXES, VoiceProfile

SAMPLES = [
    "Most creators burn out because they optimise for output instead of recovery. "
    "Here is the fix that actually worked for me. 🚀\n\n"
    "I batch on Sundays. Twelve pieces, zero weekday burnout.\n\nWhat do you think?",
    "You do not need more discipline. You need a system that survives a bad week.\n\n"
    "1. Batch on Sunday.\n2. Ship one thing.\n3. Sleep.\n\nComment below if this helped.",
    "I tried the batch week thing and it changed everything honestly. Twelve pieces in "
    "one day, then nothing the rest of the week. My weekday headspace was the fix.",
]

FORMAL = (
    "Quarterly compliance attestation for the registrant entity shall be submitted "
    "without delay. The aforementioned documentation is mandatory pursuant to clause "
    "seven of the schedule, and any deviation must be reported to the administrator."
)


# --------------------------------------------------------------------------- #
# Feature extraction
# --------------------------------------------------------------------------- #

def test_features_on_empty_text():
    """Empty text must not divide by zero and must report a self-consistent count."""
    f = extract_features("")
    assert f.word_count == 0
    assert f.sentence_count >= 1
    assert f.avg_sentence_length == 0.0


def test_avg_sentence_length_is_consistent_with_counts():
    f = extract_features("One two three. Four five.")
    assert f.avg_sentence_length == pytest.approx(
        f.word_count / f.sentence_count, abs=1e-3)


def test_features_count_words_and_sentences():
    f = extract_features("One two three. Four five. Six.")
    assert f.word_count == 6
    assert f.sentence_count == 3
    assert f.avg_sentence_length == pytest.approx(2.0)


def test_features_detect_emoji():
    assert extract_features("fire 🔥🚀 emoji").emoji_count >= 1


def test_features_detect_hashtags():
    assert extract_features("tag #creator and #systems").hashtag_count == 2


def test_features_detect_pronouns():
    f = extract_features("I think you should try my method with our team.")
    assert f.first_person_ratio > 0
    assert f.second_person_ratio > 0


def test_features_detect_questions_and_exclamations():
    f = extract_features("Really? Yes! Great? Wow!")
    assert f.question_count == 2
    assert f.exclamation_count == 2


def test_educational_keywords_raise_score():
    plain = extract_features("I made a video about it.")
    teaching = extract_features("Here is how to do it, step by step, and why it works.")
    assert teaching.educational_score > plain.educational_score


def test_tone_scores_are_bounded():
    f = extract_features("BUY NOW!!! SALE!!! OFFER!!! " * 20)
    for axis in TONE_AXES:
        score = getattr(f, f"{axis}_score")
        assert 0.0 <= score <= 1.0


# --------------------------------------------------------------------------- #
# Aggregation
# --------------------------------------------------------------------------- #

def test_aggregate_empty_samples():
    profile = aggregate_profile([])
    assert profile.sample_count == 0 and profile.confidence == 0.0


def test_aggregate_blank_samples_ignored():
    profile = aggregate_profile(["", "   ", None])
    assert profile.sample_count == 0


def test_aggregate_produces_all_tone_axes():
    profile = aggregate_profile(SAMPLES)
    assert set(profile.tone_fingerprint) == set(TONE_AXES)


def test_confidence_grows_with_samples():
    low = aggregate_profile(SAMPLES[:1])
    high = aggregate_profile(SAMPLES * 3)
    assert high.confidence > low.confidence


def test_confidence_saturates_at_one():
    assert aggregate_profile(SAMPLES * 10).confidence == 1.0


def test_forbidden_words_default_empty():
    """Must NOT be auto-derived from frequent words (that produced nonsense
    violations like "contains flagged vocabulary: 'the'")."""
    profile = aggregate_profile(SAMPLES)
    assert profile.forbidden_words == []


def test_explicit_forbidden_words_are_used():
    profile = aggregate_profile(SAMPLES, forbidden_words=["Burnout", "spam", "SPAM"])
    assert profile.forbidden_words == ["burnout", "spam"]


def test_top_keywords_exclude_short_words():
    profile = aggregate_profile(SAMPLES)
    assert all(len(k) > 2 for k in profile.vocabulary_patterns["top_keywords"])


def test_vocabulary_richness_in_range():
    profile = aggregate_profile(SAMPLES)
    assert 0.0 <= profile.vocabulary_patterns["vocabulary_richness"] <= 1.0


def test_short_sentences_rule_detected():
    profile = aggregate_profile(SAMPLES)
    assert "short_sentences" in profile.formatting_rules


# --------------------------------------------------------------------------- #
# Voice match
# --------------------------------------------------------------------------- #

def test_on_style_draft_scores_high():
    profile = aggregate_profile(SAMPLES)
    match = validate_voice_match(SAMPLES[0], profile)
    assert match.verdict == "strong_match"
    assert match.overall_score > 0.75


def test_off_style_draft_scores_lower():
    profile = aggregate_profile(SAMPLES)
    on = validate_voice_match(SAMPLES[1], profile).overall_score
    off = validate_voice_match(FORMAL, profile).overall_score
    assert on > off


def test_forbidden_word_triggers_violation():
    profile = aggregate_profile(SAMPLES, forbidden_words=["burnout"])
    match = validate_voice_match(
        "My burnout was solved by batching on Sunday afternoons for everyone.", profile)
    assert any("burnout" in v for v in match.rule_violations)


def test_tone_delta_reported_per_axis():
    profile = aggregate_profile(SAMPLES)
    match = validate_voice_match(FORMAL, profile)
    assert set(match.tone_delta) == set(TONE_AXES)


def test_empty_profile_yields_weak_match():
    match = validate_voice_match("anything", VoiceProfile())
    assert match.verdict in ("weak_match", "partial_match")


def test_match_score_bounded():
    profile = aggregate_profile(SAMPLES)
    for draft in ("", "x", SAMPLERS := SAMPLES[0] * 3):
        score = validate_voice_match(draft, profile).overall_score
        assert 0.0 <= score <= 1.0