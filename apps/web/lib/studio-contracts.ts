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
export type CritiqueSeverity = "strong" | "medium" | "light";
export type EvidenceKind = "memory" | "content_asset" | "studio_generation" | "idea" | "creator_profile" | "voice_profile" | "performance_record" | "today_item";
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
