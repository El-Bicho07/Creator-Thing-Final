"use client";

import { Check, Clapperboard, Copy, ExternalLink, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import ClipPlayer from "@/components/ClipPlayer";
import { Badge, Button, Card, Empty, ErrorNote, PageHeader, Spinner, Thumb, cn, inputCls } from "@/components/ui";
import { api, fmtDate, type Reel } from "@/lib/api";
import { useChannel } from "@/lib/channel-context";

const SCORE_LABELS: Record<string, string> = { hook: "Hook", standalone: "Stands alone", emotion: "Emotion", value: "Value" };

function scoreTone(score: number) {
  return score >= 75 ? "good" : score >= 55 ? "warn" : "neutral";
}

export default function ReelsPage() {
  const { channelId, overview } = useChannel();
  const [reels, setReels] = useState<Reel[] | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Reel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(
    async (q?: string) => {
      setLoading(true);
      try {
        const r = await api.get<Reel[]>(`/api/channels/${channelId}/reels${q ? `?q=${encodeURIComponent(q)}` : ""}`);
        setReels(r);
        setSelected(r[0] ?? null);
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [channelId],
  );

  useEffect(() => {
    api
      .get<Reel[]>(`/api/channels/${channelId}/reels`)
      .then((r) => {
        setReels(r);
        setSelected((cur) => cur ?? r[0] ?? null);
      })
      .catch((e) => setError(e.message));
  }, [channelId, overview?.reels]);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <PageHeader title="What can become a reel?" subtitle="Moments from your long videos that already work as a Short, scored by hook, stand-alone value, emotion and takeaway.">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load(query);
          }}
          className="flex w-full gap-2 sm:w-80"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input className={cn(inputCls, "pl-9")} placeholder="Filter by topic…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </form>
      </PageHeader>
      <ErrorNote error={error} />

      {reels === null ? (
        <Spinner label="Loading reel ideas…" />
      ) : reels.length === 0 ? (
        <Empty icon={<Clapperboard className="size-8" />} title="No reel candidates yet">
          They are generated during AI analysis. If indexing finished, check that GROQ_API_KEY is set and re-index.
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
          <div className={cn("scroll-thin space-y-2 lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto lg:pr-1", loading && "opacity-60")}>
            {reels.map((r, i) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className={cn(
                  "flex w-full gap-3 rounded-xl border p-3 text-left transition-colors",
                  selected?.id === r.id ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-muted",
                )}
              >
                <span className="w-5 pt-0.5 text-xs font-semibold text-muted tabular-nums">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium">&ldquo;{r.hook}&rdquo;</p>
                  <p className="mt-1 truncate text-xs text-muted">
                    {r.title} · {r.timestamp}
                  </p>
                </div>
                <Badge tone={scoreTone(r.score)} className="h-fit tabular-nums">
                  {Math.round(r.score)}
                </Badge>
              </button>
            ))}
          </div>

          {selected && (
            <div className="space-y-4 lg:sticky lg:top-36 lg:self-start">
              <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                <ClipPlayer clips={[{ videoId: selected.video_id, start: selected.start, end: selected.end }]} index={0} />
                <Card className="p-4">
                  <p className="text-xs text-muted">Reel score</p>
                  <p className="text-3xl font-semibold tabular-nums">{Math.round(selected.score)}</p>
                  <div className="mt-3 space-y-2">
                    {Object.entries(selected.scores).map(([k, v]) => (
                      <div key={k}>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted">{SCORE_LABELS[k] ?? k}</span>
                          <span className="tabular-nums">{v}/10</span>
                        </div>
                        <div className="mt-1 h-1 rounded-full bg-line">
                          <div className="h-full rounded-full bg-accent" style={{ width: `${v * 10}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-muted">{selected.duration}s clip</p>
                </Card>
              </div>

              <Card className="space-y-4 p-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Hook</p>
                  <p className="mt-1 text-lg font-medium">&ldquo;{selected.hook}&rdquo;</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Why it works</p>
                  <p className="mt-1 text-sm">{selected.reason}</p>
                </div>
                {selected.caption && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">Suggested caption</p>
                    <div className="mt-1 flex items-start gap-2 rounded-lg bg-surface-2 p-3 text-sm">
                      <span className="flex-1">{selected.caption}</span>
                      <Button variant="ghost" size="sm" onClick={() => copy(selected.caption)} aria-label="Copy caption">
                        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                      </Button>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Transcript</p>
                  <p className="mt-1 text-sm text-muted">{selected.transcript}</p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-xs text-muted">
                  <span className="flex items-center gap-2">
                    <Thumb src={selected.thumbnail} className="h-8 w-14" />
                    {selected.title} · {fmtDate(selected.published_at)} · {selected.timestamp}
                  </span>
                  <a href={selected.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-ink">
                    Open on YouTube <ExternalLink className="size-3" />
                  </a>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </>
  );
}
