"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import type { Job } from "@/lib/api";

export default function JobProgress({ job }: { job: Job }) {
  const pct = job.total ? Math.round((job.progress / job.total) * 100) : null;
  const running = job.status === "running" || job.status === "queued";
  return (
    <div className="rounded-xl border border-line bg-surface-2 p-4">
      <div className="flex items-center gap-2 text-sm">
        {running && <Loader2 className="size-4 animate-spin text-accent" />}
        {job.status === "done" && <CheckCircle2 className="size-4 text-good" />}
        {job.status === "failed" && <XCircle className="size-4 text-bad" />}
        <span className="font-medium">{job.stage || job.status}</span>
        {job.total > 0 && running && (
          <span className="ml-auto text-muted tabular-nums">
            {job.progress}/{job.total}
          </span>
        )}
      </div>
      {running && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
          <div
            className={pct == null ? "h-full w-1/3 animate-pulse rounded-full bg-accent" : "h-full rounded-full bg-accent transition-all"}
            style={pct == null ? undefined : { width: `${Math.max(pct, 3)}%` }}
          />
        </div>
      )}
      {job.message && <p className={`mt-2 text-sm ${job.status === "failed" ? "text-bad" : "text-muted"}`}>{job.message}</p>}
    </div>
  );
}
