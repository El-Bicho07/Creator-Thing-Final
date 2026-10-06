"""Comment classification and content opportunities.

Covers the Module 10 taxonomy adapted onto platform enums, the Module 11 intent
weights and demand shape, duplicate detection, and the two donor behaviours that
were deliberately rejected:

- a silent fallback that returned plausible classifications after a provider error;
- unbounded batching of comments into one prompt.

No test here contacts a provider.
"""
from __future__ import annotations

import uuid

import pytest

from app.growth.comments import (
    HEURISTIC_CONFIDENCE,
    MAX_CONFIDENCE,
    CommentAnalyzer,
    classify_heuristic,
    content_hash,
    demand_score,
    extract_questions,
    normalize_demand,
    sentiment_for,
)
from app.growth.contracts import (
    INTENT_WEIGHTS,
    CommentCategory,
    CommentClassification,
    CommentIntent,
    ConfidenceBand,
    ConfidenceScore,
    ImpactLevel,
    InsightType,
    OpportunityOrigin,
)
from app.growth.opportunities import (
    DEMAND_INTENTS,
    OpportunityDetector,
    suggested_format,
    suggest_angle,
    topic_key,
)

USER = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")


# --------------------------------------------------------------------------- #
# Categories
# --------------------------------------------------------------------------- #


@pytest.mark.parametrize("text,expected", [
    ("Love this video so much", CommentCategory.THEME),
    ("How do I price my first sponsorship?", CommentCategory.OPPORTUNITY),
    ("Your app is broken and crashes on launch", CommentCategory.COMPLAINT),
    ("How do I start learning Python?", CommentCategory.QUESTION),
    ("Check out my site http://spam.example.com/buy-now-cheap", CommentCategory.SPAM),
    ("", CommentCategory.SPAM),
])
def test_category_classification(text, expected):
    category, _, _ = classify_heuristic(text)
    assert category is expected


def test_a_commercial_question_is_an_opportunity_before_a_question():
    """"How much do you charge" asks about money, not information."""
    category, intent, _ = classify_heuristic("How much do you charge for a video?")
    assert category is CommentCategory.OPPORTUNITY
    assert intent is CommentIntent.REQUEST


def test_a_request_containing_a_question_mark_is_still_a_request():
    category, intent, actionable = classify_heuristic(
        "Please make a tutorial on python? It would help a lot"
    )
    assert category is CommentCategory.QUESTION
    assert intent is CommentIntent.REQUEST
    assert actionable is True


# --------------------------------------------------------------------------- #
# Intents
# --------------------------------------------------------------------------- #


@pytest.mark.parametrize("text,intent", [
    ("Part 2 please!", CommentIntent.REQUEST),
    ("I keep getting stuck installing this", CommentIntent.PAIN_POINT),
    ("What does this library do?", CommentIntent.QUESTION),
    ("I'm so confused about the second step", CommentIntent.CONFUSION),
    ("More videos like this please", CommentIntent.MORE_OF_THIS),
    ("The audio is too quiet", CommentIntent.CRITICISM),
    ("This is so helpful, thank you!", CommentIntent.PRAISE),
    ("asdf", CommentIntent.OTHER),
])
def test_intent_classification(text, intent):
    _, detected, _ = classify_heuristic(text)
    assert detected is intent


def test_intent_weights_order_demand_above_praise():
    """The ordering Module 11 contributed: a request outranks general praise."""
    assert INTENT_WEIGHTS[CommentIntent.REQUEST] > INTENT_WEIGHTS[CommentIntent.PRAISE]
    assert INTENT_WEIGHTS[CommentIntent.PAIN_POINT] > INTENT_WEIGHTS[CommentIntent.OTHER]
    assert INTENT_WEIGHTS[CommentIntent.PRAISE] > INTENT_WEIGHTS[CommentIntent.OTHER]


def test_actionable_flag_marks_what_a_creator_can_do_something_about():
    _, _, actionable = classify_heuristic("How do I start learning Python?")
    assert actionable is True
    _, _, praise_actionable = classify_heuristic("Love this video, so helpful")
    assert praise_actionable is False


def test_spam_is_never_actionable_however_it_reads():
    category, _, actionable = classify_heuristic(
        "part 2 tutorial? https://a.example.com/x"
    )
    if category is CommentCategory.SPAM:
        assert actionable is False


def test_sentiment_is_implied_by_category_not_inferred():
    assert sentiment_for(CommentCategory.COMPLAINT) == "negative"
    assert sentiment_for(CommentCategory.QUESTION) == "neutral"
    assert sentiment_for(CommentCategory.SPAM) is None


# --------------------------------------------------------------------------- #
# Question extraction
# --------------------------------------------------------------------------- #


def test_questions_are_extracted_and_bounded():
    found = extract_questions(
        "What camera do you use? How much did it cost? Which lens? "
        "Is it worth it? Should I buy one?"
    )
    assert len(found) == 3, "question extraction must be bounded"
    assert found[0].startswith("What camera")


def test_statements_are_not_extracted_as_questions():
    assert extract_questions("This is a great video, thanks for sharing") == []


def test_an_empty_comment_yields_no_questions():
    assert extract_questions("") == []


# --------------------------------------------------------------------------- #
# Duplicate detection
# --------------------------------------------------------------------------- #


def test_content_hash_normalizes_case_and_whitespace():
    assert content_hash("Great post!!") == content_hash("  great   post ")


def test_different_text_hashes_differently():
    assert content_hash("great post") != content_hash("awful post")


# --------------------------------------------------------------------------- #
# The analyzer: declared baseline, never a silent fabrication
# --------------------------------------------------------------------------- #


@pytest.mark.asyncio
async def test_without_a_provider_the_heuristic_is_used_and_marked_degraded():
    """Module 10 returned plausible mock output after a provider error, silently.

    Here the heuristic is the declared baseline and `degraded=True` says so.
    """
    result = await CommentAnalyzer().analyze("c1", "How do I start learning Python?")
    assert result.category is CommentCategory.QUESTION
    assert result.heuristic_confidence == HEURISTIC_CONFIDENCE
    assert result.degraded is True


@pytest.mark.asyncio
async def test_a_valid_refinement_replaces_the_baseline():
    class FakeGateway:
        async def generate(self, request):
            class R:
                structured_output = {
                    "category": "question", "intent": "request",
                    "actionable": True, "summary": "Asks for a beginner guide",
                    "confidence": 0.9,
                }
            return R()

    result = await CommentAnalyzer(gateway=FakeGateway()).analyze(
        "c1", "How do I start learning Python?"
    )
    assert result.summary == "Asks for a beginner guide"
    assert result.degraded is False
    assert result.heuristic_confidence == 0.9


@pytest.mark.asyncio
async def test_an_unrecognised_label_from_the_model_is_discarded():
    class FakeGateway:
        async def generate(self, request):
            class R:
                structured_output = {"category": "sentiment_analysis",
                                     "intent": "question", "actionable": True}
            return R()

    result = await CommentAnalyzer(gateway=FakeGateway()).analyze(
        "c1", "How do I start learning Python?"
    )
    assert result.category is CommentCategory.QUESTION, "invalid label must not win"
    assert result.degraded is True


@pytest.mark.asyncio
async def test_a_provider_exception_degrades_instead_of_raising():
    class BrokenGateway:
        async def generate(self, request):
            raise TimeoutError("upstream unavailable")

    result = await CommentAnalyzer(gateway=BrokenGateway()).analyze(
        "c1", "How do I start learning Python?"
    )
    assert result.degraded is True
    assert result.category is CommentCategory.QUESTION


@pytest.mark.asyncio
async def test_confidence_can_never_exceed_the_ceiling():
    class OverconfidentGateway:
        async def generate(self, request):
            class R:
                structured_output = {"category": "question", "intent": "question",
                                     "actionable": True, "confidence": 0.999999}
            return R()

    result = await CommentAnalyzer(gateway=OverconfidentGateway()).analyze(
        "c1", "What is this?"
    )
    assert result.heuristic_confidence <= MAX_CONFIDENCE


@pytest.mark.asyncio
async def test_the_model_cannot_unspam_a_comment():
    class UnspamGateway:
        async def generate(self, request):
            class R:
                structured_output = {"category": "opportunity", "intent": "request",
                                     "actionable": True, "confidence": 0.99}
            return R()

    result = await CommentAnalyzer(gateway=UnspamGateway()).analyze(
        "c1", "https://spam.example.com/buy-now https://spam.example.com/cheap"
    )
    assert result.category is CommentCategory.SPAM, (
        "spam is a deterministic verdict the model cannot overturn"
    )
    assert result.actionable is False


@pytest.mark.asyncio
async def test_one_bad_comment_does_not_fail_a_batch():
    class BrokenGateway:
        async def generate(self, request):
            raise RuntimeError("boom")

    analyzer = CommentAnalyzer(gateway=BrokenGateway())
    results = await analyzer.analyze_batch([("c1", "How?"), ("c2", "Love it")])
    assert len(results) == 2
    assert all(r.degraded for r in results)


# --------------------------------------------------------------------------- #
# Demand scoring (Module 11 shape, signals that exist)
# --------------------------------------------------------------------------- #


def test_demand_score_is_zero_without_commenters():
    assert demand_score(unique_commenters=0, weighted_intent_sum=5) == 0.0


def test_demand_prefers_unique_commenters_over_raw_volume():
    """One loud account repeating itself is not a trend."""
    many_repeats = demand_score(unique_commenters=1, weighted_intent_sum=2.6)
    few_unique = demand_score(unique_commenters=5, weighted_intent_sum=2.6)
    assert few_unique > many_repeats


def test_demand_rises_with_intent_weight():
    low = demand_score(unique_commenters=4, weighted_intent_sum=INTENT_WEIGHTS[CommentIntent.PRAISE])
    high = demand_score(unique_commenters=4, weighted_intent_sum=INTENT_WEIGHTS[CommentIntent.REQUEST])
    assert high > low


def test_normalized_demand_never_reaches_zero_or_a_hundred():
    scores = [1.0, 5.0, 9.0, 20.0]
    normalized = normalize_demand(scores)
    assert all(45.0 <= s <= 99.0 for s in normalized)
    assert max(normalized) == pytest.approx(99.0, abs=1e-3)


def test_identical_scores_produce_no_spurious_ranking():
    assert normalize_demand([4.0, 4.0, 4.0]) == [45.0, 45.0, 45.0]


# --------------------------------------------------------------------------- #
# Grouping and opportunities
# --------------------------------------------------------------------------- #


def test_topic_key_drops_stopwords_and_noise():
    key = topic_key("How do I start learning Python?")
    assert "python" in key
    assert "how" not in key.split()
    assert "i" not in key.split()


def test_praise_does_not_ask_for_new_content():
    assert CommentIntent.PRAISE not in DEMAND_INTENTS


def test_format_is_inferred_from_the_audiences_own_words():
    assert suggested_format(["please make a step by step tutorial"]) == "tutorial"
    assert suggested_format(["what is the difference between them"]) == "explainer"
    assert suggested_format(["what mistakes should I avoid"]) == "mistakes"
    assert suggested_format(["no keywords here"]) == "reel"


def _classification(text, intent=CommentIntent.REQUEST, comment_id="c1"):
    return CommentClassification(
        comment_id=comment_id, text=text, category=CommentCategory.QUESTION,
        intent=intent, heuristic_confidence=0.6, actionable=True,
        extracted_questions=extract_questions(text),
    )


def test_opportunities_are_grouped_and_ranked():
    detector = OpportunityDetector(USER)
    opportunities = detector.detect([
        _classification("How do I start learning Python from zero?", comment_id="a1"),
        _classification("Please make a python tutorial for beginners", comment_id="a2"),
        _classification("Any python course recommendations?", comment_id="a3"),
        _classification("Love this video so much", intent=CommentIntent.PRAISE,
                        comment_id="b1"),
    ])
    assert opportunities, "questions must become opportunities"
    assert opportunities[0].demand_score >= opportunities[-1].demand_score
    assert opportunities[0].origin is OpportunityOrigin.COMMENT
    assert opportunities[0].source_comment_ids, (
        "an opportunity must trace back to the comments that produced it"
    )


def test_praise_alone_produces_no_opportunity():
    detector = OpportunityDetector(USER)
    assert detector.detect([
        _classification("Love this video", intent=CommentIntent.PRAISE)
    ]) == []


def test_opportunity_records_how_demand_was_computed():
    detector = OpportunityDetector(USER)
    opportunities = detector.detect([
        _classification("How do I start python?", comment_id="a1"),
        _classification("How do I start python really?", comment_id="a2"),
    ])
    evidence = opportunities[0].evidence
    assert "computation" in evidence
    assert "unique_commenters ** 0.85" in evidence["computation"]
    assert "normalization" in evidence


def test_an_opportunity_states_a_topic_format_and_angle_but_no_content():
    """Phase 5 produces the upstream contract only; Studio creates."""
    detector = OpportunityDetector(USER)
    opportunity = detector.detect([
        _classification("How do I start learning Python?", comment_id="a1")
    ])[0]
    assert opportunity.title
    assert opportunity.angle
    assert opportunity.target_format
    # It must not contain finished content.
    blob = f"{opportunity.title} {opportunity.angle}".lower()
    for generated in ("caption", "hashtag", "hook:", "#", "slide 1"):
        assert generated not in blob


def test_angle_quotes_the_question_verbatim():
    detector = OpportunityDetector(USER)
    opportunity = detector.detect([
        _classification("How do I start learning Python?", comment_id="a1")
    ])[0]
    assert "How do I start learning Python?" in opportunity.angle


def test_no_comments_produce_no_opportunities():
    assert OpportunityDetector(USER).detect([]) == []


def test_performance_insight_becomes_an_opportunity():
    from app.growth.contracts import ConfidenceScore, Insight

    insight = Insight(
        user_id=USER, insight_type=InsightType.CONTENT_PATTERN, title="A beat B",
        summary="s", evidence={"metric": "engagement_rate", "platform": "reel"},
        source_records=["a1"],
        confidence=ConfidenceScore(score=0.8, band=ConfidenceBand.HIGH),
        impact=ImpactLevel.HIGH, rule_key="pattern:above_baseline",
    )
    opportunity = OpportunityDetector.from_insight(insight)
    assert opportunity.origin is OpportunityOrigin.PERFORMANCE
    assert opportunity.target_format == "reel"
    assert "engagement_rate" in str(opportunity.evidence)
