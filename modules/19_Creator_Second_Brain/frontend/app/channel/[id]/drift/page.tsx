"use client";

import { ExternalLink, GitCompareArrows, Lightbulb, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, Button, Card, Empty, ErrorNote, PageHeader, Spinner, Thumb, cn, inputCls } from "@/components/ui";
import { api, fmtDate, type DriftPoint, type DriftResult, type DriftTopic } from "@/lib/api";
import { useChannel } from "@/lib/channel-context";

const SHIFT_TONE: Record<string, "bad" | "warn" | "accent" | "neutral"> = {
  reversal: "bad",
  contradiction: "bad",
  softening: "warn",
  strengthening: "accent",
};

type ChartPoint = DriftPoint & { t: number };

function PointTooltip({ active, payload, axis }: { active?: boolean; payload?: { payload: ChartPoint }[]; axis: DriftResult["axis"] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="max-w-72 rounded-lg border border-line bg-surface-2 p-3 text-xs shadow-xl">
      <p className="font-medium text-ink">{p.label}</p>
      <p className="mt-1 text-muted">
        {fmtDate(p.published_at)} · {p.position > 0.15 ? axis.positive : p.position < -0.15 ? axis.negative : "Neutral"} (
        {p.position > 0 ? "+" : ""}
        {p.position.toFixed(1)})
      </p>
      <p className="mt-1 truncate text-muted">{p.title}</p>
    </div>
  );
}

export default function DriftPage() {
  const { channelId, overview } = useChannel();
  const [topics, setTopics] = useState<DriftTopic[] | null>(null);
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState<DriftResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focus, setFocus] = useState<number | null>(null);

  useEffect(() => {
    api
      .get<DriftTopic[]>(`/api/channels/${channelId}/drift/topics`)
      .then(setTopics)
      .catch((e) => setError(e.message));
  }, [channelId, overview?.stances]);

  const analyze = async (t: string) => {
    if (!t.trim()) return;
    setTopic(t);
    setLoading(true);
    setError(null);
    setFocus(null);
    try {
      setResult(await api.post<DriftResult>(`/api/channels/${channelId}/drift`, { topic: t }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const data: ChartPoint[] = result?.points.map((p) => ({ ...p, t: new Date(p.published_at).getTime() })) ?? [];
  const shiftTargets = new Set(result?.shifts.map((s) => s.to_id));
  const byId = new Map(result?.points.map((p) => [p.id, p]));

  return (
    <>
      <PageHeader title="Opinion Drift" subtitle="See how your stance on a topic changed over the years — and catch contradictions before your comment section does." />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          analyze(topic);
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input className={cn(inputCls, "pl-9")} placeholder="A topic, e.g. “buying used cameras”" value={topic} onChange={(e) => setTopic(e.target.value)} />
        </div>
        <Button type="submit" loading={loading} disabled={!topic.trim()}>
          Track my opinion
        </Button>
      </form>

      {topics && topics.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="py-1 text-xs text-muted">Topics you&apos;ve had opinions on:</span>
          {topics.slice(0, 18).map((t) => (
            <button
              key={t.topic}
              onClick={() => analyze(t.topic)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs hover:border-accent hover:text-ink",
                t.videos > 1 ? "border-violet-500/40 text-ink" : "border-line text-muted",
              )}
              title={`${t.mentions} opinions across ${t.videos} videos`}
            >
              {t.topic}
              {t.videos > 1 && <span className="ml-1 text-violet-700">×{t.videos}</span>}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6">
        <ErrorNote error={error} />
      </div>

      {loading && <Spinner label="Reading your old opinions…" />}

      {!result && !loading && (
        <div className="mt-2">
          {topics === null ? (
            <Spinner label="Loading topics…" />
          ) : (
            <Empty icon={<GitCompareArrows className="size-8" />} title={topics.length ? "Pick a topic to trace" : "No opinions extracted yet"}>
              {topics.length
                ? "Topics marked ×N appear in several videos — the best candidates for drift."
                : "Opinions are extracted during AI analysis. Make sure GROQ_API_KEY is set and re-index."}
            </Empty>
          )}
        </div>
      )}

      {result && !loading && (
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">&ldquo;{result.topic}&rdquo;</h2>
              {result.shifts.length > 0 ? (
                <Badge tone="warn">
                  {result.shifts.length} shift{result.shifts.length > 1 ? "s" : ""} detected
                </Badge>
              ) : result.points.length > 1 ? (
                <Badge tone="good">Consistent</Badge>
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-relaxed">{result.summary}</p>
            {result.video_idea && (
              <div className="mt-4 flex gap-2 rounded-lg bg-surface-2 p-3 text-sm">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-warn" />
                <span>
                  <span className="font-medium">Video idea: </span>
                  {result.video_idea}
                </span>
              </div>
            )}
          </Card>

          {data.length > 1 && (
            <Card className="p-5">
              <p className="text-sm font-medium">Your stance over time</p>
              <div className="mt-4 h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 8 }}>
                    <CartesianGrid stroke="var(--color-line)" strokeDasharray="0" vertical={false} />
                    <XAxis
                      dataKey="t"
                      type="number"
                      scale="time"
                      domain={["dataMin", "dataMax"]}
                      tickFormatter={(t) => new Date(t).toLocaleDateString(undefined, { month: "short", year: "2-digit" })}
                      stroke="var(--color-muted)"
                      tick={{ fontSize: 11, fill: "var(--color-muted)" }}
                      tickLine={false}
                      axisLine={false}
                      padding={{ left: 16, right: 16 }}
                    />
                    <YAxis
                      domain={[-1, 1]}
                      ticks={[-1, 0, 1]}
                      tickFormatter={(v) => (v === 1 ? result.axis.positive : v === -1 ? result.axis.negative : "Neutral")}
                      tick={{ fontSize: 11, fill: "var(--color-muted)" }}
                      tickLine={false}
                      axisLine={false}
                      width={96}
                    />
                    <ReferenceLine y={0} stroke="var(--color-muted)" strokeDasharray="4 4" />
                    <Tooltip content={<PointTooltip axis={result.axis} />} cursor={{ stroke: "var(--color-muted)", strokeWidth: 1 }} />
                    <Line
                      type="monotone"
                      dataKey="position"
                      stroke="var(--color-accent)"
                      strokeWidth={2}
                      isAnimationActive={false}
                      dot={(props) => {
                        const { cx, cy, payload } = props as { cx: number; cy: number; payload: ChartPoint };
                        const shifted = shiftTargets.has(payload.id);
                        return (
                          <circle
                            key={payload.id}
                            cx={cx}
                            cy={cy}
                            r={focus === payload.id ? 8 : shifted ? 7 : 5}
                            fill={shifted ? "var(--color-warn)" : "var(--color-accent)"}
                            stroke="var(--color-surface)"
                            strokeWidth={2}
                            style={{ cursor: "pointer" }}
                            onClick={() => {
                              setFocus(payload.id);
                              document.getElementById(`stance-${payload.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                            }}
                          />
                        );
                      }}
                      activeDot={{ r: 8, stroke: "var(--color-surface)", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-xs text-muted">
                <span className="mr-1 inline-block size-2 rounded-full bg-warn align-middle" /> marks a point where your view shifted. Click a dot to jump to
                the quote.
              </p>
            </Card>
          )}

          {result.shifts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted">Detected shifts</h3>
              {result.shifts.map((s, i) => {
                const from = byId.get(s.from_id);
                const to = byId.get(s.to_id);
                return (
                  <Card key={i} className="flex flex-wrap items-center gap-3 p-4 text-sm">
                    <Badge tone={SHIFT_TONE[s.type] ?? "neutral"} className="capitalize">
                      {s.type}
                    </Badge>
                    <span className="flex-1">{s.explanation}</span>
                    {from && to && (
                      <span className="text-xs text-muted">
                        {fmtDate(from.published_at)} → {fmtDate(to.published_at)}
                      </span>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted">What you said, oldest first</h3>
            {result.points.map((p) => (
              <Card
                key={p.id}
                className={cn("flex gap-3 p-4 transition-colors", focus === p.id && "border-accent", shiftTargets.has(p.id) && "border-amber-500/40")}
              >
                <div id={`stance-${p.id}`} className="w-24 shrink-0 text-xs text-muted">
                  {fmtDate(p.published_at)}
                  <div className="mt-1 font-medium tabular-nums text-ink">
                    {p.position > 0 ? "+" : ""}
                    {p.position.toFixed(1)}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{p.stance}</p>
                  <p className="mt-1 text-sm italic text-muted">&ldquo;{p.quote}&rdquo;</p>
                  <a href={p.url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-2 text-xs text-muted hover:text-ink">
                    <Thumb src={p.thumbnail} className="h-6 w-10" />
                    <span className="truncate">{p.title}</span> · {p.timestamp} <ExternalLink className="size-3 shrink-0" />
                  </a>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
