// Studio + Today/Producer API types — AUTO-GENERATED, DO NOT EDIT BY HAND.
//
// Source: FastAPI OpenAPI spec (`/openapi.json`), Studio (Phase 3) and
// Today/Producer (Phase 4) schemas.
// Regenerate: scripts/generate_studio_contracts.py
//
// Ownership note: none of these types carry a `user_id`. The API derives the
// creator from the Supabase JWT and enforces ownership with PostgreSQL RLS, so a
// client cannot supply (or be trusted with) an owner id.


// --------------------------------------------------------------------
// Phase 3 Studio + Phase 4 Today/Producer contracts
//
// Capability inputs are validated against a Pydantic model, so these are
// exactly the shapes the API will accept. Sending an unknown field is a 422.
// --------------------------------------------------------------------
export interface AddCommentRequest {
  comment_text: string;
  asset_id: string | null;
  author_hash: string | null;
  posted_at: string | null;
}

/** A comment id, and whether it was newly stored or already present. */
export interface AddCommentResponse {
  id: string;
  duplicate: boolean;
}

export interface AnalyzeCommentsRequest {
  asset_id: string | null;
  limit?: number;
}

export interface AnalyzeCommentsResponse {
  analyzed: number;
  skipped_duplicate?: number;
  categories?: Record<string, number>;
  intents?: Record<string, number>;
  questions_extracted?: number;
  degraded?: boolean;
}

export interface ApprovalRequest {
  approved: boolean;
}

export interface CapabilityInfo {
  id: string;
  name: string;
  description: string;
  donor: string[];
  classification: string;
  requires_context: string[];
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  supported_platforms: string[];
  supports_refinement: boolean;
}

export interface CapabilityListResponse {
  capabilities: CapabilityInfo[];
  total: number;
}

export interface CarryoverItem {
  id: string;
  plan_date: string;
  title: string;
  status: string;
  action_kind: string | null;
  reason: string | null;
}

export interface CarryoverResponse {
  items: CarryoverItem[];
  days_since_last_plan: number | null;
}

export interface CommentInsightResponse {
  id: string;
  category: string | null;
  summary: string;
  extracted_questions?: string[];
  actionable_idea: string | null;
  comment_ids?: string[];
  confidence: ConfidenceResponse | null;
  demand_score: number | null;
}

export interface CommentResponse {
  id: string;
  asset_id: string | null;
  comment_text: string;
  author_hash: string | null;
  posted_at: string | null;
  category: "theme" | "question" | "complaint" | "opportunity" | "spam" | null;
  intent: "request" | "pain_point" | "question" | "confusion" | "more_of_this" | "criticism" | "praise" | "other" | null;
  actionable?: boolean;
  sentiment: string | null;
  summary: string | null;
  analyzed_at: string | null;
}

export interface ConfidenceResponse {
  score: number;
  band: "low" | "medium" | "high";
  reasons?: string[];
  factors?: Record<string, number>;
}

export interface ContextPreviewResponse {
  session_id: string;
  memory_used: number;
  voice_available: boolean;
  prior_work_used: number;
  retrieved_memory: string;
  creator_voice: string;
  prior_work: string;
  notes: string[];
}

export interface CopilotCitation {
  table: string;
  record_id: string;
  label: string | null;
}

export interface CopilotRequest {
  question: string;
  window_days?: number;
}

/** What happened, why it matters, what to do next. */
export interface CopilotResponse {
  question: string;
  what_happened: string;
  why_it_matters: string;
  what_next: string;
  citations?: CopilotCitation[];
  insufficient_data?: boolean;
  suggested_action: string | null;
  confidence: ConfidenceResponse | null;
  degraded?: boolean;
  provider: string | null;
  model: string | null;
}

export interface CreateCommentInsightResponse {
  id: string;
  category: string | null;
  summary: string;
  extracted_questions?: string[];
  actionable_idea: string | null;
  comment_ids?: string[];
}

export interface CreateOpportunityRequest {
  title: string;
  angle: string;
  target_format?: string;
  comment_ids?: string[];
}

export interface CreatePerformanceRequest {
  asset_id: string | null;
  title: string | null;
  platform: string;
  values: Record<string, number>;
  published_at: string | null;
  metrics_measured: string[] | null;
}

export interface CritiqueItem {
  dimension: string;
  severity: "strong" | "medium" | "light";
  finding: string;
  suggestion: string;
}

export interface CritiqueRequest {
  session_id: string;
  generation_id: string | null;
  text: string | null;
}

export interface CritiqueResponse {
  generation_id: string | null;
  overall_score: number;
  verdict: string;
  items: CritiqueItem[];
  strengths: string[];
  generator_id: string | null;
}

/** One traceable input to a recommendation. */
export interface Evidence {
  kind: "memory" | "content_asset" | "studio_generation" | "idea" | "creator_profile" | "voice_profile" | "performance_record" | "today_item";
  ref_id: string;
  summary: string;
}

/** The Studio handoff. Note this contains NO generated content. */
export interface ExecuteResponse {
  item_id: string;
  studio_session_id: string;
  capability: string;
  input: Record<string, unknown>;
  session_created: boolean;
  studio_url: string;
  message: string;
}

export interface ExperimentCreateRequest {
  hypothesis: string;
  outcome_metric: string | null;
  variant_asset_id: string | null;
  baseline_asset_id: string | null;
  insight_id: string | null;
}

export interface ExperimentResponse {
  id: string;
  hypothesis: string;
  status: "planned" | "running" | "completed" | "abandoned";
  outcome_metric: string | null;
  observed_value: number | null;
  baseline_value: number | null;
  result_verdict: "supported" | "not_supported" | "inconclusive" | null;
  result_summary: string | null;
  variant_asset_id: string | null;
  baseline_asset_id: string | null;
  insight_id: string | null;
  lesson_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
}

/** Execute one Studio capability inside a session. */
export interface GenerationRequest {
  session_id: string;
  capability: string;
  input: Record<string, unknown>;
  platform: string | null;
  tone: string | null;
  goal: string | null;
  duration_sec: number | null;
}

export interface GenerationResponse {
  generation_id: string;
  session_id: string;
  version: number;
  capability: string;
  asset_id: string;
  output: unknown;
  prompt_name: string | null;
  prompt_version: string | null;
  provider: string | null;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  latency_ms: number;
  context_summary: Record<string, unknown>;
  warnings: string[];
}

/** What changed. Not a chart wall -- the numbers that drive a decision. */
export interface GrowthOverviewResponse {
  window_start: string;
  window_end: string;
  record_count: number;
  available_metrics?: MetricValue[];
  unsupported_metrics?: string[];
  engagement_rate: MetricValue | null;
  median_engagement_rate: number | null;
  trends?: TrendResponse[];
  top_performers?: RankingEntry[];
  underperformers?: RankingEntry[];
  insight_count?: number;
  opportunity_count?: number;
  lesson_count?: number;
  experiment_count?: number;
  unanalyzed_comments?: number;
  data_gaps?: string[];
  has_enough_data?: boolean;
}

export interface InsightResponse {
  id: string;
  insight_type: "performance_trend" | "content_pattern" | "audience_signal" | "underperforming_pattern" | "opportunity" | "experiment_result";
  title: string;
  summary: string;
  evidence?: Record<string, unknown>;
  source_records?: string[];
  confidence: ConfidenceResponse;
  impact: "low" | "medium" | "high";
  rule_key: string;
  recommended_action: string | null;
  is_stale?: boolean;
  window_start: string | null;
  window_end: string | null;
  created_at: string | null;
}

/** Deterministic verdict on whether an experiment's hypothesis held. */
export interface LessonEvaluationResponse {
  experiment_id: string;
  verdict: "supported" | "not_supported" | "inconclusive";
  observed_value: number | null;
  baseline_value: number | null;
  change_pct: number | null;
  explanation: string;
  has_enough_data?: boolean;
}

export interface LessonResponse {
  id: string;
  source_feature: string;
  insight_summary: string;
  actionable_rule: string;
  applied_count?: number;
  confidence: ConfidenceResponse | null;
  insight_id: string | null;
  evidence?: Record<string, unknown>;
  created_at: string | null;
}

export interface MetricValue {
  metric: string;
  value: number | null;
  available?: boolean;
  unit: string | null;
}

export interface OpportunityResponse {
  id: string;
  title: string;
  angle: string;
  target_format: string;
  demand_score: number | null;
  origin: "comment" | "performance" | "experiment" | "manual";
  status?: string;
  evidence?: Record<string, unknown>;
  source_comment_ids?: string[];
  insight_id: string | null;
}

export interface PerformanceRecordResponse {
  id: string;
  asset_id: string | null;
  asset_title: string | null;
  platform: string;
  views: number | null;
  likes: number | null;
  comments_count: number | null;
  shares: number | null;
  published_at: string | null;
  recorded_at: string;
  engagement_rate: number | null;
}

/** Response of `POST /api/today/plan`, sync or job-backed. */
export interface PlanResultResponse {
  date: string;
  items: TodayItem[];
  total: number;
  total_estimated_minutes: number;
  notes: string[];
  run: ProducerRun;
  job_id: string | null;
  job_status: string | null;
}

/** Non-sensitive provenance returned to the client. */
export interface ProducerContextSummary {
  has_profile: boolean;
  has_voice: boolean;
  memory_chunks: number;
  unfinished_generations: number;
  open_ideas: number;
  recent_assets: number;
  performance_records: number;
  days_since_last_plan: number | null;
  notes: string[];
}

/** A structured, validated proposal. */
export interface ProducerRecommendation {
  kind: "create" | "continue" | "refine" | "repurpose" | "triage_idea" | "quick_engage" | "build_trust" | "no_action";
  title: string;
  reason: string;
  reason_kind: "observed" | "suggestion";
  priority: "high" | "medium" | "low";
  action_kind: "create_content" | "quick_engage" | "build_trust" | "continue_draft" | "refine_content" | "repurpose" | "review_idea" | "publish_prep";
  estimated_minutes: number;
  suggested_capability: string | null;
  platform: string;
  next_action: string;
  evidence: Evidence[];
  signals: Record<string, unknown>;
}

/** The outcome of one planning pass, mirrored into a `jobs` row. */
export interface ProducerRun {
  job_id: string | null;
  plan_date: string;
  status: string;
  recommendations: number;
  created_items: number;
  skipped_duplicates: number;
  latency_ms: number;
  notes: string[];
}

export interface RankingEntry {
  asset_id: string | null;
  title: string;
  platform: string;
  engagement_rate: number | null;
  views: number | null;
  engagement_total: number;
  vs_baseline_ratio: number | null;
  rank?: number;
}

export interface RecommendResponse {
  date: string;
  recommendations: ProducerRecommendation[];
  total: number;
  has_action: boolean;
  context: ProducerContextSummary;
  run: ProducerRun;
  message: string;
}

export interface RefineRequest {
  session_id: string;
  instruction: string;
  modifier: "shorter" | "more_casual" | "more_bold" | "more_educational" | "simpler" | null;
  generation_id: string | null;
}

export interface SessionCreateRequest {
  title: string;
  brief: string | null;
  idea_id: string | null;
}

export interface SessionListResponse {
  sessions: SessionResponse[];
  total: number;
}

export interface SessionResponse {
  id: string;
  title: string;
  status: string;
  current_step: string;
  brief: string | null;
  idea_id: string | null;
  last_capability: string | null;
  metadata: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}

/** Partial update: absent fields are left unchanged. */
export interface SessionUpdateRequest {
  title: string | null;
  brief: string | null;
  status: "active" | "completed" | "archived" | null;
  current_step: "context" | "generate" | "review" | "refine" | "done" | null;
  idea_id: string | null;
}

/** One unit of planned work (a `plan_items` row). */
export interface TodayItem {
  id: string;
  plan_date: string;
  title: string;
  status: "planned" | "in_progress" | "completed" | "skipped" | "blocked";
  priority: "high" | "medium" | "low";
  priority_rank: number;
  rank: number;
  action_kind: "create_content" | "quick_engage" | "build_trust" | "continue_draft" | "refine_content" | "repurpose" | "review_idea" | "publish_prep" | null;
  capability: string | null;
  platform: string;
  estimated_minutes: number;
  reason: string | null;
  reason_kind: "observed" | "suggestion" | null;
  source: string;
  idea_id: string | null;
  studio_session_id: string | null;
  generation_id: string | null;
  dedupe_key: string | null;
  evidence: Evidence[];
  recommendation: ProducerRecommendation | null;
  completed: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface TodayPlanResponse {
  date: string;
  items: TodayItem[];
  total: number;
  total_estimated_minutes: number;
  priority_item_id: string | null;
  counts: Record<string, number>;
  notes: string[];
  run: ProducerRun | null;
}

export interface TrendResponse {
  metric: string;
  current: number;
  previous: number;
  change_pct: number | null;
  direction: string;
  current_sample: number;
  previous_sample: number;
  has_enough_data?: boolean;
}

export interface VersionInfo {
  id: string;
  version: number;
  capability: string;
  asset_id: string;
  prompt_name: string | null;
  prompt_version: string | null;
  parent_generation_id: string | null;
  critique: Record<string, unknown> | null;
  creator_approved: boolean;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  latency_ms: number;
  text: string | null;
  created_at: string | null;
}

export interface VersionListResponse {
  session_id: string;
  versions: VersionInfo[];
  total: number;
}

// --------------------------------------------------------------------
// Enumerations
// --------------------------------------------------------------------
export type ActionKind = "create_content" | "quick_engage" | "build_trust" | "continue_draft" | "refine_content" | "repurpose" | "review_idea" | "publish_prep";
export type ClaimKind = "observed" | "suggestion";
export type CommentCategory = "theme" | "question" | "complaint" | "opportunity" | "spam";
export type CommentIntent = "request" | "pain_point" | "question" | "confusion" | "more_of_this" | "criticism" | "praise" | "other";
export type ConfidenceBand = "low" | "medium" | "high";
export type CritiqueSeverity = "strong" | "medium" | "light";
export type EvidenceKind = "memory" | "content_asset" | "studio_generation" | "idea" | "creator_profile" | "voice_profile" | "performance_record" | "today_item";
export type ExperimentStatus = "planned" | "running" | "completed" | "abandoned";
export type ExperimentVerdict = "supported" | "not_supported" | "inconclusive";
export type ImpactLevel = "low" | "medium" | "high";
export type InsightType = "performance_trend" | "content_pattern" | "audience_signal" | "underperforming_pattern" | "opportunity" | "experiment_result";
export type OpportunityOrigin = "comment" | "performance" | "experiment" | "manual";
export type Priority = "high" | "medium" | "low";
export type RecommendationKind = "create" | "continue" | "refine" | "repurpose" | "triage_idea" | "quick_engage" | "build_trust" | "no_action";
export type RefinementModifier = "shorter" | "more_casual" | "more_bold" | "more_educational" | "simpler";
export type SessionStatus = "active" | "completed" | "archived";
export type SessionStep = "context" | "generate" | "review" | "refine" | "done";
export type TodayItemStatus = "planned" | "in_progress" | "completed" | "skipped" | "blocked";

// --------------------------------------------------------------------
// Operations
// --------------------------------------------------------------------
// POST /api/producer/execute — Execute
// GET /api/producer/health — Producer Health
// POST /api/producer/recommend — Recommend
// GET /api/studio/capabilities — List Capabilities
// POST /api/studio/critique — Critique
// POST /api/studio/generate — Generate
// GET /api/studio/health — Studio Health
// GET /api/studio/platforms — List Platforms
// POST /api/studio/refine — Refine
// GET /api/studio/sessions — List Sessions
// POST /api/studio/sessions — Create Session
// DELETE /api/studio/sessions/{session_id} — Delete Session
// GET /api/studio/sessions/{session_id} — Get Session
// PATCH /api/studio/sessions/{session_id} — Update Session
// GET /api/studio/sessions/{session_id}/context — Preview Context
// GET /api/studio/sessions/{session_id}/versions — List Versions
// DELETE /api/studio/versions/{generation_id} — Delete Version
// POST /api/studio/versions/{generation_id}/approve — Approve Version
// GET /api/studio/workflow — Get Workflow
// GET /api/today — Get Today
// GET /api/today/carryover — Get Carryover
// GET /api/today/health — Today Health
// POST /api/today/items — Create Item
// DELETE /api/today/items/{item_id} — Delete Item
// GET /api/today/items/{item_id} — Get Item
// PATCH /api/today/items/{item_id} — Update Item
// PATCH /api/today/items/{item_id}/status — Change Status
// POST /api/today/plan — Create Plan
