"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Stack } from "@/components/deck";
import { Button, buttonClass, Chip, Icon } from "@/components/ui";
import type { HistoryEntry } from "@/lib/cta/schema";
import { overusedPhrases } from "@/lib/cta/strategy";
import { ANGLE_IDS, ANGLES, FORMATS, GOALS, SLOTS } from "@/lib/cta/taxonomy";
import {
  clearHistory,
  exportHistory,
  isStorageAvailable,
  loadHistory,
  mergeHistory,
  parseHistoryImport,
  removeHistory,
} from "@/lib/storage";

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

// Stats sit in one panel: stacked in a sidebar on wide screens, side by side in between, stacked on phones.
const STAT_BLOCK =
  "min-w-0 border-t border-line pt-6 first:border-t-0 first:pt-0 md:border-l md:border-t-0 md:pl-6 md:pt-0 md:first:border-l-0 md:first:pl-0 xl:border-l-0 xl:border-t xl:pl-0 xl:pt-6 xl:first:border-t-0 xl:first:pt-0";

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadHistory().then(setEntries);
  }, []);

  if (!entries) {
    return (
      <div className="px-gutter pb-16 pt-28">
        <div className="shimmer h-10 w-64 rounded-full" />
      </div>
    );
  }

  const angleCounts = ANGLE_IDS.map((a) => ({ angle: a, count: entries.filter((e) => e.angle === a).length }))
    .filter((a) => a.count > 0)
    .sort((a, b) => b.count - a.count);
  const max = Math.max(1, ...angleCounts.map((a) => a.count));
  const phrases = overusedPhrases(entries);
  const groups = entries.reduce<Record<string, HistoryEntry[]>>((acc, e) => {
    (acc[dayLabel(e.usedAt)] ??= []).push(e);
    return acc;
  }, {});

  function download() {
    const blob = new Blob([exportHistory(entries ?? [])], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cue-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importFile(file: File) {
    const result = parseHistoryImport(await file.text());
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setEntries(await mergeHistory(result.entries));
    setMessage(`Imported ${result.entries.length} CTAs.`);
  }

  return (
    <div className="px-gutter pb-16 pt-24">
      <header className="flex flex-wrap items-end justify-between gap-4 px-1">
        <div className="min-w-0">
          <h1 className="font-heading text-[clamp(2.25rem,4vw,3.25rem)] font-bold leading-tight">CTA history</h1>
          <p className="mt-2 max-w-xl leading-relaxed text-ink-muted">
            Everything you&apos;ve saved from the studio. Cue checks every new CTA against this list so you don&apos;t repeat yourself.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
          <Button size="sm" icon="upload" onClick={() => fileRef.current?.click()}>
            Import
          </Button>
          <Button size="sm" icon="download" onClick={download} disabled={!entries.length}>
            Export
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon="delete"
            disabled={!entries.length}
            onClick={async () => {
              if (confirm("Delete your whole CTA history?")) setEntries(await clearHistory());
            }}
          >
            Clear
          </Button>
        </div>
      </header>

      {!isStorageAvailable() && (
        <p className="mt-4 flex gap-2 rounded-card bg-watch-bg px-4 py-3 text-sm text-watch">
          <Icon name="warning" size={18} />
          Your browser is blocking storage, so history only lasts for this visit.
        </p>
      )}
      {message && (
        <p role="status" className="glass mt-4 rounded-card px-4 py-3 text-sm">
          {message}
        </p>
      )}

      {entries.length === 0 ? (
        <div className="glass mt-8 flex min-h-[26rem] flex-col items-center justify-center rounded-panel px-6 py-12 text-center">
          <Stack className="w-full max-w-[15rem]">
            <div className="grid place-items-center p-6">
              <Icon name="history" size={36} className="text-ink-muted" />
            </div>
          </Stack>
          <h2 className="mt-8 font-heading text-2xl font-bold">Nothing saved yet</h2>
          <p className="mt-2 max-w-md leading-relaxed text-ink-muted">
            Generate a kit in the studio and hit “Save picks”. From then on, Cue steers away from what you&apos;ve already said.
          </p>
          <Link href="/studio" className={buttonClass("primary", "md", "mt-6")}>
            <Icon name="auto_awesome" size={18} /> Open the studio
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid items-start gap-5 xl:grid-cols-[minmax(19rem,23rem)_minmax(0,1fr)]">
          <aside aria-label="Summary" className="glass grid gap-6 rounded-panel p-6 md:grid-cols-3 xl:sticky xl:top-24 xl:grid-cols-1">
            <div className={STAT_BLOCK}>
              <p className="text-sm text-ink-muted">CTAs saved</p>
              <p className="mt-1 font-heading text-5xl font-bold tabular-nums">{entries.length}</p>
            </div>
            <div className={STAT_BLOCK}>
              <p className="text-sm text-ink-muted">Angle mix</p>
              <ul className="mt-3 grid gap-2">
                {angleCounts.slice(0, 5).map((a) => (
                  <li key={a.angle} className="grid grid-cols-[5.5rem_minmax(0,1fr)_1.5rem] items-center gap-2 text-sm">
                    <span className="truncate">{ANGLES[a.angle].label}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-surface-2">
                      <span className="block h-full rounded-full bg-ink-muted" style={{ width: `${(a.count / max) * 100}%` }} />
                    </span>
                    <span className="text-right tabular-nums text-ink-muted">{a.count}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={STAT_BLOCK}>
              <p className="text-sm text-ink-muted">Phrases you lean on</p>
              {phrases.length ? (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {phrases.map((p) => (
                    <li key={p.phrase} className="min-w-0 max-w-full">
                      <Chip className="!border-transparent !bg-watch-bg !text-watch">
                        “{p.phrase}” ×{p.count}
                      </Chip>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm">No repeats yet. Nice.</p>
              )}
            </div>
          </aside>

          <div className="grid min-w-0 gap-5">
            {Object.entries(groups).map(([day, items]) => (
              <section key={day} aria-label={day} className="glass rounded-panel p-2 sm:p-3">
                <h2 className="px-3 pb-1 pt-3 font-heading text-lg font-bold">{day}</h2>
                <ul className="divide-y divide-line">
                  {items.map((e) => (
                    <li key={e.id} className="flex items-start gap-3 px-3 py-4">
                      <Icon name={SLOTS[e.slot].icon} className="mt-0.5 text-ink-muted" />
                      <div className="min-w-0 flex-1">
                        <p className="leading-relaxed [overflow-wrap:anywhere]">{e.text}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Chip>{SLOTS[e.slot].label}</Chip>
                          <Chip>{ANGLES[e.angle].label}</Chip>
                          <Chip icon={GOALS[e.goal].icon}>{GOALS[e.goal].label}</Chip>
                          <Chip icon={FORMATS[e.format].icon}>{FORMATS[e.format].label}</Chip>
                        </div>
                      </div>
                      <button
                        aria-label="Delete this CTA"
                        onClick={async () => setEntries(await removeHistory(e.id))}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface-2/70 hover:text-risky"
                      >
                        <Icon name="delete" size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
