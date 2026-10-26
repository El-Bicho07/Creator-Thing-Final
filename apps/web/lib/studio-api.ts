/**
 * Studio API client.
 *
 * Types come from `lib/studio-contracts.ts`, which is GENERATED from the live
 * OpenAPI spec by `scripts/generate_studio_contracts.py`. Nothing here restates a
 * schema by hand, so the client cannot drift from what the API accepts (task §27).
 *
 * Ownership is never sent from the browser. There is deliberately no `user_id` in
 * any payload: the API derives the creator from the Supabase JWT and PostgreSQL RLS
 * is the authoritative boundary.
 *
 * `input` stays `Record<string, unknown>` because it is capability-specific by
 * design; each capability publishes its own JSON Schema through
 * `GET /api/studio/capabilities`, and the Studio UI builds the payload from that
 * rather than from a hard-coded union.
 */

import { ApiError, type TokenProvider } from "@/lib/api";

import type {
  ApprovalRequest,
  CapabilityInfo,
  CapabilityListResponse,
  ContextPreviewResponse,
  CritiqueItem,
  CritiqueResponse,
  GenerationRequest,
  GenerationResponse,
  RefineRequest,
  RefinementModifier,
  SessionCreateRequest,
  SessionListResponse,
  SessionResponse,
  SessionStatus,
  SessionStep,
  VersionInfo,
  VersionListResponse,
} from "@/lib/studio-contracts";

export type {
  ApprovalRequest,
  CapabilityInfo,
  CapabilityListResponse,
  ContextPreviewResponse,
  CritiqueItem,
  CritiqueResponse,
  GenerationRequest,
  GenerationResponse,
  RefineRequest,
  RefinementModifier,
  SessionResponse,
  SessionStatus,
  SessionStep,
  VersionInfo,
  VersionListResponse,
} from "@/lib/studio-contracts";

/** A platform constraint as reported by `GET /api/studio/platforms`. */
export interface StudioPlatform {
  key: string;
  label: string;
  kind: "video" | "text";
  default_duration_sec: number;
  caption_char_cap: number;
  caption_aim_chars: number;
  hashtag_min: number;
  hashtag_max: number;
  allowed_formats: string[];
}

export interface StudioWorkflowStep {
  key: string;
  label: string;
}

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

export const studioApi = {
  // ---- catalogue (authenticated: the capability set is creator-visible) ----
  health: () =>
    fetch(`${baseUrl()}/api/studio/health`).then((r) => r.json()),

  capabilities: (getToken: TokenProvider) =>
    request<CapabilityListResponse>(
      "/api/studio/capabilities",
      { method: "GET" },
      getToken,
    ),

  platforms: (getToken: TokenProvider) =>
    request<{ platforms: StudioPlatform[] }>(
      "/api/studio/platforms",
      { method: "GET" },
      getToken,
    ),

  workflow: (getToken: TokenProvider) =>
    request<{ steps: StudioWorkflowStep[] }>(
      "/api/studio/workflow",
      { method: "GET" },
      getToken,
    ),

  // ---- sessions ----
  createSession: (body: SessionCreateRequest, getToken: TokenProvider) =>
    request<SessionResponse>(
      "/api/studio/sessions",
      { method: "POST", body: JSON.stringify(body) },
      getToken,
    ),

  listSessions: (getToken: TokenProvider, status?: SessionStatus) =>
    request<SessionListResponse>(
      `/api/studio/sessions${status ? `?status=${status}` : ""}`,
      { method: "GET" },
      getToken,
    ),

  getSession: (id: string, getToken: TokenProvider) =>
    request<SessionResponse>(`/api/studio/sessions/${id}`, { method: "GET" }, getToken),

  updateSession: (
    id: string,
    body: Partial<{
      title: string;
      brief: string;
      status: SessionStatus;
      current_step: SessionStep;
    }>,
    getToken: TokenProvider,
  ) =>
    request<SessionResponse>(
      `/api/studio/sessions/${id}`,
      { method: "PATCH", body: JSON.stringify(body) },
      getToken,
    ),

  deleteSession: (id: string, getToken: TokenProvider) =>
    request<void>(`/api/studio/sessions/${id}`, { method: "DELETE" }, getToken),

  contextPreview: (id: string, getToken: TokenProvider) =>
    request<ContextPreviewResponse>(
      `/api/studio/sessions/${id}/context`,
      { method: "GET" },
      getToken,
    ),

  // ---- generation / critique / refinement ----
  generate: (body: GenerationRequest, getToken: TokenProvider) =>
    request<GenerationResponse>(
      "/api/studio/generate",
      { method: "POST", body: JSON.stringify(body) },
      getToken,
    ),

  critique: (
    body: { session_id: string; generation_id?: string | null; text?: string | null },
    getToken: TokenProvider,
  ) =>
    request<CritiqueResponse>(
      "/api/studio/critique",
      { method: "POST", body: JSON.stringify(body) },
      getToken,
    ),

  refine: (body: RefineRequest, getToken: TokenProvider) =>
    request<GenerationResponse>(
      "/api/studio/refine",
      { method: "POST", body: JSON.stringify(body) },
      getToken,
    ),

  // ---- versions ----
  versions: (sessionId: string, getToken: TokenProvider) =>
    request<VersionListResponse>(
      `/api/studio/sessions/${sessionId}/versions`,
      { method: "GET" },
      getToken,
    ),

  approve: (generationId: string, approved: boolean, getToken: TokenProvider) =>
    request<VersionInfo>(
      `/api/studio/versions/${generationId}/approve`,
      {
        method: "POST",
        body: JSON.stringify({ approved } satisfies ApprovalRequest),
      },
      getToken,
    ),

  deleteVersion: (generationId: string, getToken: TokenProvider) =>
    request<void>(`/api/studio/versions/${generationId}`, { method: "DELETE" }, getToken),
};
