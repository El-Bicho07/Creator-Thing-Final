"use client";

import { Brain, Clapperboard, GitCompareArrows, Handshake, MessageCircleQuestion, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import JobProgress from "@/components/JobProgress";
import { Button, Card, ErrorNote, Thumb, inputCls } from "@/components/ui";
import { api, type ChannelSummary, type Health, type Job } from "@/lib/api";
import { useJob } from "@/lib/useJob";

const FEATURES = [
  { icon: MessageCircleQuestion, title: "Have I said this before?", text: "Semantic search across every video, with timestamps." },
  { icon: Clapperboard, title: "Reel finder", text: "Moments that already work as a Short, ranked." },
  { icon: Handshake, title: "Promise Ledger", text: "Every “I'll make a part 2”, and whether you did." },
  { icon: GitCompareArrows, title: "Opinion Drift", text: "Where your views changed or contradict each other." },
  { icon: Sparkles, title: "Ghost Clip Composer", text: "New Shorts stitched from moments across old videos." },
];

export default function Home() {
  const router = useRouter();
  const [health, setHealth] = useState<Health | null>(null);
  const [channels, setChannels] = useState<ChannelSummary[]>([]);
  const [input, setInput] = useState("");
  const [maxVideos, setMaxVideos] = useState(30);
  const [jobId, setJobId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<Health>("/api/health").then(setHealth).catch((e) => setError(e.message));
    api.get<ChannelSummary[]>("/api/channels").then(setChannels).catch(() => {});
  }, []);

  const job = useJob(jobId);

  const start = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const j = await api.post<Job>("/api/index", { channel: input, max_videos: maxVideos });
      setJobId(j.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const running = job && (job.status === "queued" || job.status === "running");

  return (
    <main className="mx-auto w-full max-w-[1760px] px-4 py-8 sm:px-6 sm:py-12 lg:px-10">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Brain className="size-5 text-accent" /> Creator Second Brain
      </div>
      <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">
        Everything you&apos;ve ever said on YouTube, searchable and reusable.
      </h1>
      <p className="mt-4 max-w-xl text-muted">
        Paste your channel. We index every transcript so you can find what you said, turn old moments into Shorts,
        track your promises and see how your opinions evolved.
      </p>

      {health && (!health.youtube_key || !health.groq_key) && (
        <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-warn">
          Missing in <code>.env</code>: {[!health.youtube_key && "YOUTUBE_API_KEY", !health.groq_key && "GROQ_API_KEY"].filter(Boolean).join(", ")}.
          Add {!health.youtube_key && !health.groq_key ? "them" : "it"} and restart the backend.
        </div>
      )}

      <Card className="mt-6 p-5">
        <form onSubmit={start} className="flex flex-col gap-3 sm:flex-row">
          <input
            className={inputCls}
            placeholder="https://youtube.com/@yourchannel  or  @handle"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!!running}
          />
          <select
            className={`${inputCls} sm:w-40`}
            value={maxVideos}
            onChange={(e) => setMaxVideos(Number(e.target.value))}
            disabled={!!running}
            aria-label="Number of latest videos to index"
          >
            {[10, 30, 50, 100, 200].map((n) => (
              <option key={n} value={n}>
                Latest {n} videos
              </option>
            ))}
          </select>
          <Button type="submit" loading={submitting} disabled={!input.trim() || !!running} className="sm:w-40">
            Build my brain
          </Button>
        </form>
        <div className="mt-4 space-y-3">
          <ErrorNote error={error} />
          {job && <JobProgress job={job} />}
          {job?.channel_id && (
            <Button variant="outline" onClick={() => router.push(`/channel/${job.channel_id}`)}>
              {running ? "Open channel while indexing →" : "Open channel →"}
            </Button>
          )}
        </div>
      </Card>

      {channels.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium text-muted">Your channels</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {channels.map((c) => (
              <Link key={c.id} href={`/channel/${c.id}`}>
                <Card className="flex items-center gap-3 p-4 transition-colors hover:border-accent">
                  <Thumb src={c.thumbnail} className="size-10 rounded-full" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.title}</p>
                    <p className="text-sm text-muted">
                      {c.handle ?? c.id} · {c.videos} videos
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-xl border border-line p-4">
            <Icon className="size-5 text-accent" />
            <p className="mt-3 font-medium">{title}</p>
            <p className="mt-1 text-sm text-muted">{text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
