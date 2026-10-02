"use client";

import { motion, MotionConfig, useMotionValue, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Deck, Stack } from "@/components/deck";
import { ShaderBackdrop } from "@/components/shader-bg";
import { buttonClass, Chip, FreshnessMeter, Icon, RiskBadge } from "@/components/ui";
import { FORMAT_IDS, FORMATS, GOAL_IDS, GOALS } from "@/lib/cta/taxonomy";

type Demo = { id: string; slot: string; text: string } & (
  | { risk: "safe"; angle: string; fresh: number }
  | { risk: "risky"; reason: string }
);

const DEMO: Demo[] = [
  { id: "onscreen", slot: "On-screen text", text: "Save before the humidity hits", risk: "safe", angle: "Utility", fresh: 94 },
  {
    id: "bait",
    slot: "Caption close",
    text: "Tag a friend who needs this! 🔥🔥🔥",
    risk: "risky",
    reason: "Tag-a-friend asks keep the Reel out of recommendations.",
  },
  { id: "spoken", slot: "Say it, in Hinglish", text: "Apni us dost ko bhejo jo har baar sunscreen skip karti hai.", risk: "safe", angle: "Identity", fresh: 88 },
  {
    id: "opener",
    slot: "Caption opener",
    text: "Oily skin, 90% humidity, and a sunscreen you'll actually wear. Here's the 3-step fix.",
    risk: "safe",
    angle: "Utility",
    fresh: 91,
  },
];

const STEPS = [
  { title: "Brief the post", body: "What it's about, who it's for, and your script if you have one.", visual: "brief" },
  { title: "Pick a goal and format", body: "Saves, sends, DMs or sales. Reel, carousel, photo post or Story.", visual: "goal" },
  { title: "Get a CTA kit", body: "A line for every placement: say it, show it, caption it, sticker it.", visual: "kit" },
  { title: "Save what you use", body: "Cue remembers, so next week's kit doesn't sound like this week's.", visual: "memory" },
] as const;

const FEATURES = [
  {
    icon: "trending_up",
    title: "Signal-aware",
    body: "Every CTA says which Instagram signal it drives, so you know what you're asking for.",
    fact: "Sends beat likes. Instagram's head has named DM shares as a top signal for reaching people who don't follow you.",
  },
  {
    icon: "shield",
    title: "Reach-risk check",
    body: "Engagement bait is flagged with a reason and a one-tap safer rewrite.",
    fact: "Instagram doesn't recommend posts that ask for tags, likes or comment votes, and that includes “tag karo” and “like karo”.",
  },
  {
    icon: "movie",
    title: "Placement-ready",
    body: "Spoken close, five-word on-screen text, caption opener and close, last slide, Story sticker.",
    fact: "Roughly 125 characters show before “…more”. Cue writes the opener to land before the cut.",
  },
  {
    icon: "history",
    title: "Remembers you",
    body: "A freshness score against your own history, plus the phrases you lean on too much.",
    fact: "Your history stays in your browser. Export it any time.",
  },
  {
    icon: "language",
    title: "Eight languages",
    body: "Written the way Indian creators actually talk, with ₹ offers and local context when it fits.",
    fact: "English, Hinglish, Hindi, Bengali, Marathi, Telugu, Tamil and Kannada.",
  },
];

export default function Home() {
  return (
    <MotionConfig reducedMotion="user">
      <Hero />
      <HowItWorks />
      <Features />
      <Closing />
    </MotionConfig>
  );
}

/* Hero ------------------------------------------------------------------ */

function Hero() {
  return (
    <section data-nav-tone="dark" className="tone-dark relative isolate mx-2 mt-2 overflow-hidden rounded-panel sm:mx-3 sm:mt-3">
      <ShaderBackdrop />
      <div className="grid min-h-[calc(100svh-1rem)] items-center gap-12 px-gutter pb-16 pt-28 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-20 lg:pt-32">
        <div className="min-w-0 max-w-[46rem]">
          <p className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium">
            <span aria-hidden className="flex h-2.5 w-4 flex-col overflow-hidden rounded-[2px] ring-1 ring-white/30">
              <span className="flex-1 bg-[#ff9933]" />
              <span className="flex-1 bg-white" />
              <span className="flex-1 bg-[#138808]" />
            </span>
            For India&apos;s Instagram creators
          </p>
          <h1 className="mt-6 text-balance font-heading text-[clamp(2.6rem,6vw,5.75rem)] font-bold leading-[1] tracking-[-0.02em]">
            Stop ending every post with “link in bio.”
          </h1>
          <p className="mt-6 max-w-[36rem] text-lg leading-relaxed text-ink/85">
            Cue writes Instagram calls-to-action in English, Hinglish or six Indian languages that fit the format, chase the signals Instagram
            actually rewards, flag engagement bait before it costs you reach, and never repeat what you said last week.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/studio" className={buttonClass("primary", "lg")}>
              <Icon name="auto_awesome" size={22} /> Open the studio
            </Link>
            <a href="#how" className={buttonClass("secondary", "lg", "backdrop-blur-md")}>
              See how it works
            </a>
          </div>
          <p className="mt-6 text-sm text-ink/75">Free to try, no login. Your history stays in your browser.</p>
        </div>
        <HeroDeck />
      </div>
    </section>
  );
}

function HeroDeck() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (paused || reduce) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % DEMO.length), 3600);
    return () => clearInterval(id);
  }, [paused, reduce]);

  return (
    <div
      className="w-full min-w-0 max-w-[30rem] justify-self-center lg:justify-self-end"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <p className="glass mb-4 inline-flex max-w-full items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium">
        <Icon name="movie" size={16} />
        <span className="truncate">Example Reel kit for monsoon skincare</span>
      </p>
      <Deck items={DEMO} index={index} onIndexChange={setIndex} getKey={(d) => d.id} label="Example CTAs" deal={0.35} renderCard={(d) => <DemoCard demo={d} />} />
    </div>
  );
}

function DemoCard({ demo }: { demo: Demo }) {
  return (
    <div className="flex min-h-[15.5rem] flex-1 flex-col p-6">
      <p className="text-sm text-ink-muted">{demo.slot}</p>
      <p
        className={`mt-2 font-heading text-[clamp(1.3rem,2.2vw,1.6rem)] font-medium leading-snug [overflow-wrap:anywhere] ${
          demo.risk === "risky" ? "text-ink-muted line-through decoration-risky/70" : ""
        }`}
      >
        {demo.text}
      </p>
      <div className="mt-auto pt-5">
        {demo.risk === "risky" ? (
          <>
            <RiskBadge risk="risky" />
            <p className="mt-2 flex gap-1.5 text-sm font-medium text-risky">
              <Icon name="shield" size={18} />
              <span className="min-w-0">{demo.reason}</span>
            </p>
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              <RiskBadge risk="safe" />
              <Chip>{demo.angle}</Chip>
            </div>
            <FreshnessMeter value={demo.fresh} />
          </div>
        )}
      </div>
    </div>
  );
}

/* How it works: cards stack as you scroll -------------------------------- */

function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  return (
    <section id="how" aria-labelledby="how-title" className="scroll-mt-24 px-gutter pt-24 sm:pt-32">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-16">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <h2 id="how-title" className="max-w-md text-balance font-heading text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[1.05]">
            From brief to a full CTA kit in under a minute.
          </h2>
          <p className="mt-4 max-w-sm leading-relaxed text-ink-muted">Four steps. The last one is the reason your CTAs stop sounding the same.</p>
        </div>
        <div ref={ref} className="min-w-0">
          {STEPS.map((step, i) => (
            <StepCard key={step.title} step={step} i={i} progress={scrollYProgress} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StepCard({ step, i, progress }: { step: (typeof STEPS)[number]; i: number; progress: MotionValue<number> }) {
  const n = STEPS.length;
  const scale = useTransform(progress, [i / n, 1], [1, 1 - (n - 1 - i) * 0.04]);
  return (
    <div className="sticky flex h-[62vh] min-h-[24rem] items-start last:h-auto last:pb-4" style={{ top: `calc(7rem + ${i * 1.5}rem)` }}>
      <motion.article
        style={{ scale }}
        className="glass-strong grid w-full origin-top gap-8 rounded-panel p-6 sm:p-8 md:min-h-[min(28rem,52vh)] md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-center md:p-10"
      >
        <div className="flex min-w-0 flex-col md:self-stretch">
          <span className="font-heading text-6xl font-bold leading-none text-ink-muted/70 tabular-nums">{i + 1}</span>
          <h3 className="mt-8 font-heading text-[clamp(1.6rem,2.4vw,2.1rem)] font-bold leading-tight md:mt-auto">{step.title}</h3>
          <p className="mt-3 max-w-md leading-relaxed text-ink-muted">{step.body}</p>
        </div>
        <div className="hidden min-w-0 md:block">
          <StepVisual kind={step.visual} />
        </div>
      </motion.article>
    </div>
  );
}

function StepVisual({ kind }: { kind: (typeof STEPS)[number]["visual"] }) {
  if (kind === "brief") {
    return (
      <div className="grid gap-4 rounded-card border border-line bg-bg/40 p-5">
        <MockField label="What's the post about?" value="Monsoon skincare routine for oily skin" caret />
        <MockField label="Who is it for?" value="college students" />
      </div>
    );
  }
  if (kind === "goal") {
    return (
      <div className="grid gap-5 rounded-card border border-line bg-bg/40 p-5">
        <MockChoices label="What should it get you?" options={GOAL_IDS.slice(0, 4).map((id) => ({ label: GOALS[id].label, icon: GOALS[id].icon }))} />
        <MockChoices label="Format" options={FORMAT_IDS.map((id) => ({ label: FORMATS[id].label, icon: FORMATS[id].icon }))} />
      </div>
    );
  }
  if (kind === "kit") {
    return (
      <Stack className="max-w-sm">
        <div className="p-5">
          <p className="text-sm text-ink-muted">On-screen text</p>
          <p className="mt-1.5 font-heading text-xl font-medium">Save before the humidity hits</p>
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <RiskBadge risk="safe" />
            <Chip>Utility</Chip>
          </div>
        </div>
      </Stack>
    );
  }
  return (
    <ul className="grid gap-3 rounded-card border border-line bg-bg/40 p-5">
      <li className="grid gap-2">
        <p className="text-ink-muted line-through decoration-watch/70">Hit save now. Future you will thank you.</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <FreshnessMeter value={32} />
          <span className="text-xs text-ink-muted">You said this on 14 Sep</span>
        </div>
      </li>
      <li className="grid gap-2 border-t border-line pt-3">
        <p className="font-medium">Save before the humidity hits</p>
        <FreshnessMeter value={94} />
      </li>
    </ul>
  );
}

function MockField({ label, value, caret }: { label: string; value: string; caret?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-1.5 flex h-11 items-center truncate rounded-field border border-line bg-surface/70 px-4 text-[15px]">
        <span className="truncate">{value}</span>
        {caret && <span aria-hidden className="ml-0.5 h-5 w-px shrink-0 animate-pulse bg-ink" />}
      </p>
    </div>
  );
}

function MockChoices({ label, options }: { label: string; options: { label: string; icon: string }[] }) {
  return (
    <div>
      <p className="text-sm font-semibold">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o, i) => (
          <span
            key={o.label}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium ${i === 0 ? "bg-primary text-on-primary" : "border border-line text-ink-muted"}`}
          >
            <Icon name={o.icon} size={16} filled={i === 0} />
            {o.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* Features: vertical scroll drives a horizontal track -------------------- */

function Features() {
  const outer = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [distance, setDistance] = useState(0);
  const [wide, setWide] = useState(false);
  const travel = useMotionValue(0);
  const { scrollYProgress } = useScroll({ target: outer, offset: ["start start", "end end"] });
  const x = useTransform(() => -scrollYProgress.get() * travel.get());

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const measure = () => {
      const d = Math.max(0, el.scrollWidth - document.documentElement.clientWidth);
      setWide(mq.matches);
      setDistance(d);
      travel.set(d);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    mq.addEventListener("change", measure);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", measure);
      window.removeEventListener("resize", measure);
    };
  }, [travel]);

  // Pin and pan on large screens. Elsewhere (and with reduced motion) it's a plain swipeable row.
  const pinned = wide && !reduce && distance > 0;

  return (
    <section ref={outer} aria-labelledby="features-title" className={`relative ${pinned ? "" : "mt-12"}`} style={pinned ? { height: `calc(100vh + ${distance}px)` } : undefined}>
      <div className={pinned ? "sticky top-0 flex h-screen flex-col justify-center overflow-hidden" : "py-12"}>
        <motion.div
          ref={track}
          style={pinned ? { x } : undefined}
          className={
            pinned
              ? "flex w-max items-stretch gap-5 px-gutter"
              : "no-scrollbar flex snap-x snap-mandatory scroll-px-(--gutter) items-stretch gap-4 overflow-x-auto px-gutter pb-6"
          }
        >
          <div className="flex w-[min(30rem,82vw)] shrink-0 snap-start flex-col justify-center pr-4 lg:pr-10">
            <h2 id="features-title" className="text-balance font-heading text-[clamp(2rem,4vw,3.5rem)] font-bold leading-[1.05]">
              Not another caption generator.
            </h2>
            <p className="mt-4 max-w-md leading-relaxed text-ink-muted">
              Generic tools hand you “follow for more”. Cue knows the format, knows what Instagram rewards, and remembers what you said last time.
            </p>
            {!pinned && (
              <p className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted">
                Swipe for more <Icon name="arrow_forward" size={18} />
              </p>
            )}
          </div>
          {FEATURES.map((f) => (
            <article key={f.title} className="glass flex w-[min(24rem,82vw)] shrink-0 snap-start flex-col rounded-panel p-7 lg:min-h-[27rem] lg:p-8">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-primary text-on-primary">
                <Icon name={f.icon} size={24} />
              </span>
              <h3 className="mt-6 font-heading text-2xl font-bold">{f.title}</h3>
              <p className="mt-3 leading-relaxed text-ink-muted">{f.body}</p>
              {f.fact && <p className="mt-auto border-t border-line pt-5 text-sm leading-relaxed">{f.fact}</p>}
            </article>
          ))}
        </motion.div>
        {pinned && (
          <div aria-hidden className="mt-10 h-1 overflow-hidden rounded-full bg-line" style={{ marginInline: "var(--gutter)" }}>
            <motion.div className="h-full origin-left rounded-full bg-ink" style={{ scaleX: scrollYProgress }} />
          </div>
        )}
      </div>
    </section>
  );
}

/* Closing ------------------------------------------------------------------ */

function Closing() {
  return (
    <section data-nav-tone="dark" className="tone-dark relative isolate mx-2 mb-2 mt-16 overflow-hidden rounded-panel sm:mx-3 sm:mb-3 sm:mt-24">
      <ShaderBackdrop scrim="center" />
      <div className="flex flex-col items-center px-gutter pt-28 text-center sm:pt-36">
        <h2 className="max-w-4xl text-balance font-heading text-[clamp(2.25rem,5.5vw,5rem)] font-bold leading-[1.02]">
          Your next post deserves a better last line.
        </h2>
        <Link href="/studio" className={buttonClass("primary", "lg", "mt-8")}>
          <Icon name="auto_awesome" size={22} /> Write my CTAs
        </Link>
        {/* Sized by its viewBox, so the wordmark always spans the section and never overflows it. */}
        <svg aria-hidden viewBox="0 -76 293 82" className="mt-16 block w-full select-none sm:mt-24">
          <defs>
            <linearGradient id="wordmark-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f2e9e4" stopOpacity="0.95" />
              <stop offset="1" stopColor="#f2e9e4" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <text x="0" y="0" fontSize="100" fill="url(#wordmark-fill)" style={{ fontFamily: "var(--font-oi)" }}>
            cue
          </text>
        </svg>
      </div>
    </section>
  );
}
