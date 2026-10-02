# Stage 1 — Design System, Theme & Motion

> **Wave W1 · runs in parallel with Stage 2 and Stage 4.**
> Copy this entire file as the first message of a fresh session.

---

## Role & mission

You are building ContentYou's design system in `packages/ui`: the theme, the type scale, the
core components, and the **motion layer** (Lenis smooth scroll + reusable animation
primitives). Stage 8 will assemble the actual application screens from what you make — you
are building the vocabulary, not the pages.

Two things make this stage more than a shadcn install: the palette in `PS.md` is broken and
must be handled correctly rather than literally, and the motion layer has real accessibility
and focus-management traps that you are responsible for not walking into.

---

## Wave & siblings

Running **now, in parallel**: Stage 2 (`packages/db`) and Stage 4 (`packages/ai`).

You need **neither**. You depend only on `packages/schemas` (frozen in Stage 0) and only for
types. Build components against static props and fixture data. **Do not wait on anything.**

---

## File ownership

- **Own (exclusive write):** `packages/ui/**`, `apps/web/app/globals.css`,
  `apps/web/app/layout.tsx` (theme provider + Lenis mount only),
  `apps/web/app/_preview/**` (the component gallery route)
- **Read only:** `packages/schemas/**`, `CLAUDE.md`, `docs/`, `PS.md`
- **Must not touch:** `packages/db/**` (Stage 2), `packages/ai/**` (Stage 4),
  any other `apps/web/app/**` route (Stage 8), root `package.json`

---

## Read first

1. `CLAUDE.md` — §7 (design language) and **§8.2 (the palette deviation — critical)**
2. `docs/DECISIONS.md` — ADR-006
3. `PS.md` — the palette block and the tone the product owner wants ("modern, clean,
   artistic")

---

## Context you can rely on

**The palette problem, stated plainly.** `PS.md` gives two palettes. The dark one is fine.
The one labelled "light mode" is not a light theme:

```
Dark   #06141B  #11212D  #253745  #4A5C6A  #9BA8AB  #CCD0CF   ← correct bg→text ramp, use as given
"Light" #800021  #881144  #243A66  #C24366  #FF69B4           ← five dark saturated hues, NO neutrals
```

There is no background, no surface, no border colour in the second set. `--background:
#800021` with `--foreground: #FF69B4` is about 2:1 contrast and fails WCAG AA badly.

**Your treatment:** the five are the **brand / accent / data-viz ramp**. Derive neutral light
surfaces for light mode and render the accents over them. Preserve all five hex values
exactly — they are clearly a deliberate identity (deep crimson → hot pink, navy anchor).
Prove the result with a contrast table. Do not silently "fix" the palette some other way, and
do not use it literally.

**Motion is part of the system, not decoration.** The product owner asked for Lenis and UI
enhancers specifically.

---

## Deliverables

### 1. Theme tokens — `packages/ui/src/theme/`

CSS custom properties on `:root`, redefined for dark mode. Semantic names
(`--surface`, `--surface-raised`, `--border`, `--text-primary`, `--text-muted`,
`--accent`, `--accent-hover`, `--focus-ring`) — never raw hex at a call site.

- Dark mode maps to the `PS.md` dark ramp directly.
- Light mode uses derived neutrals + the five accents. **Document the derivation** in a
  comment: where the neutrals came from and why.
- Theme switching via `data-theme` on `<html>`, defaulting to system preference, with no
  flash of wrong theme on first paint.

### 2. Contrast table — `packages/ui/CONTRAST.md`

Every foreground/background pair the system actually uses, with its computed ratio and
pass/fail against **WCAG AA** (4.5:1 body text, 3:1 large text and UI boundaries), for both
themes. Compute these — do not estimate. Any failing pair must be fixed or documented as
decorative-only with a reason.

This file is the evidence for ADR-006. It is a required deliverable, not a nicety.

### 3. Typography & spacing

A type scale (a modular ratio, not ad-hoc sizes), line heights tuned for reading, and a
spacing scale. Choose fonts deliberately — the product owner asked for "artistic", and
system-font-stack defaults will read as unfinished. Self-host or use Google Fonts, and keep
the loaded weight count small.

### 4. Core components — `packages/ui/src/components/`

Tailwind + shadcn/ui, restyled to the theme rather than left at shadcn defaults:

Button · Input · Textarea · Card · Dialog · Sheet · Tabs · Badge · Toast ·
Skeleton · Avatar · DropdownMenu · Tooltip · Progress · Calendar (month grid) ·
Timeline (vertical, for the live run view) · EmptyState

Plus **`IdeaBox`** — the single hero text box that is the entire entry screen. Give this one
real attention: it is the product's front door, it is the only thing on that screen, and
`CLAUDE.md` §7 forbids adding fields beside it. Auto-grow, keyboard submit, a considered
empty state and focus treatment.

### 5. Motion layer — `packages/ui/src/motion/`

Lenis for smooth scroll, plus reusable primitives:

| Component | Behaviour |
|---|---|
| `<SmoothScrollProvider>` | Lenis lifecycle, mounted once in the root layout |
| `<ScrollReveal>` | enter on scroll into view, staggerable |
| `<ScrollProgress>` | scroll-linked progress indicator |
| `<MagneticButton>` | cursor-attraction hover |
| `<TiltCard>` | pointer-tracked 3D tilt |
| `<NumberTicker>` | animated count-up for analytics figures |
| `<ViewTransition>` | route transition wrapper |

**Every primitive must handle `prefers-reduced-motion`** by rendering the final state
immediately — not by animating faster. Test this.

**The three Lenis traps — you are responsible for all three:**
1. **Anchor links** (`#section`) stop working unless routed through Lenis's own scroll-to.
2. **Focus-on-scroll**: keyboard Tab to an off-screen element must still bring it into view.
   Lenis hijacking native scroll commonly breaks this, which is a genuine accessibility
   regression.
3. **Modal scroll-lock**: Lenis must be stopped when a Dialog/Sheet is open, or the page
   scrolls behind the overlay.

Verify each explicitly and record how in your evidence.

### 6. Preview gallery — `apps/web/app/_preview/page.tsx`

Every component and motion primitive on one route, in both themes, with a theme toggle. This
is how Stage 8 discovers what exists and how you demonstrate the work. Dev-only.

---

## Constraints & guardrails

- **Do not set a `PS.md` "light mode" colour as a light-theme background.** See §8.2.
- **No raw hex outside the token file.** Components reference semantic tokens only.
- **No data fetching, no API calls, no business logic.** Fixtures only.
- **Do not create application routes** — `apps/web/app/_preview` is yours; everything else
  under `app/` belongs to Stage 8.
- Dependencies go in `packages/ui/package.json` with a one-line justification each.
- Keep the animation library count at **one** (plus Lenis). Do not mix.
- Components must work at phone width with a 16px gutter and no horizontal page scroll.

---

## Acceptance criteria

Run each; paste actual output into `docs/checkpoints.md` under Stage 1's Evidence log.

```bash
pnpm typecheck --filter @contentyou/ui
pnpm lint --filter @contentyou/ui
pnpm test --filter @contentyou/ui
pnpm dev --filter web        # then open /_preview
```

- [ ] `packages/ui/CONTRAST.md` exists, every pair computed, **no AA failure** for text.
- [ ] `/_preview` renders every component and primitive, in both themes.
- [ ] Toggling theme causes **no flash of wrong theme** on reload.
- [ ] With OS reduced-motion on, every primitive renders its final state with no animation
      — verified in a browser, not assumed.
- [ ] Anchor link to an in-page `#id` scrolls correctly with Lenis active.
- [ ] Keyboard Tab to an off-screen focusable element scrolls it into view.
- [ ] Opening a Dialog stops Lenis; the page does not scroll behind the overlay; closing
      restores it.
- [ ] At 375px width: no horizontal scroll on the preview page.
- [ ] `IdeaBox` is keyboard-operable end to end and its focus ring meets 3:1.

---

## Checkpoint update

Tick Stage 1's boxes in `docs/checkpoints.md`, paste evidence, run `pnpm checkpoints`. Write
**only** Stage 1's section.

---

## Out of scope

Application screens, routing, auth UI, data fetching, SSE (all Stage 8). Analytics charts —
build `NumberTicker`, not the dashboard.

---

## Harness notes

**Claude Code** — invoke `frontend-design:frontend-design` before making aesthetic choices;
this stage is exactly what it is for. `design:accessibility-review` is a good final pass
before you tick the a11y boxes.

**Antigravity** — no skills available. In plain terms: make deliberate typographic and
colour choices rather than accepting library defaults, and run a WCAG AA pass over contrast,
focus order, focus visibility and reduced-motion before claiming done.

**Both** — the motion and a11y checkboxes require a real browser. If you cannot open one,
mark them blocked rather than ticking them.
