/**
 * Growth + Analytics Copilot API client.
 *
 * Types come from `lib/studio-contracts.ts`, GENERATED from the live OpenAPI spec
 * by `scripts/generate_studio_contracts.py`. Nothing here restates a schema by hand.
 *
 * Ownership is never sent from the browser: no call carries a `user_id`. The API
 * derives the creator from the Supabase JWT and enforces ownership with PostgreSQL
 * RLS.
 *
 * One rule the UI depends on: `null` for a metric means **not measured**, which is
 * different from `0`. The platform does not collect watch time, retention, reach or
 * clicks, so the UI renders those as unavailable rather than as a number.
 */
import { ApiError, type TokenProvider } from "@/lib/api";

import type {
  AnalyzeCommentsResponse,
  CommentInsightResponse,
  CommentResponse,
  CopilotResponse,
  ExperimentResponse,
  GrowthOverviewResponse,
  InsightResponse,
  LessonResponse,
  OpportunityResponse,
  PerformanceRecordResponse,
} from "@/lib/studio-contracts";

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
    const error = (payload as { error?: { code?: string; message?: string } } | null)
      ?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "HTTP_ERROR",
      error?.message ??
        (payload as { detail?: string } | null)?.detail ??
        `Request failed (${response.status})`,
    );
  }
  return payload as T;
}

export const growthApi = {
  health: () => fetch(`${baseUrl()}/api/growth/health`).then((r) => r.json()),

  /** What changed. Valid with no data, carrying `has_enough_data=false`. */
  overview: (getToken: TokenProvider, windowDays = 30) =>
    request<GrowthOverviewResponse>(
      `/api/growth/overview?window_days=${windowDays}`,
      { method: "GET" },
      getToken,
    ),

  performance: (getToken: TokenProvider, limit = 50) =>
    request<PerformanceRecordResponse[]>(
      `/api/growth/performance?limit=${limit}`,
      { method: "GET" },
      getToken,
    ),

  recordPerformance: (
    body: {
      title?: string;
      platform: string;
      values: Record<string, number>;
      asset_id?: string | null;
      metrics_measured?: string[] | null;
      published_at?: string | null;
    },
    getToken: TokenProvider,
  ) =>
    request<PerformanceRecordResponse>(
      "/api/growth/performance",
      { method: "POST", body: JSON.stringify(body) },
      getToken,
    ),

  insights: (getToken: TokenProvider, includeStale = false) =>
    request<InsightResponse[]>(
      `/api/growth/insights?include_stale=${includeStale}`,
      { method: "GET" },
      getToken,
    ),

  /** Re-run the deterministic rules. Safe to press: no provider is involved. */
  generateInsights: (getToken: TokenProvider, windowDays = 30) =>
    request<InsightResponse[]>(
      `/api/growth/insights/generate?window_days=${windowDays}`,
      { method: "POST" },
      getToken,
    ),

  comments: (getToken: TokenProvider, limit = 50) =>
    request<CommentResponse[]>(
      `/api/growth/comments?limit=${limit}`,
      { method: "GET" },
      getToken,
    ),

  addComment: (body: { comment_text: string; asset_id?: string | null }, getToken: TokenProvider) =>
    request<{ id: string; duplicate: boolean }>(
      "/api/growth/comments",
      { method: "POST", body: JSON.stringify(body) },
      getToken,
    ),

  /** Bounded. Bulk analysis belongs in a job, not a request. */
  analyzeComments: (body: { limit?: number; asset_id?: string | null }, getToken: TokenProvider) =>
    request<AnalyzeCommentsResponse>(
      "/api/growth/comments/analyze",
      { method: "POST", body: JSON.stringify(body) },
      getToken,
    ),

  commentInsights: (getToken: TokenProvider, limit = 50) =>
    request<CommentInsightResponse[]>(
      `/api/growth/comment-insights?limit=${limit}`,
      { method: "GET" },
      getToken,
    ),

  opportunities: (getToken: TokenProvider, limit = 50) =>
    request<OpportunityResponse[]>(
      `/api/growth/opportunities?limit=${limit}`,
      { method: "GET" },
      getToken,
    ),

  detectOpportunities: (getToken: TokenProvider) =>
    request<OpportunityResponse[]>(
      "/api/growth/opportunities/detect",
      { method: "POST" },
      getToken,
    ),

  lessons: (getToken: TokenProvider, limit = 50) =>
    request<LessonResponse[]>(`/api/growth/lessons?limit=${limit}`, { method: "GET" }, getToken),

  experiments: (getToken: TokenProvider, limit = 50) =>
    request<ExperimentResponse[]>(
      `/api/growth/experiments?limit=${limit}`,
      { method: "GET" },
      getToken,
    ),

  createExperiment: (
    body: {
      hypothesis: string;
      outcome_metric?: string | null;
      variant_asset_id?: string | null;
      baseline_asset_id?: string | null;
    },
    getToken: TokenProvider,
  ) =>
    request<ExperimentResponse>(
      "/api/growth/experiments",
      { method: "POST", body: JSON.stringify(body) },
      getToken,
    ),

  evaluateExperiment: (id: string, getToken: TokenProvider) =>
    request<{
      experiment_id: string;
      verdict: string;
      observed_value: number | null;
      baseline_value: number | null;
      change_pct: number | null;
      explanation: string;
      has_enough_data: boolean;
    }>(`/api/growth/experiments/${id}/evaluate`, { method: "POST" }, getToken),

  convertOpportunityToToday: (id: string, body: Record<string, any>, getToken: TokenProvider) =>
    request<any>(
      `/api/growth/opportunities/${id}/convert-to-today`,
      { method: "POST", body: JSON.stringify(body) },
      getToken
    ),

  convertOpportunityToStudio: (id: string, getToken: TokenProvider) =>
    request<{ item_id: string; studio_session_id: string; message: string }>(
      `/api/growth/opportunities/${id}/convert-to-studio`,
      { method: "POST" },
      getToken
    ),

  askCopilot: (question: string, windowDays: number, getToken: TokenProvider) =>
    analyticsApi.ask({ question, window_days: windowDays }, getToken),
};

export const analyticsApi = {
  /**
   * Ask what happened, why it matters, and what to do next.
   *
   * The response may be `insufficient_data`, in which case `what_next` says what to
   * collect rather than what to publish. Never render a number the API did not
   * send.
   */
  ask: (body: { question: string; window_days?: number }, getToken: TokenProvider) =>
    request<CopilotResponse>(
      "/api/analytics/copilot",
      { method: "POST", body: JSON.stringify(body) },
      getToken,
    ),

  /** What the Copilot may talk about, and what it may not. */
  metrics: (getToken: TokenProvider) =>
    request<{
      supported_metrics: { name: string; label: string }[];
      unsupported_metrics: string[];
      note: string;
    }>("/api/analytics/copilot/metrics", { method: "GET" }, getToken),
};

/** Questions the Growth surface offers. Chosen to match the evaluation set. */
export const COPILOT_SUGGESTIONS = [
  "What worked best this month?",
  "What changed recently?",
  "Why did this post outperform the others?",
  "What should I create more of?",
  "What is underperforming?",
  "What are my audience asking for?",
  "What should I test next?",
] as const;

export type CopilotSuggestion = (typeof COPILOT_SUGGESTIONS)[number];
