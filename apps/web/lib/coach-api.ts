/**
 * Client for Phase 6 Coach & Learning endpoints.
 *
 * Directs API calls to `/api/coach/*` and `/api/learning/*`.
 * Ownership is handled via Supabase JWT tokens.
 */

import { ApiError, type TokenProvider } from "@/lib/api";

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000")
    .replace(/\/+$/, "")
    .replace(/\/api$/, "");
}

async function request<T>(
  path: string,
  init: RequestInit,
  getToken: TokenProvider,
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${baseUrl()}${path}`, { ...init, headers });
  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload?.detail ?? response.statusText;
    throw new ApiError(response.status, "COACH_API_ERROR", detail);
  }
  return payload as T;
}

export type GoalCategory =
  | "hook_retention"
  | "storytelling"
  | "audience_engagement"
  | "cta_conversion"
  | "workflow_consistency"
  | "content_pacing"
  | "general_improvement";

export type GoalStatus = "not_started" | "in_progress" | "achieved" | "archived";
export type ProgressStatus = "improving" | "stable" | "needs_attention" | "insufficient_evidence";

export interface CoachGoal {
  id: string;
  user_id: string;
  category: GoalCategory;
  title: string;
  description?: string | null;
  target_metric?: string | null;
  status: GoalStatus;
  progress_status: ProgressStatus;
  supporting_evidence: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface StructuredFeedback {
  observation: string;
  why_it_matters: string;
  what_to_improve: string;
  how_to_practice: string;
  what_to_try_next: string;
}

export interface CoachFeedback {
  id: string;
  session_id: string;
  user_id: string;
  goal_id?: string | null;
  observation: string;
  why_it_matters: string;
  what_to_improve: string;
  how_to_practice: string;
  what_to_try_next: string;
  actionable_exercise?: string | null;
  created_at: string;
}

export interface CoachRecommendation {
  goal_id: string;
  recommendation_target: "producer" | "today";
  practice_prompt: string;
  suggested_format: string;
  rationale: string;
}

export type LearningCategory =
  | "creator_preference"
  | "content_strength"
  | "content_weakness"
  | "workflow_pattern"
  | "audience_pattern"
  | "skill_progress"
  | "lesson";

export type LearningStatus = "candidate" | "confirmed" | "rejected" | "superseded";
export type LearningSource =
  | "explicit_input"
  | "coaching_session"
  | "growth_insight"
  | "comment_analysis"
  | "experiment"
  | "performance_record";

export interface LearningRecord {
  id: string;
  user_id: string;
  category: LearningCategory;
  summary: string;
  evidence: Record<string, unknown>;
  confidence: number;
  status: LearningStatus;
  source: LearningSource;
  created_at: string;
  updated_at: string;
}

export async function createGoal(
  getToken: TokenProvider,
  req: { title: string; category: GoalCategory; description?: string; target_metric?: string },
): Promise<CoachGoal> {
  return request<CoachGoal>("/api/coach/goals", { method: "POST", body: JSON.stringify(req) }, getToken);
}

export async function listGoals(
  getToken: TokenProvider,
  statusFilter?: GoalStatus,
): Promise<CoachGoal[]> {
  const query = statusFilter ? `?status=${statusFilter}` : "";
  return request<CoachGoal[]>(`/api/coach/goals${query}`, { method: "GET" }, getToken);
}

export async function evaluateGoalProgress(
  getToken: TokenProvider,
  goalId: string,
): Promise<CoachGoal> {
  return request<CoachGoal>(`/api/coach/goals/${goalId}/evaluate`, { method: "POST" }, getToken);
}

export async function provideFeedback(
  getToken: TokenProvider,
  req: { session_topic?: string; draft_text?: string; goal_id?: string },
): Promise<CoachFeedback> {
  return request<CoachFeedback>("/api/coach/feedback", { method: "POST", body: JSON.stringify(req) }, getToken);
}

export async function recommendProducerAction(
  getToken: TokenProvider,
  goalId: string,
): Promise<CoachRecommendation> {
  return request<CoachRecommendation>(`/api/coach/goals/${goalId}/recommend`, { method: "POST" }, getToken);
}

export async function listLearnings(
  getToken: TokenProvider,
  category?: LearningCategory,
  statusFilter?: LearningStatus,
): Promise<LearningRecord[]> {
  const params = new URLSearchParams();
  if (category) params.append("category", category);
  if (statusFilter) params.append("status", statusFilter);
  const q = params.toString() ? `?${params.toString()}` : "";
  return request<LearningRecord[]>(`/api/learning${q}`, { method: "GET" }, getToken);
}

export async function createLearning(
  getToken: TokenProvider,
  req: { category: LearningCategory; summary: string; confidence?: number; status?: LearningStatus },
): Promise<LearningRecord> {
  return request<LearningRecord>("/api/learning", { method: "POST", body: JSON.stringify(req) }, getToken);
}

export async function applyCreatorCorrection(
  getToken: TokenProvider,
  req: { learning_id: string; correction_text: string },
): Promise<LearningRecord> {
  return request<LearningRecord>("/api/learning/correct", { method: "POST", body: JSON.stringify(req) }, getToken);
}

export async function updateLearningStatus(
  getToken: TokenProvider,
  learningId: string,
  status: LearningStatus,
): Promise<LearningRecord> {
  return request<LearningRecord>(`/api/learning/${learningId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  }, getToken);
}
