"use client";

/**
 * Studio — the unified creator workspace (Phase 3).
 *
 * One workspace, not a collection of donor apps. The left rail is the workflow
 * (context → create → critique → refine), the centre is the working content, and
 * the bottom bar shows exactly which context was assembled for the last
 * generation.
 *
 * State split (task §30):
 *
 * - **Server state** (sessions, versions, capabilities, platforms) is fetched from
 *   the API and refetched after every mutation. It survives a refresh because it
 *   lives in PostgreSQL, not in this component.
 * - **Client state** (selected session, current step, the in-progress brief, the
 *   draft refinement instruction) is deliberately local. None of it is written to a
 *   global store: a single global store for this surface would be indistinguishable
 *   from keeping it all in one component, and would blur which half survives a
 *   refresh.
 *
 * Ownership is never sent from the browser.
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Brain,
  Check,
  ChevronDown,
  FileText,
  Layers,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Wand2,
  Mic,
} from "lucide-react";

import { studioApi, type CapabilityInfo, type StudioPlatform } from "@/lib/studio-api";
import type {
  ContextPreviewResponse,
  CritiqueResponse,
  GenerationResponse,
  RefinementModifier,
  SessionResponse,
  SessionStep,
  VersionInfo,
} from "@/lib/studio-api";

type TokenProvider = () => Promise<string | null>;

const WORKFLOW: Array<{ key: SessionStep | "context"; label: string; hint: string }> = [
  { key: "context", label: "Context", hint: "Memory, voice and prior work are assembled for you" },
  { key: "generate", label: "Create", hint: "Pick a capability and generate" },
  { key: "review", label: "Critique", hint: "Get structured feedback, then decide" },
  { key: "refine", label: "Refine", hint: "Revise on your instruction; the original is kept" },
];

const MODIFIERS: Array<{ value: RefinementModifier; label: string }> = [
  { value: "shorter", label: "Shorter" },
  { value: "more_casual", label: "More casual" },
  { value: "more_bold", label: "Bolder" },
  { value: "more_educational", label: "More educational" },
  { value: "simpler", label: "Simpler" },
];

/** Capability-specific payload builder from the capability's published input schema. */
function buildInput(
  capability: CapabilityInfo,
  topic: string,
  platform: string,
  durationSec: number,
): Record<string, unknown> {
  switch (capability.id) {
    case "idea":
      return { topic, count: 5 };
    case "hook":
      return { topic, platform, limit: 5 };
    case "script":
      return { topic, platform, duration_sec: durationSec };
    case "caption":
      return { topic, platform, count: 4 };
    case "repurpose":
      return { source_content: topic, platforms: ["reel", "linkedin", "x"] };
    case "cta":
      return { topic, goal: "engagement" };
    case "thumbnail":
      return { description: topic, content_type: "tutorial" };
    default:
      return { topic };
  }
}

/**
 * Suspense wrapper.
 *
 * `useSearchParams` opts a route out of static prerendering unless it sits under
 * a Suspense boundary, so the workspace is split out and wrapped. Without this,
 * `next build` fails to prerender `/studio`.
 */
export default function StudioPage() {
  return (
    <Suspense
      fallback={
        <div className="pt-24 pb-16 px-4 max-w-7xl mx-auto">
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading Studio…</p>
        </div>
      }
    >
      <StudioWorkspace />
    </Suspense>
  );
}

function StudioWorkspace() {
  // Today deep-links here with `?session=<id>` after the creator accepts a
  // recommendation (Phase 4 §17). Honour it, otherwise the handoff would drop
  // the creator into an unrelated session.
  const searchParams = useSearchParams();
  const deepLinkSession = searchParams.get("session");

  // ---- server state ----
  const [sessions, setSessions] = useState<SessionResponse[]>([]);
  const [capabilities, setCapabilities] = useState<CapabilityInfo[]>([]);
  const [platforms, setPlatforms] = useState<StudioPlatform[]>([]);
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [context, setContext] = useState<ContextPreviewResponse | null>(null);

  // ---- client state ----
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [step, setStep] = useState<SessionStep | "context">("context");
  const [capabilityId, setCapabilityId] = useState<string>("idea");
  const [platform, setPlatform] = useState<string>("reel");
  const [durationSec, setDurationSec] = useState(30);
  const [brief, setBrief] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [instruction, setInstruction] = useState("");
  const [modifier, setModifier] = useState<RefinementModifier | null>(null);
  const [critique, setCritique] = useState<CritiqueResponse | null>(null);

  // ---- ui state ----
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastOutput, setLastOutput] = useState<GenerationResponse | null>(null);

  const getToken = useCallback(async (): Promise<string | null> => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("sb-access-token");
  }, []);

  const selected = useMemo(
    () => sessions.find((s) => s.id === selectedId) ?? null,
    [sessions, selectedId],
  );
  const latestVersion = versions.length > 0 ? versions[versions.length - 1] : null;
  const capability = useMemo(
    () => capabilities.find((c) => c.id === capabilityId) ?? null,
    [capabilities, capabilityId],
  );
  const selectedPlatform = platforms.find((p) => p.key === platform) ?? null;

  // ---- loaders ----
  const loadSessions = useCallback(async () => {
    try {
      const body = await studioApi.listSessions(getToken);
      setSessions(body.sessions);
      setSelectedId((current) => current ?? body.sessions[0]?.id ?? null);
    } catch (exc) {
      setError(messageOf(exc));
    }
  }, [getToken]);

  const loadVersions = useCallback(async (sessionId: string) => {
    try {
      const body = await studioApi.versions(sessionId, getToken);
      setVersions(body.versions);
    } catch {
      setVersions([]);
    }
  }, [getToken]);

  const loadContext = useCallback(async (sessionId: string) => {
    try {
      setContext(await studioApi.contextPreview(sessionId, getToken));
    } catch {
      setContext(null);
    }
  }, [getToken]);

  useEffect(() => {
    void (async () => {
      try {
        const [caps, plats] = await Promise.all([
          studioApi.capabilities(getToken),
          studioApi.platforms(getToken),
        ]);
        setCapabilities(caps.capabilities);
        setPlatforms(plats.platforms);
      } catch (exc) {
        setError(messageOf(exc));
      }
    })();
    void loadSessions();
  }, [getToken, loadSessions]);

  useEffect(() => {
    if (deepLinkSession) {
      setSelectedId(deepLinkSession);
    }
  }, [deepLinkSession]);

  useEffect(() => {
    if (!selectedId) {
      setVersions([]);
      setContext(null);
      setCritique(null);
      setLastOutput(null);
      return;
    }
    void loadVersions(selectedId);
    void loadContext(selectedId);
    setStep((current) => current);
  }, [selectedId, loadVersions, loadContext]);

  // Reflect the server's workflow position when a session is picked.
  useEffect(() => {
    if (selected) setStep(selected.current_step as SessionStep);
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- actions ----
  async function createSession() {
    const title = newTitle.trim() || `Untitled ${new Date().toLocaleDateString()}`;
    setBusy("session");
    setError(null);
    try {
      const session = await studioApi.createSession(
        { title, brief: brief.trim() || null, idea_id: null },
        getToken,
      );
      setNewTitle("");
      setBrief("");
      setSelectedId(session.id);
      setStep("context");
      await loadSessions();
    } catch (exc) {
      setError(messageOf(exc));
    } finally {
      setBusy(null);
    }
  }

  async function refreshSession(id: string) {
    try {
      const fresh = await studioApi.getSession(id, getToken);
      setSessions((current) =>
        current.some((s) => s.id === id)
          ? current.map((s) => (s.id === id ? fresh : s))
          : [fresh, ...current],
      );
    } catch (exc) {
      setError(messageOf(exc));
    }
  }

  async function moveStep(next: SessionStep | "context") {
    setStep(next);
    if (!selectedId) return;
    try {
      await studioApi.updateSession(
        selectedId,
        { current_step: next as SessionStep },
        getToken,
      );
      await refreshSession(selectedId);
    } catch (exc) {
      setError(messageOf(exc));
    }
  }

  async function generate() {
    if (!selectedId || !capability) return;
    const topic = brief.trim() || selected?.brief?.trim() || selected?.title || "";
    if (!topic) {
      setError("Add a brief or topic first.");
      return;
    }
    setBusy("generate");
    setError(null);
    setNotice(null);
    setCritique(null);
    try {
      const result = await studioApi.generate(
        {
          session_id: selectedId,
          capability: capability.id,
          input: buildInput(capability, topic, platform, durationSec),
          platform,
          tone: null,
          goal: null,
          duration_sec: durationSec,
        },
        getToken,
      );
      setLastOutput(result);
      if (result.warnings?.length) {
        setNotice(result.warnings.join(" · "));
      }
      await Promise.all([
        loadVersions(selectedId),
        refreshSession(selectedId),
        loadContext(selectedId),
      ]);
      setStep("review");
    } catch (exc) {
      setError(messageOf(exc));
    } finally {
      setBusy(null);
    }
  }

  async function runCritique() {
    if (!selectedId) return;
    setBusy("critique");
    setError(null);
    try {
      const target = latestVersion?.id;
      setCritique(
        await studioApi.critique(
          { session_id: selectedId, generation_id: target ?? null, text: null },
          getToken,
        ),
      );
      await refreshSession(selectedId);
      setStep("refine");
    } catch (exc) {
      setError(messageOf(exc));
    } finally {
      setBusy(null);
    }
  }

  async function runRefine() {
    if (!selectedId) return;
    const text = instruction.trim();
    if (!text) {
      setError("Say what you want changed.");
      return;
    }
    setBusy("refine");
    setError(null);
    setNotice(null);
    try {
      const result = await studioApi.refine(
        {
          session_id: selectedId,
          instruction: text,
          modifier,
          generation_id: latestVersion?.id ?? null,
        },
        getToken,
      );
      setLastOutput(result);
      setInstruction("");
      setModifier(null);
      if (result.warnings?.length) setNotice(result.warnings.join(" · "));
      await Promise.all([loadVersions(selectedId), refreshSession(selectedId)]);
      setStep("review");
    } catch (exc) {
      setError(messageOf(exc));
    } finally {
      setBusy(null);
    }
  }

  async function approve(versionId: string, approved: boolean) {
    setBusy(`approve-${versionId}`);
    setError(null);
    try {
      await studioApi.approve(versionId, approved, getToken);
      if (selectedId) await loadVersions(selectedId);
    } catch (exc) {
      setError(messageOf(exc));
    } finally {
      setBusy(null);
    }
  }

  async function removeVersion(versionId: string) {
    setBusy(`delete-${versionId}`);
    setError(null);
    try {
      await studioApi.deleteVersion(versionId, getToken);
      if (selectedId) await loadVersions(selectedId);
    } catch (exc) {
      setError(messageOf(exc));
    } finally {
      setBusy(null);
    }
  }

  async function removeSession() {
    if (!selectedId) return;
    setBusy("delete-session");
    setError(null);
    try {
      await studioApi.deleteSession(selectedId, getToken);
      setSelectedId(null);
      setVersions([]);
      setCritique(null);
      setLastOutput(null);
      await loadSessions();
    } catch (exc) {
      setError(messageOf(exc));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="pt-24 pb-32 px-4 max-w-7xl mx-auto">
      <header className="mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Studio</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              One workspace: context, create, critique, refine. Publish-ready output
              stays yours — nothing is posted automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadSessions()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-800 dark:text-red-300"
        >
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* ---------------- left rail: sessions + workflow ---------------- */}
        <aside className="space-y-4">
          <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Sessions
            </h2>

            <div className="space-y-2 mb-3">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="New session title"
                aria-label="New session title"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => void createSession()}
                disabled={busy === "session"}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 text-white px-3 py-2 text-sm font-medium hover:bg-primary-700 disabled:opacity-60"
              >
                {busy === "session" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Start session
              </button>
            </div>

            <ul className="space-y-1 max-h-64 overflow-y-auto">
              {sessions.length === 0 && (
                <li className="text-sm text-gray-500 dark:text-gray-400">
                  No sessions yet.
                </li>
              )}
              {sessions.map((session) => (
                <li key={session.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(session.id)}
                    aria-current={session.id === selectedId}
                    className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                      session.id === selectedId
                        ? "bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent"
                    }`}
                  >
                    <span className="block font-medium truncate">{session.title}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      {session.current_step} · v{versions.length || 0}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {selected && (
              <button
                type="button"
                onClick={() => void removeSession()}
                disabled={busy === "delete-session"}
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete this session
              </button>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <h2 className="text-sm font-semibold mb-3">Workflow</h2>
            <ol className="space-y-1">
              {WORKFLOW.map((item) => {
                const active = item.key === step;
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => void moveStep(item.key)}
                      aria-current={active}
                      className={`w-full text-left rounded-lg px-3 py-2 text-sm ${
                        active
                          ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      <span className="font-medium">{item.label}</span>
                      <span
                        className={`block text-xs ${
                          active ? "opacity-80" : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {item.hint}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        </aside>

        {/* ---------------- centre: workspace ---------------- */}
        <main className="space-y-6">
          {!selected && (
            <section className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
              <FileText className="h-10 w-10 mx-auto text-gray-400 mb-3" />
              <h2 className="font-medium mb-1">No session selected</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Start a session to assemble context and generate.
              </p>
            </section>
          )}

          {selected && (
            <>
              {/* ---- context / brief ---- */}
              {step === "context" && (
                <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-4">
                  <header>
                    <h2 className="font-semibold flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      Brief
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      This becomes the retrieval query for your long-term memory and
                      the brief the capabilities work from.
                    </p>
                  </header>

                  <textarea
                    value={brief || selected.brief || ""}
                    onChange={(e) => setBrief(e.target.value)}
                    rows={4}
                    placeholder="What are you making? e.g. a reel about why launching midweek beats launching on Saturday"
                    aria-label="Studio brief"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  />

                  {context && (
                    <ContextPreview context={context} />
                  )}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => void moveStep("generate")}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary-600 text-white px-4 py-2 text-sm font-medium hover:bg-primary-700"
                    >
                      <Sparkles className="h-4 w-4" />
                      Continue to create
                    </button>
                  </div>
                </section>
              )}

              {/* ---- generate ---- */}
              {step === "generate" && (
                <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-4">
                  <header>
                    <h2 className="font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Create
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Every capability runs through the shared platform gateway with
                      your memory, voice and prior work in context.
                    </p>
                  </header>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Capability">
                      <select
                        value={capabilityId}
                        onChange={(e) => setCapabilityId(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                      >
                        {capabilities.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} — {c.classification}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Platform">
                      <select
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                      >
                        {platforms.map((p) => (
                          <option key={p.key} value={p.key}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  {selectedPlatform?.kind === "video" && (
                    <Field
                      label={`Duration — ${durationSec}s`}
                      hint={
                        selectedPlatform.default_duration_sec !== durationSec
                          ? `Platform default is ${selectedPlatform.default_duration_sec}s`
                          : undefined
                      }
                    >
                      <input
                        type="range"
                        min={5}
                        max={300}
                        step={5}
                        value={durationSec}
                        onChange={(e) => setDurationSec(Number(e.target.value))}
                        className="w-full"
                      />
                    </Field>
                  )}

                  {capability && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {capability.description}
                      {capability.donor.length > 0 && (
                        <> Adapted from {capability.donor.join(", ")}.</>
                      )}
                    </p>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => void generate()}
                      disabled={busy === "generate" || capabilities.length === 0}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary-600 text-white px-4 py-2 text-sm font-medium hover:bg-primary-700 disabled:opacity-60"
                    >
                      {busy === "generate" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Generate
                    </button>
                  </div>
                </section>
              )}

              {/* ---- output + critique ---- */}
              {(step === "review" || step === "refine") && (
                <section className="space-y-4">
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
                    <header className="flex items-center justify-between gap-3 flex-wrap mb-3">
                      <h2 className="font-semibold">Working content</h2>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void runCritique()}
                          disabled={busy === "critique"}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60"
                        >
                          {busy === "critique" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <MessageSquare className="h-3.5 w-3.5" />
                          )}
                          Critique
                        </button>
                        <button
                          type="button"
                          onClick={() => void moveStep("refine")}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <Wand2 className="h-3.5 w-3.5" />
                          Refine
                        </button>
                      </div>
                    </header>

                    {latestVersion?.text ? (
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed max-h-96 overflow-y-auto">
                        {latestVersion.text}
                      </pre>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Nothing generated yet in this session.
                      </p>
                    )}

                    {lastOutput && (
                      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                        v{lastOutput.version} · {lastOutput.prompt_name}@
                        {lastOutput.prompt_version} · {lastOutput.latency_ms}ms
                        {lastOutput.output_tokens
                          ? ` · ${lastOutput.output_tokens} tokens`
                          : ""}
                      </p>
                    )}
                  </div>

                  {notice && (
                    <p className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                      {notice}
                    </p>
                  )}

                  {critique && <CritiquePanel critique={critique} />}

                  {step === "refine" && (
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-3">
                      <h3 className="font-semibold text-sm">Refine</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Your original version is kept. Refinement creates the next
                        version.
                      </p>
                      <textarea
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        rows={3}
                        placeholder="What should change?"
                        aria-label="Refinement instruction"
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                      />
                      <div className="flex items-center gap-2 flex-wrap">
                        {MODIFIERS.map((m) => (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() =>
                              setModifier(modifier === m.value ? null : m.value)
                            }
                            className={`px-2.5 py-1 rounded-full text-xs border ${
                              modifier === m.value
                                ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                                : "border-gray-300 dark:border-gray-700"
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => void runRefine()}
                          disabled={busy === "refine"}
                          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 text-white px-4 py-2 text-sm font-medium hover:bg-primary-700 disabled:opacity-60"
                        >
                          {busy === "refine" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Wand2 className="h-4 w-4" />
                          )}
                          Refine
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* ---- version history ---- */}
              <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
                <h2 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Versions ({versions.length})
                </h2>
                {versions.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No versions yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {versions.map((version) => (
                      <li
                        key={version.id}
                        className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-sm font-medium">
                            v{version.version} · {version.capability}
                            {version.creator_approved && (
                              <span className="ml-2 inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                <Check className="h-3 w-3" />
                                approved
                              </span>
                            )}
                          </span>
                          <span className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                void approve(version.id, !version.creator_approved)
                              }
                              disabled={busy === `approve-${version.id}`}
                              className="text-xs text-gray-600 dark:text-gray-300 hover:underline disabled:opacity-60"
                            >
                              {version.creator_approved ? "Withdraw" : "Approve"}
                            </button>
                            <button
                              type="button"
                              onClick={() => void removeVersion(version.id)}
                              disabled={busy === `delete-${version.id}`}
                              aria-label={`Delete version ${version.version}`}
                              className="text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-60"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {version.prompt_name}@{version.prompt_version}
                          {version.created_at
                            ? ` · ${new Date(version.created_at).toLocaleString()}`
                            : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </main>
      </div>

      {/* ---- context bar: what the last generation actually used ---- */}
      {selected && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-4 flex-wrap text-xs">
            <span className="font-medium text-gray-500 dark:text-gray-400">
              Context
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5" />
              Memory {context?.memory_used ?? 0} chunk
              {(context?.memory_used ?? 0) === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Mic className="h-3.5 w-3.5" />
              Voice {context?.voice_available ? "matched" : "not set"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              Prior work {context?.prior_work_used ?? 0}
            </span>
            {context && context.notes.length > 0 && (
              <span className="inline-flex items-center gap-1 text-gray-400">
                <ChevronDown className="h-3.5 w-3.5" />
                {context.notes.join(", ")}
              </span>
            )}
            <span className="ml-auto text-gray-400">
              Studio ends at publish-ready content — you publish it yourself.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
        {label}
      </span>
      {children}
      {hint && (
        <span className="block text-xs text-gray-400 mt-1">{hint}</span>
      )}
    </label>
  );
}

function ContextPreview({ context }: { context: ContextPreviewResponse }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-xs font-medium"
      >
        <span>
          Context preview — memory {context.memory_used}, voice{" "}
          {context.voice_available ? "matched" : "not set"}, prior work{" "}
          {context.prior_work_used}
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="mt-3 space-y-3 text-xs">
          <Block title="Retrieved memory" body={context.retrieved_memory} />
          <Block title="Creator voice" body={context.creator_voice} />
          <Block title="Prior work" body={context.prior_work} />
          {context.notes.length > 0 && (
            <p className="text-gray-500 dark:text-gray-400">
              Notes: {context.notes.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Block({ title, body }: { title: string; body?: string | null }) {
  if (!body) {
    return (
      <div>
        <p className="font-medium mb-1">{title}</p>
        <p className="text-gray-400">Nothing yet.</p>
      </div>
    );
  }
  return (
    <div>
      <p className="font-medium mb-1">{title}</p>
      <pre className="whitespace-pre-wrap rounded bg-gray-50 dark:bg-gray-900 p-2 max-h-32 overflow-y-auto">
        {body}
      </pre>
    </div>
  );
}

function CritiquePanel({ critique }: { critique: CritiqueResponse }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
      <h3 className="font-semibold text-sm mb-1">Critique</h3>
      <p className="text-sm mb-3">{critique.verdict}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Score {critique.overall_score}/10 · nothing was changed; you decide what to
        do next.
      </p>

      {critique.items && critique.items.length > 0 && (
        <ul className="space-y-2 mb-3">
          {critique.items.map((item, index) => (
            <li
              key={`${item.dimension}-${index}`}
              className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2"
            >
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium">{item.dimension}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full ${
                    item.severity === "strong"
                      ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                      : item.severity === "medium"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  {item.severity}
                </span>
              </div>
              <p className="text-sm mt-1">{item.finding}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                → {item.suggestion}
              </p>
            </li>
          ))}
        </ul>
      )}

      {critique.strengths && critique.strengths.length > 0 && (
        <div>
          <p className="text-xs font-medium mb-1">Keep</p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc pl-5">
            {critique.strengths.map((strength, index) => (
              <li key={index}>{strength}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function messageOf(exc: unknown): string {
  if (exc instanceof Error) return exc.message;
  return "Something went wrong. Please retry.";
}
