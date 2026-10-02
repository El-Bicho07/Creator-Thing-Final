"use client";

import { ExternalLink, ListVideo, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import JobProgress from "@/components/JobProgress";
import { Badge, Empty, ErrorNote, PageHeader, Spinner, Thumb } from "@/components/ui";
import { api, fmtDate, fmtViews, type Job, type VideoRow } from "@/lib/api";
import { useChannel } from "@/lib/channel-context";
import { useJob } from "@/lib/useJob";

const STATUS: Record<string, { tone: "good" | "warn" | "bad" | "neutral" | "accent"; label: string }> = {
  analyzed: { tone: "good", label: "Analyzed" },
  transcribed: { tone: "accent", label: "Searchable" },
  pending: { tone: "neutral", label: "Pending" },
  no_transcript: { tone: "warn", label: "No captions" },
  blocked: { tone: "bad", label: "Blocked by YouTube" },
  failed: { tone: "bad", label: "AI analysis failed" },
};

const fmtDuration = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
};

export default function VideosPage() {
  const { channelId, overview, refresh } = useChannel();
  const [videos, setVideos] = useState<VideoRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .get<VideoRow[]>(`/api/channels/${channelId}/videos`)
      .then(setVideos)
      .catch((e) => setError(e.message));
  }, [channelId]);

  useEffect(load, [load, overview?.chunks, overview?.reels]);
  const job = useJob(jobId, () => {
    load();
    refresh();
  });

  const pick = (videoId: string) => {
    setTarget(videoId);
    fileInput.current?.click();
  };

  const upload = async (file: File) => {
    if (!target) return;
    setError(null);
    try {
      const j = await api.upload<Job>(`/api/videos/${target}/transcript`, file);
      setJobId(j.id);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const missing = videos?.filter((v) => v.status === "no_transcript" || v.status === "blocked").length ?? 0;

  return (
    <>
      <PageHeader title="Videos" subtitle="Everything indexed from your channel. Videos without captions can be added by uploading subtitles or audio." />
      <ErrorNote error={error} />
      {job && (
        <div className="mb-4">
          <JobProgress job={job} />
        </div>
      )}
      {missing > 0 && (
        <div className="mb-4 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">
          {missing} video{missing > 1 ? "s have" : " has"} no transcript. In <span className="text-ink">YouTube Studio → Subtitles</span> you can download
          your captions as <code>.srt</code>/<code>.vtt</code> and upload them here, or upload the audio (≤25&nbsp;MB) to transcribe it with Groq
          Whisper.
        </div>
      )}
      <input
        ref={fileInput}
        type="file"
        accept=".srt,.vtt,audio/*,.mp4,.webm"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />

      {videos === null ? (
        <Spinner label="Loading videos…" />
      ) : videos.length === 0 ? (
        <Empty icon={<ListVideo className="size-8" />} title="No videos yet" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-surface text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Video</th>
                <th className="px-4 py-3 font-medium">Published</th>
                <th className="px-4 py-3 text-right font-medium">Length</th>
                <th className="px-4 py-3 text-right font-medium">Views</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {videos.map((v) => {
                const s = STATUS[v.status] ?? { tone: "neutral" as const, label: v.status };
                return (
                  <tr key={v.id} className="hover:bg-surface">
                    <td className="px-4 py-2.5">
                      <a href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:text-ink">
                        <Thumb src={v.thumbnail} className="h-9 w-16 shrink-0" />
                        <span className="line-clamp-2 max-w-md">{v.title}</span>
                        <ExternalLink className="size-3 shrink-0 text-muted" />
                      </a>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted">{fmtDate(v.published_at)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted">{fmtDuration(v.duration_sec)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted">{fmtViews(v.view_count)}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={s.tone}>{s.label}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => pick(v.id)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-surface-2 hover:text-ink"
                        title="Upload subtitles (.srt/.vtt) or audio for this video"
                      >
                        <Upload className="size-3.5" /> {v.status === "no_transcript" || v.status === "blocked" ? "Add transcript" : "Replace"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
