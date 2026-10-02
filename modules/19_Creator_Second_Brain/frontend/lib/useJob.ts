"use client";

import { useEffect, useState } from "react";
import { api, type Job } from "./api";

/** Poll a background job until it finishes. */
export function useJob(jobId: number | null, onDone?: (job: Job) => void) {
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    if (jobId == null) return;
    let stop = false;
    const tick = async () => {
      try {
        const j = await api.get<Job>(`/api/jobs/${jobId}`);
        if (stop) return;
        setJob(j);
        if (j.status === "done" || j.status === "failed") {
          onDone?.(j);
          return;
        }
      } catch {}
      if (!stop) setTimeout(tick, 1500);
    };
    tick();
    return () => {
      stop = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  return job;
}
