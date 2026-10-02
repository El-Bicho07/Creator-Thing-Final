"use client";

import { ArrowRight, CheckCircle2, CircleDashed, ExternalLink, Handshake, RefreshCw, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import JobProgress from "@/components/JobProgress";
import { Badge, Button, Card, Empty, ErrorNote, PageHeader, Spinner, Thumb, cn } from "@/components/ui";
import { api, fmtDate, type Job, type PromiseRow } from "@/lib/api";
import { useChannel } from "@/lib/channel-context";
import { useJob } from "@/lib/useJob";

type Filter = "all" | "open" | "fulfilled" | "dismissed";

const STATUS = {
  open: { tone: "warn" as const, label: "Open", icon: CircleDashed },
  fulfilled: { tone: "good" as const, label: "Kept", icon: CheckCircle2 },
  dismissed: { tone: "neutral" as const, label: "Dismissed", icon: XCircle },
};

export default function PromisesPage() {
  const { channelId, overview } = useChannel();
  const [rows, setRows] = useState<PromiseRow[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<number | null>(null);

  const load = useCallback(() => {
    api
      .get<PromiseRow[]>(`/api/channels/${channelId}/promises`)
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [channelId]);

  useEffect(load, [load, overview?.promises]);
  const job = useJob(jobId, load);

  const counts = useMemo(() => {
    const c = { all: rows?.length ?? 0, open: 0, fulfilled: 0, dismissed: 0 };
    rows?.forEach((r) => c[r.status]++);
    return c;
  }, [rows]);
  const tracked = counts.open + counts.fulfilled;
  const keepRate = tracked ? Math.round((counts.fulfilled / tracked) * 100) : 0;

  const setStatus = async (id: number, status: PromiseRow["status"]) => {
    try {
      await api.patch(`/api/promises/${id}`, { status });
      setRows((rs) => rs?.map((r) => (r.id === id ? { ...r, status, manual: true, evidence: "Set manually by you." } : r)) ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const recheck = async () => {
    try {
      const j = await api.post<Job>(`/api/channels/${channelId}/promises/recheck`);
      setJobId(j.id);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const visible = rows?.filter((r) => filter === "all" || r.status === filter) ?? [];
  const recheckRunning = job && (job.status === "running" || job.status === "queued");

  return (
    <>
      <PageHeader title="Promise Ledger" subtitle="Every commitment you made on camera (“part 2 coming soon”, “I'll review this in 6 months”) and whether a later video delivered it.">
        <Button variant="outline" size="sm" onClick={recheck} loading={!!recheckRunning}>
          <RefreshCw className="size-3.5" /> Re-check against new videos
        </Button>
      </PageHeader>
      <ErrorNote error={error} />
      {job && recheckRunning && (
        <div className="mb-4">
          <JobProgress job={job} />
        </div>
      )}

      {rows === null ? (
        <Spinner label="Loading promises…" />
      ) : rows.length === 0 ? (
        <Empty icon={<Handshake className="size-8" />} title="No promises found yet">
          Promises are extracted during AI analysis. If you never said &ldquo;I&apos;ll make a video about…&rdquo;, you have a clean record!
        </Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Promises made", value: counts.all },
              { label: "Kept", value: counts.fulfilled, cls: "text-good" },
              { label: "Still open", value: counts.open, cls: "text-warn" },
              { label: "Keep rate", value: `${keepRate}%` },
            ].map((s) => (
              <Card key={s.label} className="p-4">
                <p className="text-xs text-muted">{s.label}</p>
                <p className={cn("mt-1 text-2xl font-semibold tabular-nums", s.cls)}>{s.value}</p>
              </Card>
            ))}
          </div>
          {counts.open > 0 && (
            <p className="mt-3 text-sm text-muted">
              💡 Your {counts.open} open promise{counts.open === 1 ? " is a video idea" : "s are video ideas"} your audience already asked for.
            </p>
          )}

          <div className="mt-6 flex gap-1 border-b border-line">
            {(["all", "open", "fulfilled", "dismissed"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "-mb-px border-b-2 px-3 pb-2 text-sm capitalize",
                  filter === f ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink",
                )}
              >
                {f === "fulfilled" ? "kept" : f} <span className="text-xs tabular-nums text-muted">{counts[f]}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            {visible.map((p) => {
              const s = STATUS[p.status];
              return (
                <Card key={p.id} className="p-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <Badge tone={s.tone}>
                      <s.icon className="size-3" /> {s.label}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{p.promise}</p>
                      <p className="mt-1 text-sm italic text-muted">&ldquo;{p.quote}&rdquo;</p>
                    </div>
                    <Badge>{p.kind}</Badge>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                    <a href={p.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-line px-2 py-1.5 hover:border-muted">
                      <Thumb src={p.thumbnail} className="h-7 w-12" />
                      <span className="max-w-60 truncate">{p.title}</span>
                      <span className="text-muted">
                        {fmtDate(p.published_at)} · {p.timestamp}
                      </span>
                    </a>
                    {p.fulfilled_by && (
                      <>
                        <ArrowRight className="size-4 text-good" />
                        <a
                          href={p.fulfilled_by.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-good"
                        >
                          <span className="max-w-60 truncate">{p.fulfilled_by.title}</span> · {p.fulfilled_by.timestamp}
                          <ExternalLink className="size-3" />
                        </a>
                      </>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                    <p className="text-xs text-muted">{p.evidence}</p>
                    <div className="flex gap-1">
                      {p.status !== "fulfilled" && (
                        <Button variant="ghost" size="sm" onClick={() => setStatus(p.id, "fulfilled")}>
                          Mark kept
                        </Button>
                      )}
                      {p.status !== "open" && (
                        <Button variant="ghost" size="sm" onClick={() => setStatus(p.id, "open")}>
                          Reopen
                        </Button>
                      )}
                      {p.status !== "dismissed" && (
                        <Button variant="ghost" size="sm" onClick={() => setStatus(p.id, "dismissed")}>
                          Dismiss
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
