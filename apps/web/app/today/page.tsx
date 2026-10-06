"use client";

/**
 * TODAY — the creator's operational dashboard (Phase 4).
 *
 * Today answers, in order: what should I do now, and why? It is an execution
 * surface, not an analytics dashboard, so the hierarchy is deliberately
 * action-first: one priority, then the rest, then history.
 *
 * Producer boundary, kept visible in the UI:
 * - the Producer recommends, the creator decides;
 * - accepting a recommendation opens Studio — it never generates here;
 * - nothing is published, and nothing is auto-approved.
 *
 * State split: server state (plan, carryover, producer run) is fetched and
 * refetched; client state (draft title, expanded reasoning, busy flags) is local.
 * No global store.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  Check,
  CircleDashed,
  Clock,
  Loader2,
  ListChecks,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Wand2,
  Zap,
} from "lucide-react";

import { producerApi, todayApi } from "@/lib/today-api";
import type {
  ProducerRecommendation,
  TodayItem,
  TodayItemStatus,
  TodayPlanResponse,
} from "@/lib/today-api";

type TokenProvider = () => Promise<string | null>;

const OPEN_STATES: TodayItemStatus[] = ["planned", "in_progress"];

const ACTION_LABEL: Record<string, string> = {
  create_content: "Create",
  quick_engage: "Quick engage",
  build_trust: "Build trust",
  continue_draft: "Continue draft",
  refine_content: "Refine",
  repurpose: "Repurpose",
  review_idea: "Review idea",
  publish_prep: "Prepare to publish",
};

const PRIORITY_STYLE: Record<string, string> = {
  high: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  low: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

export default function TodayPage() {
  const router = useRouter();

  // ---- server state ----
  const [plan, setPlan] = useState<TodayPlanResponse | null>(null);
  // Distinguishes "not fetched yet" from "fetched, and there is genuinely nothing
  // planned". Without this the page briefly claims the day is empty while the
  // request is in flight -- and invites the creator to run the Producer over a plan
  // that already exists.
  const [loading, setLoading] = useState(true);
  const [producerMessage, setProducerMessage] = useState<string | null>(null);

  // ---- client state ----
  const [newTitle, setNewTitle] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [budget, setBudget] = useState(120);

  // ---- ui state ----
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const getToken = useCallback(async (): Promise<string | null> => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("sb-access-token");
  }, []);

  const load = useCallback(async () => {
    try {
      setPlan(await todayApi.getPlan(undefined, getToken));
    } catch (exc) {
      setError(messageOf(exc));
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = plan?.items ?? [];
  const open = useMemo(() => items.filter((i) => OPEN_STATES.includes(i.status)), [items]);
  const done = useMemo(
    () => items.filter((i) => !OPEN_STATES.includes(i.status)),
    [items],
  );
  const priority = open.length > 0 ? open[0] : null;

  // ---- actions ----

  async function runProducer() {
    setBusy("produce");
    setError(null);
    setNotice(null);
    try {
      // Preview first so the creator sees WHY before anything is persisted.
      const preview = await producerApi.recommend(
        { time_budget_minutes: budget },
        getToken,
      );
      if (!preview.has_action) {
        setProducerMessage(preview.message);
        setNotice("The Producer found nothing worth planning today.");
        return;
      }
      const created = await todayApi.createPlan(
        { time_budget_minutes: budget },
        getToken,
      );
      setPlan((current) =>
        current
          ? { ...current, items: created.items, total: created.total }
          : current,
      );
      const skipped = created.run.skipped_duplicates;
      setNotice(
        skipped > 0
          ? `Planned ${created.run.created_items} item(s); ${skipped} already on today's plan.`
          : `Planned ${created.run.created_items} item(s).`,
      );
      setProducerMessage(null);
    } catch (exc) {
      setError(messageOf(exc));
    } finally {
      setBusy(null);
    }
  }

  async function accept(item: TodayItem) {
    setBusy(`accept-${item.id}`);
    setError(null);
    setNotice(null);
    try {
      const handoff = await producerApi.execute({ item_id: item.id }, getToken);
      await load();
      setNotice(handoff.message);
      // Hand off to Studio, which owns generation.
      router.push(`/studio?session=${handoff.studio_session_id}`);
    } catch (exc) {
      setError(messageOf(exc));
    } finally {
      setBusy(null);
    }
  }

  async function setStatus(item: TodayItem, next: TodayItemStatus) {
    setBusy(`status-${item.id}`);
    setError(null);
    try {
      await todayApi.setStatus(item.id, next, getToken);
      await load();
    } catch (exc) {
      setError(messageOf(exc));
    } finally {
      setBusy(null);
    }
  }

  async function addManual() {
    const title = newTitle.trim();
    if (!title) return;
    setBusy("add");
    setError(null);
    try {
      await todayApi.addItem({ title, estimated_minutes: 30 }, getToken);
      setNewTitle("");
      await load();
    } catch (exc) {
      setError(messageOf(exc));
    } finally {
      setBusy(null);
    }
  }

  async function remove(item: TodayItem) {
    setBusy(`delete-${item.id}`);
    setError(null);
    try {
      await todayApi.deleteItem(item.id, getToken);
      await load();
    } catch (exc) {
      setError(messageOf(exc));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="pt-24 pb-16 px-4 max-w-5xl mx-auto">
      <header className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Today</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              What to work on, and why. You decide; Studio creates.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void runProducer()}
              disabled={busy === "produce"}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 text-white px-4 py-2 text-sm font-medium hover:bg-primary-700 disabled:opacity-60"
            >
              {busy === "produce" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Plan my day
            </button>
          </div>
        </div>

        <label className="mt-3 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Time budget {budget}m
          </span>
          <input
            type="range"
            min={15}
            max={360}
            step={15}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="flex-1 max-w-xs"
          />
        </label>
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
      {notice && (
        <p className="mb-4 rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-950/30 px-4 py-3 text-sm text-primary-800 dark:text-primary-300">
          {notice}
        </p>
      )}

      {/* ---- priority ---- */}
      {priority && (
        <section className="mb-6 rounded-xl border-2 border-primary-300 dark:border-primary-800 bg-white dark:bg-gray-800 p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-primary-700 dark:text-primary-300 mb-1">
            <Zap className="h-3.5 w-3.5" />
            YOUR PRIORITY
          </div>
          <h2 className="text-xl font-semibold">{priority.title}</h2>
          {priority.reason && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {priority.reason}
            </p>
          )}
          <ItemActions
            item={priority}
            busy={busy}
            onAccept={() => void accept(priority)}
            onStatus={(next) => void setStatus(priority, next)}
          />
        </section>
      )}

      {/* ---- rest of the plan ---- */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
          <ListChecks className="h-4 w-4" />
          Recommended actions
        </h2>

        {loading ? (
          <div
            className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <Loader2 className="h-8 w-8 mx-auto text-gray-400 mb-2 animate-spin" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading today&rsquo;s plan&hellip;</p>
          </div>
        ) : open.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
            <CircleDashed className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {producerMessage ??
                "Nothing planned for today. Run the Producer, or add work yourself."}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {open.map((item) => (
              <li key={item.id}>
                <ItemCard
                  item={item}
                  expanded={expanded === item.id}
                  onToggle={() =>
                    setExpanded(expanded === item.id ? null : item.id)
                  }
                />
                <ItemActions
                  item={item}
                  busy={busy}
                  onAccept={() => void accept(item)}
                  onStatus={(next) => void setStatus(item, next)}
                />
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex items-center gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void addManual();
            }}
            placeholder="Add your own task for today"
            aria-label="Add a task"
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void addManual()}
            disabled={busy === "add" || !newTitle.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </section>

      {/* ---- completed ---- */}
      {done.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
            In progress &amp; completed
          </h2>
          <ul className="space-y-2">
            {done.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
              >
                <span
                  className={`truncate ${
                    item.status === "completed"
                      ? "text-gray-400 line-through"
                      : ""
                  }`}
                >
                  {item.title}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {item.status.replace("_", " ")}
                  </span>
                  {item.status === "in_progress" && (
                    <button
                      type="button"
                      onClick={() => void setStatus(item, "completed")}
                      className="text-xs text-green-600 dark:text-green-400 hover:underline"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void remove(item)}
                    aria-label={`Delete ${item.title}`}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-8 text-xs text-gray-400">
        Today ends at publish-ready content. Nothing is posted anywhere
        automatically.
      </p>
    </div>
  );
}

function ItemCard({
  item,
  expanded,
  onToggle,
}: {
  item: TodayItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium truncate">{item.title}</h3>
          <div className="mt-1 flex items-center gap-2 flex-wrap text-xs">
            {item.action_kind && (
              <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-gray-700 dark:text-gray-300">
                {ACTION_LABEL[item.action_kind] ?? item.action_kind}
              </span>
            )}
            <span
              className={`rounded-full px-2 py-0.5 ${
                PRIORITY_STYLE[item.priority] ?? PRIORITY_STYLE.medium
              }`}
            >
              {item.priority}
            </span>
            <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <Clock className="h-3 w-3" />
              {item.estimated_minutes}m
            </span>
            {item.capability && (
              <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <Wand2 className="h-3 w-3" />
                {item.capability}
              </span>
            )}
          </div>
        </div>
      </div>

      {item.reason && (
        <div className="mt-2">
          <p className={`text-sm text-gray-600 dark:text-gray-400 ${expanded ? "" : "line-clamp-2"}`}>
            {item.reason}
          </p>
          {item.reason.length > 120 && (
            <button
              type="button"
              onClick={onToggle}
              className="mt-1 text-xs text-primary-600 dark:text-primary-400 hover:underline"
            >
              {expanded ? "Show less" : "Why this?"}
            </button>
          )}
        </div>
      )}

      {expanded && item.evidence && item.evidence.length > 0 && (
        <div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <p className="text-xs font-medium mb-1 flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5" />
            Evidence ({item.evidence.length})
          </p>
          <ul className="space-y-1">
            {item.evidence.slice(0, 5).map((e, index) => (
              <li key={`${e.kind}-${index}`} className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium">{e.kind.replace("_", " ")}</span>
                {e.summary ? ` — ${e.summary.slice(0, 120)}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ItemActions({
  item,
  busy,
  onAccept,
  onStatus,
}: {
  item: TodayItem;
  busy: string | null;
  onAccept: () => void;
  onStatus: (next: TodayItemStatus) => void;
}) {
  const canExecute = Boolean(item.capability) && item.source === "producer";
  return (
    <div className="mt-3 flex items-center gap-2 flex-wrap">
      {canExecute && (
        <button
          type="button"
          onClick={onAccept}
          disabled={busy === `accept-${item.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-primary-700 disabled:opacity-60"
        >
          {busy === `accept-${item.id}` ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ArrowRight className="h-3.5 w-3.5" />
          )}
          Start in Studio
        </button>
      )}
      {item.status === "planned" && (
        <button
          type="button"
          onClick={() => onStatus("in_progress")}
          disabled={busy === `status-${item.id}`}
          className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
        >
          I'm on it
        </button>
      )}
      {item.status === "in_progress" && (
        <button
          type="button"
          onClick={() => onStatus("completed")}
          disabled={busy === `status-${item.id}`}
          className="rounded-lg border border-green-300 dark:border-green-800 px-3 py-1.5 text-xs text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 disabled:opacity-60"
        >
          Mark done
        </button>
      )}
      {(item.status === "planned" || item.status === "in_progress") && (
        <>
          <button
            type="button"
            onClick={() => onStatus("skipped")}
            disabled={busy === `status-${item.id}`}
            className="text-xs text-gray-500 dark:text-gray-400 hover:underline disabled:opacity-60"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => onStatus("blocked")}
            disabled={busy === `status-${item.id}`}
            className="text-xs text-amber-600 dark:text-amber-400 hover:underline disabled:opacity-60"
          >
            Blocked
          </button>
        </>
      )}
    </div>
  );
}

function messageOf(exc: unknown): string {
  if (exc instanceof Error) return exc.message;
  return "Something went wrong. Please retry.";
}
