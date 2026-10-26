/**
 * Today + AI Creative Producer API client.
 *
 * Types come from `lib/studio-contracts.ts`, GENERATED from the live OpenAPI spec
 * by `scripts/generate_studio_contracts.py`. Nothing here restates a schema by
 * hand.
 *
 * Ownership is never sent from the browser: no call carries a `user_id`. The API
 * derives the creator from the Supabase JWT and enforces ownership with PostgreSQL
 * RLS, so a client cannot supply or be trusted with an owner id.
 */

import { ApiError, type TokenProvider } from "@/lib/api";

import type {
  CarryoverResponse,
  ExecuteResponse,
  PlanResultResponse,
  RecommendResponse,
  TodayItem,
  TodayPlanResponse,
  TodayItemStatus,
} from "@/lib/studio-contracts";

export type {
  ActionKind,
  CarryoverItem,
  CarryoverResponse,
  ClaimKind,
  Evidence,
  EvidenceKind,
  ExecuteResponse,
  PlanResultResponse,
  Priority,
  ProducerContextSummary,
  ProducerRecommendation,
  ProducerRun,
  RecommendResponse,
  RecommendationKind,
  TodayItem,
  TodayItemStatus,
  TodayPlanResponse,
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

export const todayApi = {
  health: () => fetch(`${baseUrl()}/api/today/health`).then((r) => r.json()),

  /** The persisted plan. Never regenerates as a side effect of a read. */
  getPlan: (date?: string, getToken?: TokenProvider) =>
    request<TodayPlanResponse>(
      `/api/today${date ? `?date=${date}` : ""}`,
      { method: "GET" },
      getToken ?? (async () => null),
    ),

  /** Run the Producer and persist the plan. */
  createPlan: (
    body: { time_budget_minutes?: number; asynchronous?: boolean },
    getToken: TokenProvider,
    date?: string,
  ) =>
    request<PlanResultResponse>(
      `/api/today/plan${date ? `?date=${date}` : ""}`,
      { method: "POST", body: JSON.stringify(body) },
      getToken,
    ),

  addItem: (
    body: {
      title: string;
      platform?: string;
      estimated_minutes?: number;
      reason?: string | null;
      action_kind?: string | null;
    },
    getToken: TokenProvider,
    date?: string,
  ) =>
    request<TodayItem>(
      `/api/today/items${date ? `?date=${date}` : ""}`,
      { method: "POST", body: JSON.stringify(body) },
      getToken,
    ),

  updateItem: (
    id: string,
    body: {
      title?: string;
      reason?: string | null;
      platform?: string;
      estimated_minutes?: number;
    },
    getToken: TokenProvider,
  ) =>
    request<TodayItem>(`/api/today/items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }, getToken),

  /** Move an item through the state machine. Illegal moves return 409. */
  setStatus: (id: string, next: TodayItemStatus, getToken: TokenProvider) =>
    request<TodayItem>(`/api/today/items/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: next }),
    }, getToken),

  deleteItem: (id: string, getToken: TokenProvider) =>
    request<void>(`/api/today/items/${id}`, { method: "DELETE" }, getToken),

  carryover: (getToken: TokenProvider) =>
    request<CarryoverResponse>("/api/today/carryover", { method: "GET" }, getToken),
};

export const producerApi = {
  health: () => fetch(`${baseUrl()}/api/producer/health`).then((r) => r.json()),

  /** Preview recommendations WITH reasoning. Persists nothing. */
  recommend: (
    body: { plan_date?: string; time_budget_minutes?: number },
    getToken: TokenProvider,
  ) =>
    request<RecommendResponse>(
      "/api/producer/recommend",
      { method: "POST", body: JSON.stringify(body) },
      getToken,
    ),

  /**
   * Accept a Today item and hand it to Studio.
   *
   * This prepares a Studio session and the capability input. It does NOT
   * generate content, approve anything, or publish anything.
   */
  execute: (
    body: { item_id: string; studio_session_id?: string | null },
    getToken: TokenProvider,
  ) =>
    request<ExecuteResponse>(
      "/api/producer/execute",
      { method: "POST", body: JSON.stringify(body) },
      getToken,
    ),
};
