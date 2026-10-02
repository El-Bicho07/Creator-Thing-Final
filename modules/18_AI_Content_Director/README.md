# 18 — AI Content Director (CineSensei Studio) 🎬

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38b2ac?style=flat&logo=tailwind-css)](https://tailwindcss.com/)

> **Problem Statement #18:** *Turning an idea into a complete production plan requires several disconnected steps.*  
> **Build Challenge:** *Research a topic, identify angles, recommend a narrative, generate a script, suggest visuals/B-roll, create a shot list and publishing copy.*  
> **Assigned Student:** Sri Jananii S  
> **Branch Name:** `18_AI_Content_Director`  

---

## 🌟 Overview
**CineSensei (AI Content Director)** is a production-grade, 7-stage guided content creation workflow engine that transforms raw creative ideas into complete, studio-ready production packages. Rather than requiring creators to juggle disconnected tools, CineSensei provides a single cohesive pipeline with context passing across every stage.

### 🎮 New Feature: AAA Gaming & Video Editor Motion Launch Screen
- **5–8 Second Intro:** Displays an exclusive fullscreen gaming & pro video editor logo animation before transitioning to the studio dashboard.
- **Anime Cine-Camera Simulation:** Features motorized rotating amber/tandoori film reels, sweeping radar scanner, glowing anamorphic lens flare beam, and clapperboard marker.
- **Audio Equalizer & Video Scrubber:** Live millisecond timecode (`[● REC 00:00:0X:XX]`), ProRes 422 HQ telemetry, Web Audio synthesizer power-up and shutter click SFX, and interactive skip controls.

### 1. The 7-Stage Production Pipeline
Every stage feeds its structured context into subsequent stages:
1. **Research & Facts**: Verified statistics, key facts, emerging trends, audience pain points, and authoritative source links.
2. **Content Angles**: 5 distinct positioning angles with viral hooks, target emotion, uniqueness scores (1-10), and production difficulty (1-10). Interactive angle selector.
3. **Narrative Architecture**: Recommended story framework (e.g. *Problem-Agitate-Solve*, *Hero's Journey*), core theme, pacing, and beat-by-beat timeline with timing and emotional arcs.
4. **Spoken Script**: Full word-for-word spoken teleprompter script (Hook, Intro, Body, CTA) with live word count, speaking cadence (~145 wpm), and vocal delivery notes.
5. **Visuals & B-Roll**: Section-by-section art direction, B-roll cutaway concepts, click-to-copy stock footage keywords (for Storyblocks/Artgrid), kinetic graphics overlays, and music mood.
6. **Production Shot List**: Technical shot table (Shot #, Scene, Shot Type, Camera Movement, Location Setup, Dialogue line, Duration, Director Notes) with interactive shot completion checkboxes.
7. **Publishing & Distribution Matrix**: 5 viral title options, full SEO description with timestamps, hashtag & keyword clouds, 3 high-contrast thumbnail concepts, and platform-tailored copy for **YouTube**, **Instagram Reels**, **TikTok**, **LinkedIn**, and **X (Twitter) Threads**.

---

## 📱 Responsive & Adaptive Architecture

AI Content Director is engineered mobile-first and tested from **320px to 1920px+**:

| Device Width | Layout Strategy |
| :--- | :--- |
| **Phones (320px – 430px)** | Single column, safe-area insets (`min-h-dvh`, `viewport-fit=cover`), touch targets $\ge$ 44px, 16px minimum input font (preventing iOS auto-zoom), sticky bottom action bar (`Edit`, `Regenerate`, `Approve & Continue`, `Copy`), compact top "Step 3 of 7" bar with a touch drawer, and slide-over Project Vault drawer. **The shot list automatically transforms into stacked mobile cards.** |
| **Tablets (768px – 1024px)** | Adaptive two-column layouts with collapsible drawer history and responsive data grids. |
| **Desktops (1440px+)** | Three-panel studio interface: **Project Vault** (left), **Stage Workspace** (center), and **Pipeline Stepper & Director Tips** (right). |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.17+ or Node.js 20+
- npm, pnpm, or yarn

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/your-username/ai-content-director.git
cd ai-content-director
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your Anthropic API key in `.env.local`:
```env
ANTHROPIC_API_KEY=sk-ant-api03-...
```

> **Note on Zero-Configuration Demo Mode:**  
> If `ANTHROPIC_API_KEY` is not provided, the application runs in high-fidelity **Demo Mode**. It generates realistic, deeply tailored production packages for whatever topic, platform, and audience you input.

### 3. Run Locally
Start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

To run the optimized production build:
```bash
npm run build
npm run start
```

---

## 🚢 Deployment to Vercel

1. Push your repository to GitHub, GitLab, or Bitbucket.
2. Go to [Vercel Dashboard](https://vercel.com/new) and click **"Add New Project"**.
3. Select your repository.
4. Under **Environment Variables**, add:
   - `ANTHROPIC_API_KEY` = your Anthropic API key
5. Click **Deploy**. Vercel will automatically detect Next.js and build the project.

---

## 📂 Project Architecture

```
ai-content-director/
├── app/
│   ├── api/
│   │   └── pipeline/
│   │       └── generate/
│   │           └── route.ts         # Secure server-side LLM endpoint (rate-limited, Zod-validated)
│   ├── globals.css                  # Tailwind tokens, dark/light themes, print styles, safe-area insets
│   ├── layout.tsx                   # Viewport-fit cover, viewport meta, theme providers
│   └── page.tsx                     # Main 3-panel studio container, project state machine
├── components/
│   ├── Header.tsx                   # Brand, Generate All toggle, Export modal trigger, Theme toggle
│   ├── StartScreen.tsx              # Project intake screen with presets, platforms, tones, durations
│   ├── SidebarHistory.tsx           # Slide-over & desktop drawer for project history
│   ├── StageStepper.tsx             # Desktop right-panel stepper & director tip cards
│   ├── MobileStepperBar.tsx         # Mobile compact "Step X of 7" bar + navigation drawer
│   ├── StickyBottomBar.tsx          # Sticky mobile action bar (Edit, Regen, Approve, Copy)
│   ├── StageSkeletonLoader.tsx      # Animated skeleton loaders during generation
│   ├── stages/
│   │   ├── ResearchStage.tsx        # Stage 1: Facts, statistics, trends, pain points, sources
│   │   ├── AnglesStage.tsx          # Stage 2: 5 angles, scores, hooks, emotion badges
│   │   ├── NarrativeStage.tsx       # Stage 3: Framework, core theme, beat timeline
│   │   ├── ScriptStage.tsx          # Stage 4: Teleprompter script, word count, speaking time
│   │   ├── VisualsStage.tsx         # Stage 5: B-roll, stock keywords, overlays, audio mood
│   │   ├── ShotListStage.tsx        # Stage 6: Responsive table / stacked mobile cards + CSV export
│   │   └── PublishingStage.tsx      # Stage 7: Titles, SEO desc, thumbnails, multi-platform captions
│   └── modals/
│       ├── ExportModal.tsx          # Markdown (.md), CSV (.csv), and PDF print triggers
│       ├── EditStageModal.tsx       # Live structured JSON/text editor for active stage
│       └── RegenerateModal.tsx      # Director steering notes and prompt refinement
├── lib/
│   ├── export.ts                    # Universal Markdown, CSV, and PDF export formatting
│   ├── mock-data.ts                 # High-fidelity context-aware fallback generators
│   ├── prompts.ts                   # Director system prompts and stage prompt builders
│   ├── schemas.ts                   # Strict Zod validation schemas for all 7 stages
│   ├── stages-config.ts             # Stage metadata, icons, and director tips
│   ├── storage.ts                   # LocalStorage persistence, sample project, CRUD
│   ├── types.ts                     # Full TypeScript interfaces for all 7 stages
│   └── utils.ts                     # Styling, formatting, word counting, clipboard helpers
├── .env.example
├── next.config.mjs
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🔮 What We'd Add Next (Roadmap)

1. **AI Image Generation for Thumbnails**: Directly call Imagen 3 or Flux to generate the 3 thumbnail concepts in visual form.
2. **Audio Voiceover Synthesis**: Text-to-speech integration (ElevenLabs API) to hear the spoken script in the teleprompter.
3. **Automated B-Roll Scraper**: Real-time integration with Pexels/Unsplash or Storyblocks API to preview matching video stock clips directly in Stage 5.
4. **Cloud Database & Collaboration**: Supabase/PostgreSQL backend with team collaboration and shareable production links (`/p/:projectId`).
5. **Direct Publishing Webhooks**: Push directly to YouTube Studio, TikTok Creator API, or Buffer/Hootsuite with one click.

---

## 📄 License
MIT © 2026 AI Content Director Studio
