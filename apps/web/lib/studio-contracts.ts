// Studio API types — AUTO-GENERATED, DO NOT EDIT BY HAND.
//
// Source: FastAPI OpenAPI spec (`/openapi.json`), Studio schemas only.
// Regenerate: scripts/generate_studio_contracts.py
//
// Ownership note: none of these types carry a `user_id`. The API derives the
// creator from the Supabase JWT and enforces ownership with PostgreSQL RLS, so a
// client cannot supply (or be trusted with) an owner id.


// --------------------------------------------------------------------
// Capability input payloads
//
// Each capability validates its input against a Pydantic model, so these
// are the shapes the API will accept. Sending an unknown field is a 422.
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
export type CritiqueSeverity = "strong" | "medium" | "light";
export type RefinementModifier = "shorter" | "more_casual" | "more_bold" | "more_educational" | "simpler";
export type SessionStatus = "active" | "completed" | "archived";
export type SessionStep = "context" | "generate" | "review" | "refine" | "done";

// --------------------------------------------------------------------
// Operations
// --------------------------------------------------------------------
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
