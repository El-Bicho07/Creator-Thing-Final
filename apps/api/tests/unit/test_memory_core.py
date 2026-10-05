"""Memory chunking, write policy and Memory Engine unit tests."""
import pytest

from app.memory.chunking import chunk_text
from app.memory.policy import DURABLE_CATEGORIES, evaluate, redact
from app.memory.schemas import MemoryCategory, MemoryQuery, IngestRequest


# --------------------------------------------------------------------------- #
# Chunking
# --------------------------------------------------------------------------- #

def approx_counter(text: str) -> int:
    return max(1, len(text) // 4)


def test_empty_text_yields_no_chunks():
    assert chunk_text("", approx_counter) == []
    assert chunk_text("   \n\n  ", approx_counter) == []


def test_short_text_is_one_chunk():
    assert chunk_text("a short note", approx_counter) == ["a short note"]


def test_long_text_is_split():
    text = "\n\n".join(f"Paragraph {i} with some reasonable amount of content in it."
                       for i in range(80))
    chunks = chunk_text(text, approx_counter, target_tokens=60, max_tokens=120)
    assert len(chunks) > 1
    assert all(c.strip() for c in chunks)


def test_chunks_respect_token_budget():
    text = " ".join(["word"] * 3000)
    chunks = chunk_text(text, approx_counter, target_tokens=100, max_tokens=200)
    assert chunks
    for chunk in chunks:
        assert approx_counter(chunk) <= 200 * 1.2


def test_oversized_single_sentence_is_hard_wrapped():
    text = "word " * 3000
    chunks = chunk_text(text, approx_counter, target_tokens=100, max_tokens=200)
    assert len(chunks) > 1


def test_overlap_creates_shared_content():
    text = "\n\n".join(
        f"Sentence number {i} carrying a distinct idea about batching content."
        for i in range(30)
    )
    plain = chunk_text(text, approx_counter, target_tokens=60, max_tokens=120,
                       overlap_tokens=0)
    overlapped = chunk_text(text, approx_counter, target_tokens=60, max_tokens=120,
                            overlap_tokens=30)
    assert len(plain) == len(overlapped)
    assert overlapped[1] != plain[1]
    assert len(overlapped[1]) > len(plain[1])


def test_content_is_preserved_across_chunks():
    text = "\n\n".join(f"Distinctive marker number {i} appears here." for i in range(20))
    chunks = chunk_text(text, approx_counter, target_tokens=50, max_tokens=100)
    joined = " ".join(chunks)
    for i in (0, 7, 19):
        assert f"marker number {i}" in joined


def test_unicode_preserved():
    text = "\n\n".join(["தமிழ் உள்ளடக்கம் இங்கே உள்ளது"] * 40)
    chunks = chunk_text(text, approx_counter, target_tokens=40, max_tokens=80)
    assert any("தமிழ்" in c for c in chunks)


def test_whitespace_normalised():
    chunks = chunk_text("a   b\t\tc\n\n\n\nd", approx_counter)
    assert chunks == ["a b c\n\nd"]


# --------------------------------------------------------------------------- #
# Write policy
# --------------------------------------------------------------------------- #

def test_durable_content_persists():
    decision = evaluate(
        "I pre-warm my email list 48 hours before every product launch.",
        MemoryCategory.LESSON,
    )
    assert decision.should_persist
    assert decision


def test_empty_content_rejected():
    assert not evaluate("", MemoryCategory.FACT).should_persist


def test_short_content_rejected_without_explicit_request():
    assert not evaluate("too short", MemoryCategory.FACT).should_persist


def test_short_content_allowed_when_explicitly_requested():
    decision = evaluate("buy milk", MemoryCategory.FACT, explicit_user_request=True)
    assert decision.should_persist


@pytest.mark.parametrize("filler", [
    "Let me know if you want me to expand this section further",
    "Here is a draft you can adapt",
    "As an AI I cannot access external links",
])
def test_transient_filler_rejected(filler):
    decision = evaluate(filler + " and some extra text to pass the length gate",
                        MemoryCategory.FACT)
    assert not decision.should_persist
    assert any("transient" in r for r in decision.reasons)


@pytest.mark.parametrize("secret", [
    "my key is sk-abcdef1234567890abcdef ok",
    "token Bearer eyJhbGciOiJIUzI1NiJ9.abc",
    "GEMINI_API_KEY=AIzaSyA1234567890abcdefghij",
])
def test_secrets_redacted_before_storage(secret):
    cleaned, removed = redact(secret)
    assert "[redacted:" in cleaned
    assert removed


def test_pii_redacted():
    cleaned, removed = redact("reach me at dev@example.com about it")
    assert "dev@example.com" not in cleaned
    assert "email" in removed


def test_redaction_happens_even_for_explicit_request():
    """An explicit request must never bypass redaction."""
    decision = evaluate(
        "my api key is sk-abcdef1234567890abcdef keep it safe",
        MemoryCategory.FACT, explicit_user_request=True,
    )
    assert decision.redacted
    assert "sk-abcdef" in decision.reasons[0] or "redacted" in decision.reasons[0]


def test_all_declared_categories_are_durable():
    assert set(DURABLE_CATEGORIES) == set(MemoryCategory)


def test_secrets_never_reach_chunk_text_via_policy():
    """Whatever the policy decides, the secret itself must not survive redaction."""
    text = "The deployment key sk-abcdef1234567890abcdef must be rotated soon please"
    decision = evaluate(text, MemoryCategory.FACT)
    assert decision.redacted
    assert "sk-abcdef1234567890abcdef" not in redact(text)[0]


# --------------------------------------------------------------------------- #
# Schemas
# --------------------------------------------------------------------------- #

def test_memory_query_top_k_bounds():
    with pytest.raises(ValueError):
        MemoryQuery(query="x", top_k=0)
    with pytest.raises(ValueError):
        MemoryQuery(query="x", top_k=101)


def test_memory_query_requires_text():
    with pytest.raises(ValueError):
        MemoryQuery(query="")


def test_ingest_request_requires_text_and_title():
    with pytest.raises(ValueError):
        IngestRequest(title="", raw_text="x")
    with pytest.raises(ValueError):
        IngestRequest(title="x", raw_text="")


def test_memory_query_min_score_bounds():
    with pytest.raises(ValueError):
        MemoryQuery(query="x", min_score=2.0)