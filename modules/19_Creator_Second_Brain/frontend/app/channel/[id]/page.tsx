"use client";

import { Lightbulb, MessageCircleQuestion, Play, Search } from "lucide-react";
import { useState } from "react";
import ClipPlayer from "@/components/ClipPlayer";
import RichText from "@/components/RichText";
import { Badge, Button, Card, Empty, ErrorNote, PageHeader, Thumb, cn, inputCls } from "@/components/ui";
import { api, fmtDate, type AskResult, type Source } from "@/lib/api";
import { useChannel } from "@/lib/channel-context";

const EXAMPLES = [
  "Have I talked about burnout before?",
  "What have I said about growing a small channel?",
  "Did I ever recommend a specific tool or app?",
  "Have I covered my morning routine?",
];

const VERDICT = {
  covered: { tone: "good" as const, label: "Yes — you've covered this" },
  partially: { tone: "warn" as const, label: "Partially — you've touched on it" },
  new: { tone: "accent" as const, label: "New territory — you haven't covered this" },
};

export default function AskPage() {
  const { channelId } = useChannel();
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AskResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<Source | null>(null);

  const ask = async (q: string) => {
    if (!q.trim()) return;
    setQuestion(q);
    setLoading(true);
    setError(null);
    try {
      const r = await api.post<AskResult>(`/api/channels/${channelId}/ask`, { question: q });
      setResult(r);
      setPlaying(r.sources.find((s) => s.cited) ?? r.sources[0] ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const cite = (n: number) => {
    const s = result?.sources.find((x) => x.n === n);
    if (s) setPlaying(s);
  };

  return (
    <>
      <PageHeader title="Have I talked about this before?" subtitle="Ask anything. Answers come only from your own videos, with exact timestamps." />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            className={cn(inputCls, "pl-9")}
            placeholder="e.g. Have I ever talked about quitting my job?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </div>
        <Button type="submit" loading={loading} disabled={!question.trim()}>
          Ask
        </Button>
      </form>
      {!result && !loading && (
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((q) => (
            <button key={q} onClick={() => ask(q)} className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:border-accent hover:text-ink">
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6">
        <ErrorNote error={error} />
      </div>

      {!result && !loading && !error && (
        <div className="mt-6">
          <Empty icon={<MessageCircleQuestion className="size-8" />} title="Your back catalogue, one question away">
            Search is semantic: ask about ideas, not keywords. &ldquo;Staying consistent&rdquo; will find the moment you said &ldquo;I almost quit
            posting in 2023&rdquo;.
          </Empty>
        </div>
      )}

      {result && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
          <div className="space-y-4">
            <Card className="p-5">
              <Badge tone={VERDICT[result.verdict].tone}>{VERDICT[result.verdict].label}</Badge>
              <div className="mt-4 text-[15px]">
                <RichText text={result.answer} onCite={cite} />
              </div>
              {result.fresh_angle && (
                <div className="mt-4 flex gap-2 rounded-lg bg-surface-2 p-3 text-sm">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-warn" />
                  <span>
                    <span className="font-medium">Fresh angle: </span>
                    {result.fresh_angle}
                  </span>
                </div>
              )}
            </Card>

            <h3 className="pt-2 text-sm font-medium text-muted">Moments from your videos</h3>
            <div className="space-y-2">
              {result.sources.map((s) => (
                <button
                  key={s.n}
                  onClick={() => setPlaying(s)}
                  className={cn(
                    "flex w-full gap-3 rounded-xl border p-3 text-left transition-colors",
                    playing?.n === s.n ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-muted",
                  )}
                >
                  <div className="relative shrink-0">
                    <Thumb src={s.thumbnail} className="h-16 w-28" />
                    <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-white text-[10px] font-medium">{s.timestamp}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-violet-700">[{s.n}]</span>
                      <p className="truncate text-sm font-medium">{s.title}</p>
                      {s.cited && <Badge tone="accent">cited</Badge>}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{s.text}</p>
                    <p className="mt-1 text-[11px] text-muted">
                      {fmtDate(s.published_at)} · {Math.round(s.similarity * 100)}% match
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:sticky lg:top-36 lg:self-start">
            {playing ? (
              <Card className="overflow-hidden">
                <ClipPlayer clips={[{ videoId: playing.video_id, start: playing.start }]} index={0} />
                <div className="p-4">
                  <p className="text-sm font-medium">{playing.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    <Play className="mr-1 inline size-3" />
                    Starts at {playing.timestamp} ·{" "}
                    <a href={playing.url} target="_blank" rel="noreferrer" className="underline hover:text-ink">
                      open on YouTube
                    </a>
                  </p>
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
