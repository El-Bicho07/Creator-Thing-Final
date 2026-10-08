"use client";

/**
 * Phase 2 integration check.
 *
 * Deliberately a verification surface, not a product page (task §33). It proves
 * the four things Phase 2 must demonstrate end to end:
 *
 *   1. authentication (Supabase bearer token reaches the API)
 *   2. voice-profile state
 *   3. memory creation
 *   4. memory retrieval
 *
 * plus service status. The real Library / Studio UX arrives in Phase 3.
 */

import { useCallback, useEffect, useState } from "react";

import { platformApi, type MemoryResult, type VoiceProfile } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type ServiceStatus = "unknown" | "ok" | "error";

export default function Phase2VerificationPage() {
  const { getToken, user } = useAuth();
  const [memoryStatus, setMemoryStatus] = useState<ServiceStatus>("unknown");
  const [voiceStatus, setVoiceStatus] = useState<ServiceStatus>("unknown");
  const [authState, setAuthState] = useState<string>("unknown");
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [ingestNote, setIngestNote] = useState<string>("");
  const [query, setQuery] = useState("how did my launch perform?");
  const [results, setResults] = useState<MemoryResult[]>([]);
  const [embedding, setEmbedding] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);



  useEffect(() => {
    void (async () => {
      try {
        setMemoryStatus((await platformApi.memoryHealth()).status === "ok" ? "ok" : "error");
        setVoiceStatus((await platformApi.voiceHealth()).status === "ok" ? "ok" : "error");
      } catch {
        setMemoryStatus("error");
        setVoiceStatus("error");
      }

      const token = await getToken();
      if (!token) {
        setAuthState("no token — sign in to verify authenticated calls");
        return;
      }
      setAuthState("token present");
      try {
        setProfile(await platformApi.getVoiceProfile(getToken));
      } catch {
        // 404 simply means the creator has not created a profile yet.
      }
    })();
  }, [getToken]);

  async function ingest() {
    setBusy(true);
    setError(null);
    try {
      const result = await platformApi.ingestMemory(
        {
          title: "Phase 2 verification note",
          text:
            "I launched my landing page on a Tuesday and got 400 signups in 48 " +
            "hours. My mistake was waiting three weeks to email my list.",
          source_type: "manual",
          category: "lesson",
        },
        getToken,
      );
      setIngestNote(
        `persisted=${result.persisted} chunks=${result.chunks} ` +
          `dim=${result.embedding_dimension} redacted=${result.redacted}`,
      );
      setEmbedding(`${result.embedding_model} (${result.embedding_dimension}-d)`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function search() {
    setBusy(true);
    setError(null);
    try {
      const response = await platformApi.searchMemory(
        { query, top_k: 5, purpose: "phase2_verification" },
        getToken,
      );
      setResults(response.results);
      setEmbedding(`${response.embedding_model} (${response.embedding_dimension}-d)`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const badge = (status: ServiceStatus) =>
    status === "ok" ? "text-green-600" : status === "error" ? "text-red-600" : "text-gray-400";

  return (
    <div className="pt-24 pb-16 px-4 max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Phase 2 Integration Check</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Verification surface for the shared AI primitives. Not the product UX.
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ["Memory service", memoryStatus],
          ["Voice service", voiceStatus],
        ].map(([label, status]) => (
          <div key={String(label)} className="rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{String(label)}</p>
            <p className={`text-lg font-semibold ${badge(status as ServiceStatus)}`}>
              {String(status)}
            </p>
          </div>
        ))}
        <div className="rounded-lg border border-gray-200 p-4 col-span-2">
          <p className="text-sm text-gray-500">Authentication</p>
          <p className="text-sm font-medium">{authState}</p>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 p-4 space-y-3">
        <h2 className="font-semibold">Voice profile</h2>
        {profile ? (
          <div className="text-sm space-y-1">
            <p>
              <span className="text-gray-500">style:</span> {profile.style_name}
              {profile.is_primary ? " (primary)" : ""}
            </p>
            <p>
              <span className="text-gray-500">samples:</span> {profile.sample_count}
              {" · "}
              <span className="text-gray-500">confidence:</span> {profile.confidence}
            </p>
            <p className="text-gray-600">
              {Object.entries(profile.tone_fingerprint)
                .map(([k, v]) => `${k} ${v.toFixed(2)}`)
                .join(" · ")}
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No profile yet (HTTP 404 is the expected response).
          </p>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 p-4 space-y-3">
        <h2 className="font-semibold">Memory</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={ingest}
            disabled={busy}
            className="px-3 py-2 rounded bg-primary-600 text-white text-sm disabled:opacity-50"
          >
            Create memory
          </button>
        </div>
        {ingestNote && <p className="text-sm text-gray-700">{ingestNote}</p>}

        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="Search your memory"
          />
          <button
            onClick={search}
            disabled={busy}
            className="px-3 py-2 rounded bg-gray-800 text-white text-sm disabled:opacity-50"
          >
            Retrieve
          </button>
        </div>

        {embedding && (
          <p className="text-xs text-gray-500">
            served by <span className="font-mono">{embedding}</span>
          </p>
        )}

        {results.length > 0 && (
          <ol className="space-y-2">
            {results.map((r) => (
              <li key={r.chunk_id} className="text-sm border border-gray-100 rounded p-2">
                <p className="flex justify-between text-xs text-gray-500">
                  <span>rank {r.rank} · score {r.score.toFixed(4)}</span>
                  <span className="font-mono">{r.source_type}</span>
                </p>
                <p className="mt-1">{r.text}</p>
              </li>
            ))}
          </ol>
        )}
        {results.length === 0 && (
          <p className="text-sm text-gray-500">No results yet.</p>
        )}
      </section>

      {error && (
        <p className="text-sm text-red-600 border border-red-200 rounded p-3">{error}</p>
      )}
    </div>
  );
}
