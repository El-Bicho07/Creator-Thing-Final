/**
 * Minimal typed client for the Phase 2 platform services.
 *
 * Scope (task §33): just enough to verify authentication, voice-profile state,
 * memory creation, memory retrieval and service status. The full Studio/Library
 * UX belongs to Phase 3.
 *
 * Ownership is never sent from the client. There is deliberately no `user_id`
 * field anywhere in these calls: the API derives the creator from the Supabase
 * JWT, and a client-supplied id would be ignored at best and dangerous at worst.
 */

export interface MemoryResult {
  memory_id: string;
  content_asset_id: string;
  chunk_id: string;
  score: number;
  text: string;
  source: string;
  source_type: string;
  title?: string | null;
  metadata: Record<string, unknown>;
  retrieval_purpose?: string | null;
  rank?: number | null;
}

export interface MemorySearchResponse {
  results: MemoryResult[];
  embedding_model: string;
  embedding_dimension: number;
}

export interface MemoryIngestResponse {
  persisted: boolean;
  asset_id?: string | null;
  chunks: number;
  redacted: boolean;
  embedding_model?: string | null;
  embedding_dimension?: number | null;
}

export interface VoiceProfile {
  id?: string | null;
  style_name: string;
  tone_fingerprint: Record<string, number>;
  writing_characteristics: Record<string, number>;
  formatting_rules: string[];
  forbidden_words: string[];
  sample_count: number;
  confidence: number;
  is_primary: boolean;
}

export interface VoiceMatch {
  overall_score: number;
  tone_delta: Record<string, number>;
  rule_violations: string[];
  verdict: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

/**
 * Resolve the caller's access token.
 *
 * Injected rather than imported so this module stays testable and so the
 * Supabase client can be swapped without touching call sites.
 */
export type TokenProvider = () => Promise<string | null>;

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
    const error = payload?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "HTTP_ERROR",
      error?.message ?? payload?.detail ?? `Request failed (${response.status})`,
    );
  }
  return payload as T;
}

// ---------------------------------------------------------------- services

export const platformApi = {
  // ---- service status (unauthenticated) ----
  health: () => fetch(`${baseUrl()}/api/health`).then((r) => r.json()),
  memoryHealth: () =>
    fetch(`${baseUrl()}/api/memory/health`).then((r) => r.json()),
  voiceHealth: () =>
    fetch(`${baseUrl()}/api/voice/health`).then((r) => r.json()),

  // ---- memory ----
  ingestMemory: (
    body: {
      title: string;
      text: string;
      source_type?: string;
      category?: string;
      metadata?: Record<string, unknown>;
    },
    getToken: TokenProvider,
  ) =>
    request<MemoryIngestResponse>(
      "/api/memory/ingest",
      { method: "POST", body: JSON.stringify(body) },
      getToken,
    ),

  searchMemory: (
    body: { query: string; top_k?: number; purpose?: string; min_score?: number },
    getToken: TokenProvider,
  ) =>
    request<MemorySearchResponse>(
      "/api/memory/search",
      { method: "POST", body: JSON.stringify(body) },
      getToken,
    ),

  listAssets: (getToken: TokenProvider) =>
    request<Array<{ id: string; title: string; source_type: string; chunk_count: number }>>(
      "/api/memory/assets",
      { method: "GET" },
      getToken,
    ),

  deleteAsset: (assetId: string, getToken: TokenProvider) =>
    request<{ assets_deleted: number }>(
      `/api/memory/assets/${assetId}`,
      { method: "DELETE" },
      getToken,
    ),

  memoryStats: (getToken: TokenProvider) =>
    request<{
      assets: number;
      chunks: number;
      embedding_model: string | null;
      embedding_dimension: number | null;
      unembedded_chunks: number;
      stale_dimension_chunks: number;
    }>("/api/memory/stats", { method: "GET" }, getToken),

  // ---- voice ----
  getVoiceProfile: (getToken: TokenProvider) =>
    request<VoiceProfile>("/api/voice/profile", { method: "GET" }, getToken),

  createVoiceProfile: (
    body: { samples: Array<{ text: string }>; style_name?: string; forbidden_words?: string[] },
    getToken: TokenProvider,
  ) =>
    request<VoiceProfile>(
      "/api/voice/profile",
      { method: "POST", body: JSON.stringify(body) },
      getToken,
    ),

  listVoiceProfiles: (getToken: TokenProvider) =>
    request<VoiceProfile[]>("/api/voice/profiles", { method: "GET" }, getToken),

  validateDraft: (draft: string, getToken: TokenProvider) =>
    request<VoiceMatch>(
      "/api/voice/validate",
      { method: "POST", body: JSON.stringify({ draft }) },
      getToken,
    ),

  similarMemories: (query: string, topK: number, getToken: TokenProvider) =>
    request<MemoryResult[]>(
      `/api/voice/similar-memories?q=${encodeURIComponent(query)}&top_k=${topK}`,
      { method: "GET" },
      getToken,
    ),
};
