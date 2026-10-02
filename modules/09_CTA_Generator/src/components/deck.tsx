"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { EASE, Icon } from "./ui";

// Forward: the top card flicks off to the left and the next one rises out of the stack.
// Backward: the top card sinks into the stack and the previous one slides back on top.
const FLICK = { x: -72, y: 0, scale: 1, rotate: -5, opacity: 0 };
const SINK = { x: 0, y: 14, scale: 0.94, rotate: 0, opacity: 0 };
const CARD = {
  enter: (dir: number) => ({ ...(dir > 0 ? SINK : FLICK), zIndex: dir > 0 ? 1 : 3 }),
  center: { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1, zIndex: 2 },
  exit: (dir: number) => ({ ...(dir > 0 ? FLICK : SINK), zIndex: dir > 0 ? 3 : 1 }),
};

const STEP_PX = 13;

/** Blank cards peeking out under the top one. Also used on its own for empty and loading states. */
function Layers({ count, deal }: { count: number; deal?: number }) {
  return Array.from({ length: count }, (_, i) => (
    <motion.div
      key={i}
      aria-hidden
      className="glass pointer-events-none rounded-card [grid-area:1/1]"
      style={{ transformOrigin: "50% 100%", zIndex: -1 - i }}
      initial={deal === undefined ? false : { y: 0, scale: 1, opacity: 0 }}
      animate={{ y: (i + 1) * STEP_PX, scale: 1 - (i + 1) * 0.05, opacity: 1 - i * 0.3 }}
      transition={{ duration: 0.7, ease: EASE, delay: (deal ?? 0) + 0.12 * (i + 1) }}
    />
  ));
}

/** A still stack of cue cards. */
export function Stack({ children, layers = 2, className = "" }: { children: ReactNode; layers?: number; className?: string }) {
  return (
    <div className={`relative isolate grid pb-7 ${className}`}>
      <Layers count={layers} />
      <div className="glass-strong flex min-w-0 flex-col rounded-card [grid-area:1/1]">{children}</div>
    </div>
  );
}

type DeckProps<T> = {
  items: readonly T[];
  index: number;
  onIndexChange: (index: number) => void;
  getKey: (item: T) => string;
  renderCard: (item: T) => ReactNode;
  label: string;
  /** Delay before the stack fans out on first render. Omit to skip the entrance. */
  deal?: number;
  className?: string;
};

/**
 * A stack of cue cards. The card on top is the current one; the rest peek out underneath.
 * Arrow keys, the chevrons and the dots flip through it.
 */
export function Deck<T>({ items, index, onIndexChange, getKey, renderCard, label, deal, className = "" }: DeckProps<T>) {
  const n = items.length;
  const current = Math.min(Math.max(index, 0), Math.max(n - 1, 0));
  const [shown, setShown] = useState(current);
  const [dir, setDir] = useState(1);
  // Work out which way the stack moved during render, so the exit and enter animations agree.
  if (shown !== current) {
    setShown(current);
    setDir((current - shown + n) % n <= n / 2 ? 1 : -1);
  }

  if (n === 0) return null;
  const item = items[current];
  const next = () => onIndexChange((current + 1) % n);
  const prev = () => onIndexChange((current - 1 + n) % n);

  return (
    <div
      role="group"
      aria-roledescription="card stack"
      aria-label={label}
      className={`min-w-0 ${className}`}
      onKeyDown={(e) => {
        if (n < 2) return;
        if (e.key === "ArrowRight") {
          e.preventDefault();
          next();
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          prev();
        }
      }}
    >
      <div className="relative isolate grid pb-7">
        <Layers count={Math.min(n - 1, 2)} deal={deal} />
        <AnimatePresence initial={false} custom={dir}>
          <motion.div
            key={getKey(item)}
            custom={dir}
            variants={CARD}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.45, ease: EASE }}
            className="glass-strong flex min-w-0 flex-col rounded-card [grid-area:1/1]"
          >
            {renderCard(item)}
          </motion.div>
        </AnimatePresence>
      </div>

      {n > 1 && (
        <div className="glass inline-flex max-w-full items-center rounded-full p-0.5">
          <button type="button" onClick={prev} aria-label="Previous option" className={NAV_BTN}>
            <Icon name="chevron_left" />
          </button>
          <div className="flex items-center">
            {items.map((it, i) => (
              <button
                key={getKey(it)}
                type="button"
                onClick={() => onIndexChange(i)}
                aria-label={`Show option ${i + 1}`}
                aria-current={i === current}
                className="group grid h-9 place-items-center px-1"
              >
                <span className={`block h-1.5 rounded-full transition-all duration-300 ${i === current ? "w-5 bg-ink" : "w-1.5 bg-ink-muted/40 group-hover:bg-ink-muted"}`} />
              </button>
            ))}
          </div>
          <button type="button" onClick={next} aria-label="Next option" className={NAV_BTN}>
            <Icon name="chevron_right" />
          </button>
          <span aria-live="polite" className="whitespace-nowrap pl-1 pr-3.5 text-xs font-medium tabular-nums text-ink-muted">
            {current + 1} of {n}
          </span>
        </div>
      )}
    </div>
  );
}

const NAV_BTN = "grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface-2/70 hover:text-ink";
