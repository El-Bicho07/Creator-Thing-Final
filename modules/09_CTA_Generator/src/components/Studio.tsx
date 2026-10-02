"use client";

import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { kitFileName, kitToMarkdown } from "@/lib/cta/markdown";
import { rewriteOffline } from "@/lib/cta/offline";
import { generateKit } from "@/lib/cta/pipeline";
import { scoreCandidate, type Kit, type ScoredCandidate } from "@/lib/cta/rank";
import { BriefSchema, type HistoryEntry } from "@/lib/cta/schema";
import {
  ANGLES,
  FORMAT_IDS,
  FORMATS,
  GOAL_IDS,
  GOALS,
  LANGUAGE_IDS,
  LANGUAGES,
  LINK_METHOD_IDS,
  LINK_METHODS,
  MECHANISMS,
  SIGNALS,
  SLOTS,
  TEMPERATURE_IDS,
  TEMPERATURES,
  type FormatId,
  type GoalId,
  type Language,
  type LinkMethod,
  type SlotId,
  type Temperature,
} from "@/lib/cta/taxonomy";
import { addHistory, loadHistory } from "@/lib/storage";
import { Deck, Stack } from "./deck";
import { Button, Chip, EASE, FreshnessMeter, Icon, RiskBadge } from "./ui";

type Form = {
  topic: string;
  details: string;
  audience: string;
  goal: GoalId;
  format: FormatId;
  temperature: Temperature;
  language: Language;
  linkMethod: LinkMethod | "";
  keyword: string;
  offer: string;
};

const STATUS = ["Reading your post…", "Picking fresh angles…", "Writing for each placement…", "Checking reach risk…"];

const EXAMPLE: Form = {
  topic: "Monsoon skincare routine for oily skin",
  details: "3-step routine: gel cleanser, niacinamide serum, matte sunscreen. Humidity makes people skip sunscreen — don't.",
  audience: "college students",
  goal: "saves",
  format: "reel",
  temperature: "cold",
  language: "en",
  linkMethod: "",
  keyword: "",
  offer: "",
};

const EMPTY: Form = { ...EXAMPLE, topic: "", details: "", audience: "" };

function toInput(f: Form) {
  return { ...f, linkMethod: f.linkMethod || undefined };
}

export default function Studio() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [showErrors, setShowErrors] = useState(false);
  const [kit, setKit] = useState<Kit | null>(null);
  const [selected, setSelected] = useState<Partial<Record<SlotId, string>>>({});
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const [seed, setSeed] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHistory().then(setHistory);
  }, []);

  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setStatusIndex((i) => (i + 1) % STATUS.length), 1400);
    return () => clearInterval(id);
  }, [loading]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(id);
  }, [toast]);

  const parsed = BriefSchema.safeParse(toInput(form));
  const errors: Partial<Record<string, string>> = {};
  if (!parsed.success) for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function generate(nextSeed = seed) {
    setShowErrors(true);
    if (!parsed.success) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setStatusIndex(0);
    if (window.innerWidth < 1024) resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      const next = await generateKit(parsed.data, { history, signal: controller.signal, seed: nextSeed });
      setKit(next);
      setSelected(Object.fromEntries(next.slots.map((s) => [s.slot, s.candidates[0]?.id])));
    } catch (error) {
      if (!controller.signal.aborted) setToast(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }

  function regenerate() {
    const next = seed + 1;
    setSeed(next);
    void generate(next);
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(
      () => setToast("Copied"),
      () => setToast("Copy blocked — select the text and press Ctrl+C"),
    );
  }

  function rewrite(slot: SlotId, candidate: ScoredCandidate) {
    if (!kit) return;
    const intent = candidate.risk === "safe" ? "fresher" : "safer";
    const next = rewriteOffline(kit.brief, candidate, intent, seed + Date.now());
    if (!next) {
      setToast("No other safe option for this slot. Try regenerating.");
      return;
    }
    const scored = scoreCandidate({ ...next, id: `${next.id}:${Date.now()}` }, { brief: kit.brief, strategy: kit.strategy, history });
    setKit({
      ...kit,
      slots: kit.slots.map((s) => (s.slot === slot ? { ...s, candidates: s.candidates.map((c) => (c.id === candidate.id ? scored : c)) } : s)),
    });
    setSelected((sel) => ({ ...sel, [slot]: scored.id }));
    setToast(intent === "safer" ? "Rewritten to be safe for reach" : "Swapped in a fresher angle");
  }

  const picks: Partial<Record<SlotId, ScoredCandidate>> = {};
  kit?.slots.forEach((s) => {
    picks[s.slot] = s.candidates.find((c) => c.id === selected[s.slot]) ?? s.candidates[0];
  });

  async function saveSelected() {
    if (!kit) return;
    const items = Object.values(picks)
      .filter((c): c is ScoredCandidate => Boolean(c))
      .map((c) => ({
        text: c.text,
        slot: c.slot,
        angle: c.angle,
        mechanism: c.mechanism,
        goal: kit.brief.goal,
        format: kit.brief.format,
        topic: kit.brief.topic.slice(0, 80),
      }));
    setHistory(await addHistory(items));
    setToast(`Saved ${items.length} CTAs. Your next kit will steer away from them.`);
  }

  function exportMarkdown() {
    if (!kit) return;
    const name = kitFileName(kit);
    const url = URL.createObjectURL(new Blob([kitToMarkdown(kit, selected)], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
    setToast(`Downloaded ${name}`);
  }

  function copyAll() {
    if (!kit) return;
    const text = kit.slots
      .map((s) => `${SLOTS[s.slot].label}:\n${picks[s.slot]?.text ?? ""}`)
      .join("\n\n");
    copy(text);
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="grid gap-5 px-gutter pb-10 pt-24 lg:grid-cols-[minmax(20rem,26rem)_minmax(0,1fr)] 2xl:grid-cols-[minmax(20rem,26rem)_minmax(0,1fr)_minmax(17rem,19rem)]">
        {/* Brief: its own scroll area on large screens, scrollbar hidden */}
        <section aria-labelledby="brief-title" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <form
            className="glass flex flex-col rounded-panel lg:h-[calc(100dvh-7.5rem)]"
            onSubmit={(e) => {
              e.preventDefault();
              void generate();
            }}
          >
            <div className="no-scrollbar min-h-0 flex-1 overscroll-contain px-5 pt-6 sm:px-6 lg:overflow-y-auto lg:[mask-image:linear-gradient(to_bottom,#000_calc(100%-2.5rem),transparent)]">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <h1 id="brief-title" className="font-heading text-[1.75rem] font-bold leading-tight">Brief your post</h1>
                <button
                  type="button"
                  onClick={() => setForm(EXAMPLE)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-2/70 hover:text-ink"
                >
                  <Icon name="bolt" size={18} /> Try an example
                </button>
              </div>

              <Field label="What's the post about?" error={showErrors ? errors.topic : undefined} htmlFor="topic">
                <input id="topic" value={form.topic} onChange={(e) => set("topic", e.target.value)} placeholder="e.g. 5-minute chai-break desk stretches" className={inputCls} maxLength={80} />
              </Field>

              <Field label="Details or script" hint="Optional. The more specific, the more specific the CTA." htmlFor="details" error={showErrors ? errors.details : undefined}>
                <textarea
                  id="details"
                  value={form.details}
                  onChange={(e) => set("details", e.target.value)}
                  rows={3}
                  placeholder="Paste your caption draft, script or key points"
                  className={`${inputCls} h-auto min-h-[6.5rem] resize-y py-3 leading-relaxed`}
                  maxLength={1500}
                />
              </Field>

              <Field label="Who is it for?" hint="Optional" htmlFor="audience" error={showErrors ? errors.audience : undefined}>
                <input id="audience" value={form.audience} onChange={(e) => set("audience", e.target.value)} placeholder="e.g. working professionals in Bengaluru" className={inputCls} maxLength={60} />
              </Field>

              <fieldset className="mt-6">
                <legend className={labelCls}>What should it get you?</legend>
                <Choices name="goal" value={form.goal} onChange={(v) => set("goal", v)} options={GOAL_IDS.map((id) => ({ value: id, label: GOALS[id].label, icon: GOALS[id].icon }))} />
                <p className="mt-2.5 text-xs leading-relaxed text-ink-muted">
                  {GOALS[form.goal].blurb} Drives <strong className="font-semibold text-ink">{SIGNALS[GOALS[form.goal].signal].label}</strong>.
                </p>
              </fieldset>

              <fieldset className="mt-6">
                <legend className={labelCls}>Format</legend>
                <Choices name="format" value={form.format} onChange={(v) => set("format", v)} options={FORMAT_IDS.map((id) => ({ value: id, label: FORMATS[id].label, icon: FORMATS[id].icon }))} />
              </fieldset>

              <fieldset className="mt-6">
                <legend className={labelCls}>Who will mostly see it?</legend>
                <Choices
                  name="temperature"
                  value={form.temperature}
                  onChange={(v) => set("temperature", v)}
                  options={TEMPERATURE_IDS.map((id) => ({ value: id, label: TEMPERATURES[id].label, icon: TEMPERATURES[id].icon }))}
                />
                <p className="mt-2.5 text-xs text-ink-muted">{TEMPERATURES[form.temperature].sub}</p>
              </fieldset>

              <fieldset className="mt-6">
                <legend className={labelCls}>Language</legend>
                <Choices
                  name="language"
                  value={form.language}
                  onChange={(v) => set("language", v)}
                  options={LANGUAGE_IDS.map((id) => ({
                    value: id,
                    label: LANGUAGES[id].label,
                    icon: id === "hinglish" ? "chat" : "language",
                    native: id === "en" || id === "hinglish" ? undefined : { text: LANGUAGES[id].native, lang: id },
                  }))}
                />
              </fieldset>

              <details className="group mt-6 rounded-field border border-line bg-surface/30 px-4 py-3 open:pb-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex items-center gap-2">
                    <Icon name="tune" size={18} /> Links, keyword and offer
                  </span>
                  <Icon name="expand_more" className="transition-transform group-open:rotate-180" />
                </summary>
                <div className="mt-4">
                  <Field label="How do people get the link?" htmlFor="linkMethod">
                    <select id="linkMethod" value={form.linkMethod} onChange={(e) => set("linkMethod", e.target.value as LinkMethod | "")} className={`${inputCls} truncate pr-10`}>
                      <option value="">Not needed</option>
                      {LINK_METHOD_IDS.map((id) => (
                        <option key={id} value={id}>
                          {LINK_METHODS[id].label} — {LINK_METHODS[id].hint}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Keyword" hint="For DM or comment-keyword CTAs, e.g. GUIDE" htmlFor="keyword" error={showErrors ? errors.keyword : undefined}>
                    <input id="keyword" value={form.keyword} onChange={(e) => set("keyword", e.target.value.toUpperCase())} className={`${inputCls} uppercase tracking-wide`} maxLength={16} />
                  </Field>
                  <Field label="Offer" hint="e.g. free 7-day plan, or ₹499 masterclass" htmlFor="offer" error={showErrors ? errors.offer : undefined}>
                    <input id="offer" value={form.offer} onChange={(e) => set("offer", e.target.value)} className={inputCls} maxLength={80} />
                  </Field>
                </div>
              </details>
              <div aria-hidden className="h-8" />
            </div>

            <div className="sticky bottom-3 px-5 pb-5 pt-1 sm:px-6 sm:pb-6 lg:static">
              <Button type="submit" variant="primary" size="lg" icon={loading ? undefined : "auto_awesome"} className="w-full" disabled={loading}>
                <span className="truncate">{loading ? STATUS[statusIndex] : kit ? "Generate a new kit" : "Generate CTA kit"}</span>
              </Button>
            </div>
          </form>
        </section>

        {/* Kit */}
        <section ref={resultsRef} aria-labelledby="kit-title" aria-busy={loading} className="min-w-0 scroll-mt-24">
          <p className="sr-only" aria-live="polite">
            {loading ? STATUS[statusIndex] : kit ? "CTA kit ready" : ""}
          </p>
          {loading ? (
            <LoadingKit status={STATUS[statusIndex]} />
          ) : kit ? (
            <KitView
              kit={kit}
              selected={selected}
              onSelect={(slot, id) => setSelected((s) => ({ ...s, [slot]: id }))}
              onCopy={copy}
              onRewrite={rewrite}
              onSave={saveSelected}
              onCopyAll={copyAll}
              onExport={exportMarkdown}
              onRegenerate={regenerate}
              preview={<PhonePreview format={kit.brief.format} picks={picks} />}
            />
          ) : (
            <EmptyState historyCount={history.length} onExample={() => setForm(EXAMPLE)} />
          )}
        </section>

        {/* Preview. Below 2xl it lives at the end of the kit's card track instead. */}
        <aside aria-label="Instagram preview" className="hidden min-w-0 2xl:sticky 2xl:top-24 2xl:block 2xl:self-start">
          <p className="mb-3 px-1 text-sm font-medium text-ink-muted">How it looks on Instagram</p>
          <PhonePreview format={kit?.brief.format ?? form.format} picks={picks} />
        </aside>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="fixed inset-x-4 bottom-6 z-50 mx-auto w-fit max-w-[calc(100%-2rem)] rounded-full bg-primary px-5 py-3 text-sm font-medium text-on-primary shadow-[0_16px_40px_-16px_rgb(0_0_0/0.5)]"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}

const labelCls = "text-sm font-semibold text-ink";
const inputCls =
  "mt-2 h-12 w-full min-w-0 rounded-field border border-line bg-surface/60 px-4 text-[15px] text-ink placeholder:text-ink-muted/70 transition-colors focus:border-ink focus:bg-surface focus:outline-none";

function Field({ label, hint, error, htmlFor, children }: { label: string; hint?: string; error?: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 first-of-type:mt-0">
      <label htmlFor={htmlFor} className={labelCls}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-risky">
          <Icon name="error" size={14} /> {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

type Choice<T> = { value: T; label: string; icon: string; native?: { text: string; lang: string } };

/** Radio pills that wrap onto a new line instead of overflowing the panel. */
function Choices<T extends string>({ name, value, onChange, options }: { name: string; value: T; onChange: (v: T) => void; options: Choice<T>[] }) {
  return (
    <div className="mt-2.5 flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <label
            key={o.value}
            className={`relative inline-flex h-10 min-w-0 max-w-full cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${
              active ? "border-transparent text-on-primary" : "border-line bg-surface/40 text-ink-muted hover:border-ink-muted hover:text-ink"
            }`}
          >
            {active && <motion.span layoutId={`choice-${name}`} className="absolute -inset-px rounded-full bg-primary" transition={{ duration: 0.3, ease: EASE }} />}
            <input type="radio" name={name} checked={active} onChange={() => onChange(o.value)} className="sr-only" />
            <Icon name={o.icon} size={18} filled={active} className="relative" />
            <span className="relative truncate">{o.label}</span>
            {o.native && (
              <span lang={o.native.lang} className="relative truncate font-normal opacity-75">
                {o.native.text}
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}

function EmptyState({ historyCount, onExample }: { historyCount: number; onExample: () => void }) {
  return (
    <div className="glass flex min-h-[30rem] flex-col items-center justify-center rounded-panel px-6 py-12 text-center lg:min-h-[calc(100dvh-7.5rem)]">
      <Stack className="w-full max-w-[17rem]">
        <div aria-hidden className="grid gap-2.5 p-5">
          <span className="h-3 w-4/5 rounded-full bg-ink/10" />
          <span className="h-3 w-3/5 rounded-full bg-ink/10" />
          <span className="mt-3 h-6 w-24 rounded-full bg-ink/10" />
        </div>
      </Stack>
      <h2 id="kit-title" className="mt-8 font-heading text-3xl font-bold">
        Your CTA kit lands here
      </h2>
      <p className="mt-3 max-w-md leading-relaxed text-ink-muted">
        A stack of options for every placement in your format, each checked for reach risk and scored for how fresh it is
        {historyCount > 0 ? ` against the ${historyCount} CTAs in your history.` : "."}
      </p>
      <Button className="mt-7" icon="bolt" onClick={onExample}>
        Fill in an example brief
      </Button>
    </div>
  );
}

const SLIDE_W = "w-[min(25rem,calc(100%-2.5rem))]";

function LoadingKit({ status }: { status: string }) {
  return (
    <div>
      <div className="flex items-center gap-3 px-1">
        <span className="h-2 w-2 animate-pulse rounded-full bg-ink" />
        <p className="font-heading text-2xl font-bold">{status}</p>
      </div>
      <div className="mt-8 flex gap-4 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${SLIDE_W} shrink-0`}>
            <div className="shimmer mb-4 h-4 w-32 rounded-full" />
            <Stack>
              <div className="grid gap-3 p-5">
                <div className="shimmer h-4 w-4/5 rounded-full" />
                <div className="shimmer h-4 w-1/2 rounded-full" />
                <div className="shimmer mt-6 h-6 w-28 rounded-full" />
              </div>
            </Stack>
          </div>
        ))}
      </div>
    </div>
  );
}

type KitProps = {
  kit: Kit;
  selected: Partial<Record<SlotId, string>>;
  onSelect: (slot: SlotId, id: string) => void;
  onCopy: (text: string) => void;
  onRewrite: (slot: SlotId, c: ScoredCandidate) => void;
  onSave: () => void;
  onCopyAll: () => void;
  onExport: () => void;
  onRegenerate: () => void;
  preview: React.ReactNode;
};

type Edges = { start: boolean; end: boolean };

function readEdges(track: HTMLElement): Edges {
  return { start: track.scrollLeft <= 4, end: track.scrollLeft + track.clientWidth >= track.scrollWidth - 4 };
}

function KitView({ kit, selected, onSelect, onCopy, onRewrite, onSave, onCopyAll, onExport, onRegenerate, preview }: KitProps) {
  const goal = GOALS[kit.brief.goal];
  const trackRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState<boolean[]>([]);
  const [edges, setEdges] = useState<Edges>({ start: true, end: true });
  const slotKey = kit.slots.map((s) => s.slot).join(",");
  const previewIndex = kit.slots.length;
  const syncEdges = (track: HTMLElement) =>
    setEdges((prev) => {
      const next = readEdges(track);
      return next.start === prev.start && next.end === prev.end ? prev : next;
    });

  // Fade whichever edge of the track still has cards hidden behind it.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const ro = new ResizeObserver(() => setEdges(readEdges(track)));
    ro.observe(track);
    return () => ro.disconnect();
  }, [slotKey]);
  const trackMask = `linear-gradient(to right, ${edges.start ? "#000 0" : "transparent 0, #000 2.5rem"}, ${edges.end ? "#000 100%" : "#000 calc(100% - 4rem), transparent 100%"})`;

  // Which stacks are on screen. The pills above the track light up to match, standing in for the hidden scrollbar.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const slides = Array.from(track.children) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) =>
        setInView((prev) => {
          const next = slides.map((_, i) => prev[i] ?? false);
          for (const e of entries) next[slides.indexOf(e.target as HTMLElement)] = e.intersectionRatio >= 0.6;
          return next;
        }),
      { root: track, threshold: [0, 0.6, 1] },
    );
    slides.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [slotKey]);

  const smooth = () => (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");
  const scrollToSlide = (i: number) => {
    const track = trackRef.current;
    const slide = track?.children[i] as HTMLElement | undefined;
    if (!track || !slide) return;
    track.scrollTo({ left: slide.offsetLeft - parseFloat(getComputedStyle(track).paddingLeft), behavior: smooth() });
  };
  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 px-1">
        <div className="min-w-0 flex-1 basis-[20rem]">
          <h2 id="kit-title" className="text-balance font-heading text-[clamp(1.75rem,2.6vw,2.5rem)] font-bold leading-tight [overflow-wrap:anywhere]">
            {kit.brief.topic}
          </h2>
          <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-ink-muted">
            <span>
              {FORMATS[kit.brief.format].label} kit for a {TEMPERATURES[kit.brief.temperature].label.toLowerCase()} audience, built to drive {SIGNALS[goal.signal].label.toLowerCase()}.
            </span>
            {kit.brief.language && kit.brief.language !== "en" && (
              <Chip icon={kit.brief.language === "hinglish" ? "chat" : "language"}>
                <span lang={kit.brief.language === "hinglish" ? undefined : kit.brief.language}>{LANGUAGES[kit.brief.language].native}</span>
              </Chip>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="ghost" icon="refresh" onClick={onRegenerate} aria-label="Regenerate" title="Regenerate" className="px-0! w-10! sm:w-auto! sm:px-3.5!">
            <span className="hidden sm:inline">Regenerate</span>
          </Button>
          <Button size="sm" variant="ghost" icon="download" onClick={onExport} aria-label="Export .md" title="Download the kit as a Markdown file to use in another AI" className="px-0! w-10! sm:w-auto! sm:px-3.5!">
            <span className="hidden sm:inline">Export .md</span>
          </Button>
          <Button size="sm" icon="content_copy" onClick={onCopyAll}>
            Copy all
          </Button>
          <Button size="sm" variant="primary" icon="bookmark" onClick={onSave}>
            Save picks
          </Button>
        </div>
      </header>

      {(kit.notice || kit.strategy.notes.length > 0) && (
        <details className="group mt-4 px-1" open={Boolean(kit.notice)}>
          <summary
            className={`flex cursor-pointer list-none items-start gap-2 text-sm font-medium [&::-webkit-details-marker]:hidden ${kit.notice ? "text-watch" : "text-ink-muted hover:text-ink"}`}
          >
            <Icon name={kit.notice ? "info" : "auto_awesome"} size={18} filled={Boolean(kit.notice)} className="mt-px shrink-0" />
            <span className="min-w-0 flex-1">{kit.notice ?? "Why these picks"}</span>
            <Icon name="expand_more" size={18} className="mt-px shrink-0 text-ink-muted transition-transform group-open:rotate-180" />
          </summary>
          {kit.strategy.notes.length > 0 && (
            <div className="mt-2 grid gap-1.5 pl-6.5 text-sm text-ink-muted">
              {kit.strategy.notes.map((n) => (
                <p key={n} className="flex gap-2">
                  <Icon name="check" size={16} className="mt-px shrink-0 text-safe" />
                  <span className="min-w-0">{n}</span>
                </p>
              ))}
            </div>
          )}
        </details>
      )}

      <nav aria-label="Jump to a placement" className="no-scrollbar glass mt-5 flex gap-1 overflow-x-auto rounded-full p-1">
        {kit.slots.map((group, i) => (
          <button
            key={group.slot}
            type="button"
            onClick={() => scrollToSlide(i)}
            aria-current={inView[i] ? "true" : undefined}
            className={`${TAB} ${inView[i] ? TAB_ON : TAB_OFF}`}
          >
            <Icon name={SLOTS[group.slot].icon} size={16} filled={inView[i]} />
            {SLOTS[group.slot].label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => scrollToSlide(previewIndex)}
          aria-current={inView[previewIndex] ? "true" : undefined}
          className={`${TAB} 2xl:hidden ${inView[previewIndex] ? TAB_ON : TAB_OFF}`}
        >
          <Icon name="smartphone" size={16} filled={inView[previewIndex]} />
          Preview
        </button>
      </nav>
      <p className="mt-2 px-1 text-sm text-ink-muted">The card on top of each stack is your pick — copy all and save use the top cards.</p>

      <div
        ref={trackRef}
        onScroll={(e) => syncEdges(e.currentTarget)}
        style={{ maskImage: trackMask, WebkitMaskImage: trackMask }}
        className="no-scrollbar relative -mx-3 mt-4 flex snap-x snap-mandatory scroll-px-3 items-start gap-4 overflow-x-auto px-3 pb-10 pt-1"
      >
        {kit.slots.map((group, gi) => {
          const slot = SLOTS[group.slot];
          const index = Math.max(
            0,
            group.candidates.findIndex((c) => c.id === (selected[group.slot] ?? group.candidates[0]?.id)),
          );
          return (
            <motion.section
              key={group.slot}
              aria-labelledby={`slot-${group.slot}`}
              className={`${SLIDE_W} shrink-0 snap-start`}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, ease: EASE, delay: gi * 0.07 }}
            >
              <div className="mb-3 flex items-start gap-2.5 px-1">
                <Icon name={slot.icon} className="mt-1 text-ink-muted" />
                <div className="min-w-0">
                  <h3 id={`slot-${group.slot}`} className="font-heading text-lg font-bold leading-tight">
                    {slot.label}
                  </h3>
                  <p className="text-sm text-ink-muted">{slot.hint}</p>
                </div>
              </div>
              <Deck
                items={group.candidates}
                index={index}
                onIndexChange={(i) => onSelect(group.slot, group.candidates[i].id)}
                getKey={(c) => c.id}
                label={`${slot.label} options`}
                deal={gi * 0.07 + 0.2}
                renderCard={(c) => <CtaCard candidate={c} onCopy={() => onCopy(c.text)} onRewrite={() => onRewrite(group.slot, c)} />}
              />
            </motion.section>
          );
        })}
        <section aria-labelledby="slot-preview" className="w-[min(19rem,calc(100%-2.5rem))] shrink-0 snap-start 2xl:hidden">
          <div className="mb-3 px-1">
            <h3 id="slot-preview" className="font-heading text-lg font-bold leading-tight">
              Preview
            </h3>
            <p className="text-sm text-ink-muted">How the top cards look on Instagram</p>
          </div>
          {preview}
        </section>
      </div>
    </div>
  );
}

const TAB = "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-medium transition-colors duration-300";
const TAB_ON = "bg-primary text-on-primary";
const TAB_OFF = "text-ink-muted hover:text-ink";

function CtaCard({ candidate: c, onCopy, onRewrite }: { candidate: ScoredCandidate; onCopy: () => void; onRewrite: () => void }) {
  const [open, setOpen] = useState(false);
  const limit = SLOTS[c.slot].maxChars;
  const count = [...c.text].length;
  return (
    <div className="flex min-h-[14rem] flex-1 flex-col p-5">
      {c.sticker ? <StickerLine candidate={c} /> : <p className="font-heading text-[1.3rem] font-medium leading-snug text-ink [overflow-wrap:anywhere]">{c.text}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <RiskBadge risk={c.risk} />
        <Chip>{ANGLES[c.angle].label}</Chip>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <FreshnessMeter value={c.freshness} />
        <span className={`text-xs tabular-nums ${count > limit ? "font-semibold text-risky" : "text-ink-muted"}`}>
          {count}/{limit}
        </span>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: EASE }} className="overflow-hidden">
            <div className="mt-4 space-y-2 border-t border-line pt-4 text-xs leading-relaxed text-ink-muted [overflow-wrap:anywhere]">
              <p>
                <strong className="text-ink">Why:</strong> {c.why}
              </p>
              <p>
                <strong className="text-ink">Mechanism:</strong> {MECHANISMS[c.mechanism].label}
              </p>
              {c.riskReasons.map((r) => (
                <p key={r} className={c.risk === "risky" ? "text-risky" : "text-watch"}>
                  {r}
                </p>
              ))}
              {c.issues.map((i) => (
                <p key={i.message}>• {i.message}</p>
              ))}
              {c.similarTo && <p>Similar to “{c.similarTo.text}”.</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="mt-auto flex flex-wrap items-center gap-1 pt-4">
        <button onClick={onCopy} className={CARD_BTN}>
          <Icon name="content_copy" size={16} /> Copy
        </button>
        <button onClick={onRewrite} className={CARD_BTN}>
          <Icon name={c.risk === "safe" ? "refresh" : "shield"} size={16} /> {c.risk === "safe" ? "New angle" : "Make safer"}
        </button>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Why this CTA"
          className="ml-auto grid h-9 w-9 place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface-2/70 hover:text-ink"
        >
          <Icon name="info" size={18} />
        </button>
      </div>
    </div>
  );
}

const CARD_BTN = "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-ink-muted transition-colors hover:bg-surface-2/70 hover:text-ink";

function StickerLine({ candidate }: { candidate: ScoredCandidate }) {
  const s = candidate.sticker!;
  return (
    <div className="min-w-0">
      <span className="text-sm capitalize text-ink-muted">{s.type} sticker</span>
      <p className="mt-1 font-heading text-[1.3rem] font-medium leading-snug text-ink [overflow-wrap:anywhere]">{s.label}</p>
      {s.options && <p className="mt-1 text-sm text-ink-muted [overflow-wrap:anywhere]">{s.options.join(" / ")}</p>}
    </div>
  );
}

function truncateCaption(text: string) {
  return text.length > 125 ? `${text.slice(0, 122).trimEnd()}…` : text;
}

export function PhonePreview({ format, picks }: { format: FormatId; picks: Partial<Record<SlotId, ScoredCandidate>> }) {
  const opener = picks.caption_opener?.text ?? "Your caption opener shows here, before “…more”.";
  const handle = "yourhandle";
  const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.25 } };

  return (
    <div className="mx-auto w-full max-w-[18rem] rounded-[2.75rem] border-[10px] border-[#22223b] bg-[#22223b] shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)] ring-1 ring-[var(--glass-edge)]">
      <div className="relative aspect-[9/17] overflow-hidden rounded-[2.1rem] bg-[#22223b] text-[#f2e9e4]">
        {format === "story" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-[#4a4e69] via-[#9a8c98] to-[#c9ada7] p-6 text-center">
            <div className="absolute inset-x-4 top-3 flex gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className={`h-0.5 flex-1 rounded-full ${i === 0 ? "bg-white" : "bg-white/40"}`} />
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.p key={picks.story_overlay?.id ?? "o"} {...fade} className="font-heading text-xl font-bold leading-snug drop-shadow [overflow-wrap:anywhere]">
                {picks.story_overlay?.text ?? "Story text"}
              </motion.p>
            </AnimatePresence>
            <StickerMock candidate={picks.story_sticker} />
          </div>
        ) : format === "reel" ? (
          <div className="absolute inset-0 bg-gradient-to-b from-[#4a4e69] via-[#22223b] to-[#17172a]">
            <div className="absolute inset-x-5 top-[38%] text-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={picks.reel_onscreen?.id ?? "r"}
                  {...fade}
                  className="inline rounded-lg bg-[#f2e9e4] box-decoration-clone px-2 py-1 font-heading text-lg font-bold leading-[1.6] text-[#22223b] [overflow-wrap:anywhere]"
                >
                  {picks.reel_onscreen?.text ?? "On-screen text"}
                </motion.p>
              </AnimatePresence>
              {picks.reel_spoken && <p className="mt-4 text-[11px] italic text-[#f2e9e4]/80 [overflow-wrap:anywhere]">🎙 “{picks.reel_spoken.text}”</p>}
            </div>
            <div className="absolute bottom-24 right-3 flex flex-col items-center gap-4 text-[#f2e9e4]">
              {["favorite", "chat", "send", "bookmark"].map((n) => (
                <Icon key={n} name={n} size={24} />
              ))}
            </div>
            <Caption handle={handle} text={opener} />
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col bg-[#faf5f2] text-[#22223b]">
            <div className="flex items-center gap-2 px-3 py-2.5 text-xs font-semibold">
              <span className="h-6 w-6 rounded-full bg-[#c9ada7]" />
              {handle}
            </div>
            <div className="relative grid aspect-square place-items-center bg-gradient-to-br from-[#c9ada7] to-[#9a8c98] p-5 text-center">
              {format === "carousel" ? (
                <div className="min-w-0">
                  <AnimatePresence mode="wait">
                    <motion.p key={picks.slide_headline?.id ?? "h"} {...fade} className="font-heading text-xl font-bold leading-tight [overflow-wrap:anywhere]">
                      {picks.slide_headline?.text ?? "Last slide headline"}
                    </motion.p>
                  </AnimatePresence>
                  <p className="mt-2 text-xs leading-snug [overflow-wrap:anywhere]">{picks.slide_sub?.text ?? "Subline"}</p>
                  <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === 3 ? "bg-[#22223b]" : "bg-[#22223b]/30"}`} />
                    ))}
                  </div>
                </div>
              ) : (
                <Icon name="photo" size={48} className="text-[#22223b]/40" />
              )}
            </div>
            <div className="flex gap-3 px-3 py-2">
              {["favorite", "chat", "send"].map((n) => (
                <Icon key={n} name={n} size={20} />
              ))}
              <Icon name="bookmark" size={20} className="ml-auto" />
            </div>
            <p className="px-3 text-[11px] leading-snug [overflow-wrap:anywhere]">
              <strong>{handle}</strong> {truncateCaption(opener)} <span className="text-[#4a4e69]">more</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Caption({ handle, text }: { handle: string; text: string }) {
  return (
    <div className="absolute inset-x-3 bottom-4 text-[11px] leading-snug [overflow-wrap:anywhere]">
      <p className="mb-1 flex items-center gap-1.5 font-semibold">
        <span className="h-5 w-5 rounded-full bg-[#c9ada7]" /> {handle}
      </p>
      <p>
        {truncateCaption(text)} <span className="opacity-70">more</span>
      </p>
    </div>
  );
}

function StickerMock({ candidate }: { candidate?: ScoredCandidate }) {
  const s = candidate?.sticker;
  if (!s) return <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#22223b]">Sticker</span>;
  if (s.type === "link") {
    return (
      <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#4a4e69] shadow">
        <Icon name="link" size={16} />
        <span className="truncate">{s.label}</span>
      </span>
    );
  }
  if (s.type === "poll") {
    return (
      <div className="w-full rounded-card bg-white p-3 text-[#22223b] shadow">
        <p className="text-sm font-bold [overflow-wrap:anywhere]">{s.label}</p>
        <div className="mt-2 grid gap-1.5">
          {(s.options ?? ["Yes", "No"]).map((o) => (
            <span key={o} className="truncate rounded-full bg-[#eadcd5] px-3 py-1.5 text-xs font-semibold">
              {o}
            </span>
          ))}
        </div>
      </div>
    );
  }
  if (s.type === "slider") {
    return (
      <div className="w-full rounded-card bg-white p-3 text-[#22223b] shadow">
        <p className="text-sm font-bold [overflow-wrap:anywhere]">{s.label}</p>
        <div className="relative mt-3 h-1.5 rounded-full bg-[#eadcd5]">
          <span className="absolute -top-2.5 left-1/3 text-lg">😍</span>
        </div>
      </div>
    );
  }
  return (
    <div className="w-full overflow-hidden rounded-card bg-white text-[#22223b] shadow">
      <p className="bg-[#4a4e69] px-3 py-2 text-sm font-bold text-white [overflow-wrap:anywhere]">{s.label}</p>
      <p className="px-3 py-2 text-xs text-[#4a4e69]">Type something…</p>
    </div>
  );
}
