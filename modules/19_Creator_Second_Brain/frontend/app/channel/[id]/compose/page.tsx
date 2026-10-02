"use client";

import { ArrowDown, ArrowUp, Download, ExternalLink, FileText, Play, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";
import ClipPlayer from "@/components/ClipPlayer";
import { Badge, Button, Card, Empty, ErrorNote, PageHeader, Spinner, Thumb, cn, inputCls } from "@/components/ui";
import { api, downloadText, type Composition, type DriftTopic } from "@/lib/api";
import { useChannel } from "@/lib/channel-context";

const ROLE_LABEL: Record<string, string> = { hook: "Hook", context: "Context", proof: "Proof", payoff: "Payoff", cta: "Call to action" };

export default function ComposePage() {
  const { channelId } = useChannel();
  const [theme, setTheme] = useState("");
  const [target, setTarget] = useState(45);
  const [comp, setComp] = useState<Composition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [playSignal, setPlaySignal] = useState(0);
  const [ideas, setIdeas] = useState<string[]>([]);

  useEffect(() => {
    api
      .get<DriftTopic[]>(`/api/channels/${channelId}/drift/topics`)
      .then((t) => setIdeas(t.filter((x) => x.videos > 1).slice(0, 6).map((x) => x.topic)))
      .catch(() => {});
  }, [channelId]);

  const build = async (t: string) => {
    if (!t.trim()) return;
    setTheme(t);
    setLoading(true);
    setError(null);
    try {
      const c = await api.post<Composition>(`/api/channels/${channelId}/compose`, { theme: t, target_seconds: target });
      setComp(c);
      setIndex(0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const updateClips = (clips: Composition["clips"]) => {
    if (!comp) return;
    setComp({
      ...comp,
      clips,
      total_seconds: Math.round(clips.reduce((s, c) => s + c.duration, 0) * 10) / 10,
      source_videos: new Set(clips.map((c) => c.video_id)).size,
    });
    setIndex(0);
  };

  const move = (i: number, dir: -1 | 1) => {
    if (!comp) return;
    const clips = [...comp.clips];
    [clips[i], clips[i + dir]] = [clips[i + dir], clips[i]];
    updateClips(clips);
  };

  const exportFile = async (kind: "edl" | "shotlist") => {
    if (!comp) return;
    try {
      const text = await api.post<string>(`/api/export/${kind}`, {
        title: comp.title,
        clips: comp.clips,
        hook_overlay: comp.hook_overlay,
        caption: comp.caption,
      });
      const slug = comp.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
      downloadText(kind === "edl" ? `${slug}.edl` : `${slug}-shotlist.md`, text);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const clips = comp?.clips.map((c) => ({ videoId: c.video_id, start: c.start, end: c.end })) ?? [];

  return (
    <>
      <PageHeader title="Ghost Clip Composer" subtitle="Give it a theme. It stitches a hook, proof and payoff from different old videos into one new Short — no filming needed." />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          build(theme);
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <input className={inputCls} placeholder="Theme, e.g. “why consistency beats talent”" value={theme} onChange={(e) => setTheme(e.target.value)} />
        <select className={cn(inputCls, "sm:w-36")} value={target} onChange={(e) => setTarget(Number(e.target.value))} aria-label="Target length">
          {[30, 45, 60, 90].map((s) => (
            <option key={s} value={s}>
              ~{s} seconds
            </option>
          ))}
        </select>
        <Button type="submit" loading={loading} disabled={!theme.trim()} className="sm:w-44">
          <Wand2 className="size-4" /> Compose
        </Button>
      </form>
      {ideas.length > 0 && !comp && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="py-1 text-xs text-muted">Themes that span several of your videos:</span>
          {ideas.map((t) => (
            <button key={t} onClick={() => build(t)} className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:border-accent hover:text-ink">
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6">
        <ErrorNote error={error} />
      </div>
      {loading && <Spinner label="Digging through your videos for the right moments…" />}

      {!comp && !loading && (
        <Empty icon={<Sparkles className="size-8" />} title="A new Short from footage you already have">
          The composer finds moments on your theme across different videos, gives each a role (hook → context → proof → payoff) and orders them into
          one arc. Preview it here, then export an EDL timeline for Premiere or DaVinci Resolve.
        </Empty>
      )}

      {comp && !loading && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-4 lg:sticky lg:top-36 lg:self-start">
            <Card className="overflow-hidden">
              <div className="relative">
                <ClipPlayer
                  key={comp.clips.map((c) => c.video_id + c.start).join()}
                  clips={clips}
                  index={index}
                  autoPlay={false}
                  playSignal={playSignal}
                  onIndexChange={setIndex}
                />
                {comp.hook_overlay && index === 0 && (
                  <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-6">
                    <span className="rounded-lg bg-black/75 px-3 py-1.5 text-white text-center text-sm font-semibold">{comp.hook_overlay}</span>
                  </div>
                )}
              </div>
              {/* timeline strip: width ∝ clip duration */}
              <div className="flex h-9 gap-0.5 bg-surface p-1">
                {comp.clips.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setIndex(i);
                      setPlaySignal((n) => n + 1);
                    }}
                    style={{ flexGrow: c.duration }}
                    className={cn(
                      "min-w-0 basis-0 truncate rounded px-1.5 text-[11px] font-medium transition-colors",
                      i === index ? "bg-accent text-white" : "bg-surface-2 text-muted hover:text-ink",
                    )}
                    title={`${ROLE_LABEL[c.role]} · ${c.duration}s`}
                  >
                    {ROLE_LABEL[c.role]}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-line p-4">
                <Button
                  size="sm"
                  onClick={() => {
                    setIndex(0);
                    setPlaySignal((n) => n + 1);
                  }}
                >
                  <Play className="size-3.5" /> Play full preview
                </Button>
                <Button size="sm" variant="outline" onClick={() => exportFile("edl")}>
                  <Download className="size-3.5" /> EDL timeline
                </Button>
                <Button size="sm" variant="outline" onClick={() => exportFile("shotlist")}>
                  <FileText className="size-3.5" /> Shot list
                </Button>
                <span className="ml-auto text-xs text-muted tabular-nums">
                  {comp.total_seconds}s · {comp.clips.length} clips · {comp.source_videos} videos
                </span>
              </div>
            </Card>
            <Card className="space-y-3 p-5 text-sm">
              <h2 className="text-lg font-semibold">{comp.title}</h2>
              {comp.caption && (
                <p>
                  <span className="text-muted">Caption: </span>
                  {comp.caption}
                </p>
              )}
              {comp.editor_notes && (
                <p>
                  <span className="text-muted">Editor notes: </span>
                  {comp.editor_notes}
                </p>
              )}
            </Card>
          </div>

          <div className="space-y-2">
            {comp.clips.map((c, i) => (
              <Card key={`${c.video_id}-${c.start}`} className={cn("p-4 transition-colors", i === index && "border-accent")}>
                <div className="flex items-start gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold tabular-nums">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={c.role === "hook" ? "accent" : "neutral"}>{ROLE_LABEL[c.role]}</Badge>
                      <span className="text-xs text-muted tabular-nums">{c.duration}s</span>
                    </div>
                    <p className="mt-2 text-sm">&ldquo;{c.text}&rdquo;</p>
                    {c.why && <p className="mt-1 text-xs text-muted">{c.why}</p>}
                    <a href={c.url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-2 text-xs text-muted hover:text-ink">
                      <Thumb src={c.thumbnail} className="h-6 w-10" />
                      <span className="truncate">{c.title}</span> · {c.timestamp} <ExternalLink className="size-3 shrink-0" />
                    </a>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <Button variant="ghost" size="sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" disabled={i === comp.clips.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                      <ArrowDown className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={comp.clips.length <= 2}
                      onClick={() => updateClips(comp.clips.filter((_, j) => j !== i))}
                      aria-label="Remove clip"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            <p className="pt-2 text-xs text-muted">
              The EDL references your original footage by video, so open it in your editor and relink each clip to your own source files.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
