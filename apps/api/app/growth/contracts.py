"""Growth domain contracts.

Phase 5 implements the "Learn" step of the product loop:

    performance -> analysis -> insight -> copilot -> recommendation -> Today -> Studio

The single most important rule in this module is that **the model never computes a
number and never decides how confident we are.** Every figure in this file is
produced by deterministic application code, and the AI layer may only *explain*
what deterministic code already established.

Boundaries this module enforces by construction:

- No provider SDK, no embedding import, no `chunks` SQL.
- Performance data is read here and written only through `GrowthService`.
- `PerformanceMetric` names exactly the metrics the platform can hold. Anything
  else is `UNAVAILABLE`, never a fabricated zero.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import date, datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

# --------------------------------------------------------------------------- #
# Metrics
# --------------------------------------------------------------------------- #


class PerformanceMetric(str, Enum):
    """The metrics the platform actually holds.

    `performance_records` has exactly four numeric columns: `views`, `likes`,
    `comments_count`, `shares`. Everything else a creator might care about --
    watch time, retention, reach, clicks, saves, follower delta -- is **not**
    collected by this platform and must never appear in output as if it were.

    Naming them explicitly (rather than silently omitting them) means a Copilot
    answer can say "retention is not tracked here" instead of quietly implying a
    number.
    """

    VIEWS = "views"
    LIKES = "likes"
    COMMENTS = "comments_count"
    SHARES = "shares"

    @property
    def label(self) -> str:
        return {
            PerformanceMetric.VIEWS: "views",
            PerformanceMetric.LIKES: "likes",
            PerformanceMetric.COMMENTS: "comments",
            PerformanceMetric.SHARES: "shares",
        }[self]


#: Metrics the platform does NOT collect. Recorded so absence is explicit.
UNSUPPORTED_METRICS: tuple[str, ...] = (
    "watch_time", "retention", "reach", "impressions", "clicks", "saves",
    "follower_delta", "impressions_per_reach",
)

#: Engagement = likes + comments + shares. Views are reach, not engagement.
ENGAGEMENT_METRICS: tuple[PerformanceMetric, ...] = (
    PerformanceMetric.LIKES,
    PerformanceMetric.COMMENTS,
    PerformanceMetric.SHARES,
)


class MetricAvailability(str, Enum):
    """Whether a metric can be used for a given record or window."""

    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"


class ConfidenceBand(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ImpactLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


# --------------------------------------------------------------------------- #
# Insights
# --------------------------------------------------------------------------- #


class InsightType(str, Enum):
    """A small, closed vocabulary.

    Deliberately six. Every additional type would need its own deterministic rule,
    its own tests, and its own threshold justification; a taxonomy nobody can
    explain to a creator is not a taxonomy.
    """

    PERFORMANCE_TREND = "performance_trend"
    CONTENT_PATTERN = "content_pattern"
    AUDIENCE_SIGNAL = "audience_signal"
    UNDERPERFORMING_PATTERN = "underperforming_pattern"
    OPPORTUNITY = "opportunity"
    EXPERIMENT_RESULT = "experiment_result"


@dataclass(frozen=True)
class Evidence:
    """One supporting fact, resolvable to a real record.

    An insight is only allowed to exist if it carries evidence, so this is not
    optional anywhere in the domain.
    """

    #: Table the record lives in: performance_records | comments | ideas |
    #: comment_insights | experiments
    table: str
    record_id: str
    metric: Optional[str] = None
    value: Optional[float] = None
    label: Optional[str] = None

    def as_dict(self) -> Dict[str, Any]:
        return {
            "table": self.table,
            "record_id": self.record_id,
            "metric": self.metric,
            "value": self.value,
            "label": self.label,
        }


@dataclass(frozen=True)
class ConfidenceScore:
    """Deterministic confidence, with its reasons.

    The score is computed from sample size, consistency, recency and data
    completeness. The LLM may explain this in prose; it may never assign or adjust
    the number.
    """

    score: float
    band: ConfidenceBand
    reasons: List[str] = field(default_factory=list)
    factors: Dict[str, float] = field(default_factory=dict)


@dataclass
class Insight:
    """A cross-record claim with evidence, confidence, and invalidation state."""

    user_id: uuid.UUID
    insight_type: InsightType
    title: str
    summary: str
    evidence: Dict[str, Any]
    source_records: List[str]
    confidence: ConfidenceScore
    impact: ImpactLevel
    rule_key: str
    recommended_action: Optional[str] = None
    source_fingerprint: Optional[str] = None
    is_stale: bool = False
    window_start: Optional[datetime] = None
    window_end: Optional[datetime] = None
    id: Optional[uuid.UUID] = None
    created_at: Optional[datetime] = None


# --------------------------------------------------------------------------- #
# Comment analysis (Module 10 ADAPT)
# --------------------------------------------------------------------------- #


class CommentCategory(str, Enum):
    """Adapted from Module 10's four-category taxonomy.

    Module 10 used free-text strings ("Theme", "Question", "Complaint",
    "Opportunity"). These are platform enums so they can be validated, indexed,
    and counted deterministically.
    """

    THEME = "theme"            # general reaction, praise, opinion
    QUESTION = "question"      # asks for information or a how-to
    COMPLAINT = "complaint"    # dissatisfaction, a problem to fix
    OPPORTUNITY = "opportunity"  # partnership, buying intent, business lead
    SPAM = "spam"              # noise, not a real audience signal


class CommentIntent(str, Enum):
    """Adapted from Module 11's intent taxonomy.

    Module 11's insight was the *ordering*: an explicit request for follow-up
    content outranks general praise. The weights are re-derived here from signals
    the platform actually has.
    """

    REQUEST = "request"
    PAIN_POINT = "pain_point"
    QUESTION = "question"
    CONFUSION = "confusion"
    MORE_OF_THIS = "more_of_this"
    CRITICISM = "criticism"
    PRAISE = "praise"
    OTHER = "other"


#: Intent weights, adapted from Module 11 `pipeline/score.py`.
#:
#: Module 11 also weighted comment likes, reply counts and friend @-mentions.
#: The platform's `comments` table has none of those columns, so those signals
#: are excluded rather than replaced with invented values (task section 9).
INTENT_WEIGHTS: Dict[CommentIntent, float] = {
    CommentIntent.REQUEST: 2.6,
    CommentIntent.PAIN_POINT: 2.3,
    CommentIntent.QUESTION: 2.1,
    CommentIntent.CONFUSION: 1.8,
    CommentIntent.MORE_OF_THIS: 1.5,
    CommentIntent.CRITICISM: 1.0,
    CommentIntent.PRAISE: 0.5,
    CommentIntent.OTHER: 0.3,
}


@dataclass
class CommentClassification:
    """One comment's structured analysis."""

    comment_id: str
    text: str
    category: CommentCategory
    intent: CommentIntent
    #: Deterministic, from the keyword heuristic only. The model may refine the
    #: label but may not raise this.
    heuristic_confidence: float
    actionable: bool
    extracted_questions: List[str] = field(default_factory=list)
    summary: Optional[str] = None
    #: Set when the platform ran without a usable provider.
    degraded: bool = False


# --------------------------------------------------------------------------- #
# Content opportunities (Module 11 ADAPT)
# --------------------------------------------------------------------------- #


class OpportunityOrigin(str, Enum):
    COMMENT = "comment"
    PERFORMANCE = "performance"
    EXPERIMENT = "experiment"
    MANUAL = "manual"


@dataclass
class ContentOpportunity:
    """A structured opportunity -- never finished content.

    Module 11's `pipeline/ideas.py` generated hooks, captions, hashtags and reel
    blueprints. That is Studio's job (Phase 3). Phase 5 produces only the
    upstream contract: topic, format, angle, demand, evidence.
    """

    title: str
    angle: str
    target_format: str
    demand_score: float
    origin: OpportunityOrigin
    evidence: Dict[str, Any]
    source_comment_ids: List[str] = field(default_factory=list)
    insight_id: Optional[uuid.UUID] = None


# --------------------------------------------------------------------------- #
# Experiments
# --------------------------------------------------------------------------- #


class ExperimentStatus(str, Enum):
    PLANNED = "planned"
    RUNNING = "running"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class ExperimentVerdict(str, Enum):
    SUPPORTED = "supported"
    NOT_SUPPORTED = "not_supported"
    INCONCLUSIVE = "inconclusive"


# --------------------------------------------------------------------------- #
# Analysis results (deterministic)
# --------------------------------------------------------------------------- #


@dataclass
class PerformanceSnapshot:
    """One performance record, normalized.

    `metrics` holds only metrics that were actually measured. A metric the
    creator never recorded is absent from the dict -- not present with a zero.
    """

    record_id: str
    asset_id: Optional[str]
    asset_title: Optional[str]
    platform: str
    published_at: Optional[datetime]
    recorded_at: datetime
    metrics: Dict[PerformanceMetric, int]
    unavailable: List[PerformanceMetric] = field(default_factory=list)

    def value(self, metric: PerformanceMetric) -> Optional[int]:
        return self.metrics.get(metric)


@dataclass
class MetricSummary:
    """Deterministic aggregation over a set of snapshots."""

    metric: PerformanceMetric
    total: int
    average: float
    median: float
    minimum: int
    maximum: int
    sample_size: int

    def as_dict(self) -> Dict[str, Any]:
        return {
            "metric": self.metric.value,
            "total": self.total,
            "average": round(self.average, 4),
            "median": round(self.median, 4),
            "min": self.minimum,
            "max": self.maximum,
            "sample_size": self.sample_size,
        }


@dataclass
class TrendResult:
    """Direction of a metric between two windows. Computed, never generated."""

    metric: PerformanceMetric
    current: float
    previous: float
    #: None when the previous window has no data -- a percentage change from
    #: nothing is a fabrication, not an infinity.
    change_pct: Optional[float]
    direction: str          # up | down | flat | unknown
    current_sample: int
    previous_sample: int
    has_enough_data: bool = True


@dataclass
class ContentRanking:
    """One content asset's performance relative to the creator's own baseline."""

    asset_id: Optional[str]
    title: str
    platform: str
    engagement_rate: Optional[float]
    views: Optional[int]
    engagement_total: int
    #: Ratio against the creator's median engagement rate for the window.
    vs_baseline_ratio: Optional[float]
    rank: int = 0


@dataclass
class PerformanceAnalysis:
    """Everything the deterministic layer established.

    This object is the ONLY source of numbers the Copilot is allowed to speak
    about. It is serialized into the prompt, and `copilot.py` validates model
    output against it.
    """

    window_start: datetime
    window_end: datetime
    record_count: int
    available_metrics: List[PerformanceMetric] = field(default_factory=list)
    unavailable_metrics: List[PerformanceMetric] = field(default_factory=list)
    unsupported_metrics: List[str] = field(default_factory=list)
    summaries: Dict[PerformanceMetric, MetricSummary] = field(default_factory=dict)
    trends: List[TrendResult] = field(default_factory=list)
    ranking: List[ContentRanking] = field(default_factory=list)
    median_engagement_rate: Optional[float] = None
    engagement_rates: List[float] = field(default_factory=list)
    #: Deterministic reasons the analysis is thin, when it is.
    data_gaps: List[str] = field(default_factory=list)

    @property
    def is_actionable(self) -> bool:
        return bool(self.record_count >= MIN_RECORDS_FOR_INSIGHT)

    def numbers(self) -> set[str]:
        """Every numeric token the Copilot may legitimately emit.

        Built by walking the analysis. Used by the no-fabrication gate.
        """
        tokens: set[str] = set()

        def add(value: float | int | None) -> None:
            if value is None:
                return
            tokens.add(_format_number(float(value)))
            tokens.add(str(int(value)) if float(value).is_integer() else "")

        for summary in self.summaries.values():
            add(summary.total); add(summary.average); add(summary.median)
            add(summary.minimum); add(summary.maximum); add(summary.sample_size)
        for trend in self.trends:
            add(trend.current); add(trend.previous); add(trend.change_pct)
            add(trend.current_sample); add(trend.previous_sample)
        for row in self.ranking:
            add(row.engagement_rate); add(row.views); add(row.engagement_total)
            add(row.vs_baseline_ratio)
        add(self.median_engagement_rate)
        add(self.record_count)
        return {t for t in tokens if t}


def _format_number(value: float) -> str:
    """Canonical rendering so `5.30`, `5.3` and `5.3%` compare correctly."""
    if value.is_integer():
        return str(int(value))
    return f"{value:.2f}".rstrip("0").rstrip(".")


#: Minimum records before the deterministic layer will claim a trend.
#:
#: Below this, an apparent "27% increase" is noise from two posts. Saying so is
#: more useful to a creator than a confident wrong number.
MIN_RECORDS_FOR_INSIGHT = 3

#: Minimum records before a percentage change is reported at all.
MIN_RECORDS_FOR_TREND = 2


# --------------------------------------------------------------------------- #
# Wire contracts (API)
# --------------------------------------------------------------------------- #


class MetricValue(BaseModel):
    metric: str
    value: Optional[float] = None
    available: bool = True
    unit: Optional[str] = None


class EvidenceItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    table: str
    record_id: str
    metric: Optional[str] = None
    value: Optional[float] = None
    label: Optional[str] = None


class ConfidenceResponse(BaseModel):
    score: float
    band: ConfidenceBand
    reasons: List[str] = Field(default_factory=list)
    factors: Dict[str, float] = Field(default_factory=dict)


class InsightResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    insight_type: InsightType
    title: str
    summary: str
    evidence: Dict[str, Any] = Field(default_factory=dict)
    source_records: List[str] = Field(default_factory=list)
    confidence: ConfidenceResponse
    impact: ImpactLevel
    rule_key: str
    recommended_action: Optional[str] = None
    is_stale: bool = False
    window_start: Optional[datetime] = None
    window_end: Optional[datetime] = None
    created_at: Optional[datetime] = None


class OpportunityResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    title: str
    angle: str
    target_format: str
    demand_score: Optional[float] = None
    origin: OpportunityOrigin
    status: str = "backlog"
    evidence: Dict[str, Any] = Field(default_factory=dict)
    source_comment_ids: List[str] = Field(default_factory=list)
    insight_id: Optional[str] = None


class CommentResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    asset_id: Optional[str] = None
    comment_text: str
    author_hash: Optional[str] = None
    posted_at: Optional[datetime] = None
    category: Optional[CommentCategory] = None
    intent: Optional[CommentIntent] = None
    actionable: bool = False
    sentiment: Optional[str] = None
    summary: Optional[str] = None
    analyzed_at: Optional[datetime] = None


class CommentInsightResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    category: Optional[str] = None
    summary: str
    extracted_questions: List[str] = Field(default_factory=list)
    actionable_idea: Optional[str] = None
    comment_ids: List[str] = Field(default_factory=list)
    confidence: Optional[ConfidenceResponse] = None
    demand_score: Optional[float] = None


class PerformanceRecordResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    asset_id: Optional[str] = None
    asset_title: Optional[str] = None
    platform: str
    views: Optional[int] = None
    likes: Optional[int] = None
    comments_count: Optional[int] = None
    shares: Optional[int] = None
    published_at: Optional[datetime] = None
    recorded_at: datetime
    engagement_rate: Optional[float] = None


class TrendResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    metric: str
    current: float
    previous: float
    change_pct: Optional[float] = None
    direction: str
    current_sample: int
    previous_sample: int
    has_enough_data: bool = True


class RankingEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    asset_id: Optional[str] = None
    title: str
    platform: str
    engagement_rate: Optional[float] = None
    views: Optional[int] = None
    engagement_total: int
    vs_baseline_ratio: Optional[float] = None
    rank: int = 0


class GrowthOverviewResponse(BaseModel):
    """What changed. Not a chart wall -- the numbers that drive a decision."""

    window_start: datetime
    window_end: datetime
    record_count: int
    available_metrics: List[MetricValue] = Field(default_factory=list)
    unsupported_metrics: List[str] = Field(default_factory=list)
    engagement_rate: Optional[MetricValue] = None
    median_engagement_rate: Optional[float] = None
    trends: List[TrendResponse] = Field(default_factory=list)
    top_performers: List[RankingEntry] = Field(default_factory=list)
    underperformers: List[RankingEntry] = Field(default_factory=list)
    insight_count: int = 0
    opportunity_count: int = 0
    lesson_count: int = 0
    experiment_count: int = 0
    unanalyzed_comments: int = 0
    #: Set when there is not enough data to say anything useful.
    data_gaps: List[str] = Field(default_factory=list)
    has_enough_data: bool = False


class CopilotCitation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    table: str
    record_id: str
    label: Optional[str] = None


class CopilotResponse(BaseModel):
    """What happened, why it matters, what to do next."""

    question: str
    what_happened: str
    why_it_matters: str
    what_next: str
    #: Every claim traces here. An answer with no citations and real data behind
    #: it is refused rather than returned.
    citations: List[CopilotCitation] = Field(default_factory=list)
    #: True when the analysis could not support an answer. `what_next` then says
    #: what to collect, not what to publish.
    insufficient_data: bool = False
    suggested_action: Optional[str] = None
    confidence: Optional[ConfidenceResponse] = None
    degraded: bool = False
    provider: Optional[str] = None
    model: Optional[str] = None


class CopilotRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str = Field(..., min_length=3, max_length=1000)
    window_days: int = Field(default=30, ge=1, le=365)


class LessonResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    source_feature: str
    insight_summary: str
    actionable_rule: str
    applied_count: int = 0
    confidence: Optional[ConfidenceResponse] = None
    insight_id: Optional[str] = None
    evidence: Dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[datetime] = None


class LessonCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    insight_id: str
    #: Optional: derived deterministically from the insight when omitted.
    actionable_rule: Optional[str] = Field(default=None, max_length=1000)
    insight_summary: Optional[str] = Field(default=None, max_length=1000)


class ExperimentResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    hypothesis: str
    status: ExperimentStatus
    outcome_metric: Optional[str] = None
    observed_value: Optional[float] = None
    baseline_value: Optional[float] = None
    result_verdict: Optional[ExperimentVerdict] = None
    result_summary: Optional[str] = None
    variant_asset_id: Optional[str] = None
    baseline_asset_id: Optional[str] = None
    insight_id: Optional[str] = None
    lesson_id: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class ExperimentCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    hypothesis: str = Field(..., min_length=5, max_length=1000)
    outcome_metric: Optional[str] = None
    variant_asset_id: Optional[str] = None
    baseline_asset_id: Optional[str] = None
    insight_id: Optional[str] = None


class AnalyzeCommentsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    asset_id: Optional[str] = None
    #: Upper bound on comments processed in one call. Bulk analysis belongs in a
    #: job, not a request.
    limit: int = Field(default=25, ge=1, le=100)


class AnalyzeCommentsResponse(BaseModel):
    analyzed: int
    skipped_duplicate: int = 0
    categories: Dict[str, int] = Field(default_factory=dict)
    intents: Dict[str, int] = Field(default_factory=dict)
    questions_extracted: int = 0
    degraded: bool = False


class CreateOpportunityRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., min_length=3, max_length=255)
    angle: str = Field(..., min_length=3, max_length=2000)
    target_format: str = Field(default="reel", max_length=50)
    comment_ids: List[str] = Field(default_factory=list, max_length=25)


class CreatePerformanceRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    asset_id: Optional[str] = None
    title: Optional[str] = Field(default=None, max_length=255)
    platform: str = Field(..., min_length=1, max_length=50)
    values: Dict[str, int] = Field(..., min_length=1)
    published_at: Optional[datetime] = None
    #: Which of the supplied metrics were actually measured. Omitted means all
    #: supplied ones were.
    metrics_measured: Optional[List[str]] = None


class AddCommentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    comment_text: str = Field(..., min_length=1, max_length=5000)
    asset_id: Optional[str] = None
    author_hash: Optional[str] = Field(default=None, max_length=64)
    posted_at: Optional[datetime] = None


class CreateCommentInsightResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    category: Optional[str] = None
    summary: str
    extracted_questions: List[str] = Field(default_factory=list)
    actionable_idea: Optional[str] = None
    comment_ids: List[str] = Field(default_factory=list)


class LessonEvaluationResponse(BaseModel):
    """Deterministic verdict on whether an experiment's hypothesis held."""

    experiment_id: str
    verdict: ExperimentVerdict
    observed_value: Optional[float] = None
    baseline_value: Optional[float] = None
    change_pct: Optional[float] = None
    explanation: str
    has_enough_data: bool = True


__all__ = [
    "PerformanceMetric", "UNSUPPORTED_METRICS", "ENGAGEMENT_METRICS",
    "MetricAvailability", "ConfidenceBand", "ImpactLevel", "InsightType",
    "Evidence", "ConfidenceScore", "Insight", "CommentCategory", "CommentIntent",
    "INTENT_WEIGHTS", "CommentClassification", "OpportunityOrigin",
    "ContentOpportunity", "ExperimentStatus", "ExperimentVerdict",
    "PerformanceSnapshot", "MetricSummary", "TrendResult", "ContentRanking",
    "PerformanceAnalysis", "MIN_RECORDS_FOR_INSIGHT", "MIN_RECORDS_FOR_TREND",
    "MetricValue", "EvidenceItem", "ConfidenceResponse", "InsightResponse",
    "OpportunityResponse", "CommentResponse", "CommentInsightResponse",
    "PerformanceRecordResponse", "TrendResponse", "RankingEntry",
    "GrowthOverviewResponse", "CopilotCitation", "CopilotResponse",
    "CopilotRequest", "LessonResponse", "LessonCreateRequest",
    "ExperimentResponse", "ExperimentCreateRequest", "AnalyzeCommentsRequest",
    "AnalyzeCommentsResponse", "CreateOpportunityRequest",
    "CreatePerformanceRequest", "AddCommentRequest",
    "CreateCommentInsightResponse", "LessonEvaluationResponse",
]
