"use client";

import { LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ButtonHTMLAttributes, type ReactNode } from "react";
import type { Risk } from "@/lib/cta/lint";

export const EASE = [0.22, 1, 0.36, 1] as const;

export function Icon({ name, filled, className = "", size = 20 }: { name: string; filled?: boolean; className?: string; size?: number }) {
  return (
    <span
      aria-hidden
      className={`material-symbols-rounded ${filled ? "filled" : ""} inline-block shrink-0 ${className}`}
      style={{ fontSize: size, width: size, height: size }}
    >
      {name}
    </span>
  );
}

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:opacity-90 shadow-[0_12px_32px_-14px_rgb(0_0_0/0.45)]",
  secondary: "border border-line bg-surface/60 text-ink hover:bg-surface",
  ghost: "text-ink-muted hover:bg-surface-2/70 hover:text-ink",
};
const SIZES: Record<Size, string> = { sm: "h-9 px-3.5 text-sm gap-1.5", md: "h-11 px-5 text-sm gap-2", lg: "h-12 px-6 text-base gap-2" };

/** Pill styles shared by <Button> and by links that should look like buttons. */
export function buttonClass(variant: Variant = "secondary", size: Size = "md", className = "") {
  return `inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full font-medium transition-[background-color,color,opacity,transform] duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; icon?: string; iconRight?: string };

export function Button({ variant = "secondary", size = "md", icon, iconRight, className = "", children, ...rest }: ButtonProps) {
  return (
    <button className={buttonClass(variant, size, className)} {...rest}>
      {icon && <Icon name={icon} size={size === "lg" ? 22 : 18} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === "lg" ? 22 : 18} />}
    </button>
  );
}

export function Chip({ children, icon, className = "" }: { children: ReactNode; icon?: string; className?: string }) {
  return (
    <span className={`inline-flex min-w-0 max-w-full items-center gap-1 rounded-full border border-line bg-surface/50 px-2.5 py-1 text-xs font-medium text-ink-muted ${className}`}>
      {icon && <Icon name={icon} size={14} />}
      <span className="truncate">{children}</span>
    </span>
  );
}

const RISK_STYLE: Record<Risk, { label: string; icon: string; cls: string }> = {
  safe: { label: "Safe for reach", icon: "check_circle", cls: "bg-safe-bg text-safe" },
  watch: { label: "Watch", icon: "info", cls: "bg-watch-bg text-watch" },
  risky: { label: "Reach risk", icon: "warning", cls: "bg-risky-bg text-risky" },
};

export function RiskBadge({ risk }: { risk: Risk }) {
  const s = RISK_STYLE[risk];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls}`}>
      <Icon name={s.icon} size={14} filled />
      {s.label}
    </span>
  );
}

export function FreshnessMeter({ value }: { value: number }) {
  const tone = value >= 70 ? "bg-safe" : value >= 40 ? "bg-watch" : "bg-risky";
  return (
    <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-xs font-medium text-ink-muted" title="How different this is from CTAs you've used before">
      Fresh
      <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-surface-2">
        <span className={`absolute inset-y-0 left-0 rounded-full ${tone} transition-[width] duration-500 ease-out`} style={{ width: `${value}%` }} />
      </span>
      <span className="tabular-nums text-ink">{value}</span>
    </span>
  );
}

// The theme lives on <html data-theme> (or the OS setting), so read it from there instead of copying it into state.
function subscribeTheme(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  media.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", onChange);
  };
}
function isDarkTheme() {
  const explicit = document.documentElement.dataset.theme;
  return explicit ? explicit === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribeTheme, isDarkTheme, () => false);
  const toggle = () => {
    const next = !dark;
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem("cue-theme", next ? "dark" : "light");
    } catch {
      /* storage blocked: theme still applies for this visit */
    }
  };
  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface-2/70 hover:text-ink"
    >
      <Icon name={dark ? "light_mode" : "dark_mode"} />
    </button>
  );
}

/** The wordmark. Set in Oi, always lowercase. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" aria-label="Cue home" className={`font-logo text-[1.45rem] leading-none text-ink transition-colors ${className}`}>
      cue
    </Link>
  );
}

const NAV = [
  { href: "/studio", label: "Studio", icon: "auto_awesome" },
  { href: "/history", label: "History", icon: "history" },
];

type Tone = "dark" | "light";

// Roughly the vertical center of the floating pill (padding + half its height), used to sample
// the tone of whatever section sits under it without reading the nav's own (possibly translated) rect.
const NAV_PROBE_Y = 44;
// Distance to scroll past before the nav will hide — keeps small, jittery scrolls from flickering it.
const HIDE_THRESHOLD = 72;

/**
 * Floating glass pill. It reads the `data-nav-tone` of whichever section is under it and
 * takes that section's palette, so it stays legible over the dark shader and the light page.
 * It steps out of the way on scroll-down and returns on scroll-up, so it never fights a long page.
 */
export function SiteHeader() {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [tone, setTone] = useState<Tone | null>(null);
  const lastY = useRef(0);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const y = window.scrollY;
      setScrolled(y > 12);
      if (y < HIDE_THRESHOLD) setHidden(false);
      else if (y > lastY.current) setHidden(true);
      else if (y < lastY.current) setHidden(false);
      lastY.current = y;

      const under = Array.from(document.querySelectorAll<HTMLElement>("[data-nav-tone]")).find((el) => {
        const r = el.getBoundingClientRect();
        return r.top <= NAV_PROBE_Y && r.bottom >= NAV_PROBE_Y;
      });
      const next = under?.dataset.navTone;
      setTone(next === "dark" || next === "light" ? next : null);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [path]);

  return (
    <motion.header
      animate={{ y: hidden ? "-130%" : "0%", opacity: hidden ? 0 : 1 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-gutter pt-3 sm:pt-4"
    >
      <nav
        aria-label="Main"
        className={`pointer-events-auto flex items-center gap-1 rounded-full py-1.5 pl-4 pr-1.5 text-ink transition-[background-color,border-color,box-shadow,color] duration-300 sm:pl-5 ${scrolled ? "glass-strong" : "glass"} ${tone ? `tone-${tone}` : ""}`}
      >
        <Logo />
        <span aria-hidden className="mx-1.5 h-5 w-px bg-line transition-colors duration-300 sm:mx-2.5" />
        <LayoutGroup id="nav">
          {NAV.map((item) => {
            const active = path.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={`relative inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors duration-300 sm:px-3.5 ${active ? "text-on-primary" : "text-ink-muted hover:text-ink"}`}
              >
                {active && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-full bg-primary" transition={{ duration: 0.35, ease: EASE }} />}
                <Icon name={item.icon} size={18} filled={active} className="relative" />
                <span className="relative hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </LayoutGroup>
        <ThemeToggle />
      </nav>
    </motion.header>
  );
}

export function SiteFooter() {
  return (
    <footer className="px-gutter pb-8 pt-6 text-sm text-ink-muted">
      <div className="flex flex-col gap-2 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-logo text-base leading-none text-ink">cue</span>
          Instagram CTAs for Indian creators. Your history stays in your browser.
        </p>
        <p>Built on Instagram&apos;s published recommendation guidelines.</p>
      </div>
    </footer>
  );
}
