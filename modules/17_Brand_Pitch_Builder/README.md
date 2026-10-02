# Brand Pitch Builder 🚀

> **AI-Powered Collaboration Proposals & Pitch Builder for Modern Creators**

[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-purple.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.x-38B2AC.svg)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-Built--in_Node_22-003B57.svg)](https://nodejs.org/api/sqlite.html)

---

## 💡 The Problem
Content creators spend hours manually drafting near-identical brand pitches and sponsorship proposals. Each brand requires deep personalization, realistic content concepts, and clear audience alignment. However, manual pitch writing is slow, tedious, and often leads to generic filler or fabricated metrics that damage creator credibility.

## 🎯 The Solution
**Brand Pitch Builder** takes verified creator credentials (social reach, engagement rates, demographics, rate card, past brand wins) and target brand intelligence (product, goals, tone), and generates high-converting, personalized collaboration proposals in seconds.

Creators can interactively edit, refine specific sections with AI, track proposal pipeline status (Draft $\rightarrow$ Sent $\rightarrow$ Replied $\rightarrow$ Won $\rightarrow$ Lost), and export as **Branded PDF decks** or **email-ready plain text**.

---

## ✨ Core Features

### 1. Reusable Creator Profiles & Rate Cards
- Store your channel name, niche, bio, and platforms (YouTube, Instagram, TikTok, Newsletter, LinkedIn, Podcast).
- **Verified Metrics**: Total reach, average engagement rate, video views, newsletter open rate.
- **Audience Demographics**: Age distribution, gender split, top geographic locations, and buyer personas.
- **Content Style & Social Proof**: Notable campaign wins, case studies, past sponsor roster.
- **Dynamic Rate Card**: Base rates for dedicated videos, reels/TikToks, story sets, newsletters, and 30-day paid usage rights.
- **Data Integrity Rule**: Missing metrics are flagged with warning badges in the UI and never hallucinated by the AI.

### 2. Brand Intelligence Input & AI Extractor
- Target brand name, website URL, industry, product/campaign being promoted, and campaign goals (Sales, Awareness, UGC, Launches).
- **AI Brand Intelligence Extractor**: Paste any brand's website URL or "About Us" copy, and the AI automatically extracts the company's core offering, tone, and customer persona.
- Pre-packaged presets for **Notion**, **Athletic Greens (AG1)**, and **NordVPN** for instant testing.

### 3. Structured 8-Section Proposal Generator
Every proposal is generated with strict JSON structure:
1. **Email Subject Lines**: 3 high-converting hooks (Curiosity/Hook, Value-First, Direct Collaboration).
2. **Audience & Brand Alignment Index**: Visual synergy match score (e.g. 94%) and demographic overlap catalysts.
3. **Executive Summary & Introduction**: Authentic creator context establishing natural brand fit.
4. **Tailored Creative Concepts**: 3 concrete content concepts with opening hooks, narrative arcs, and calls to action.
5. **Production Timeline**: Phase-by-phase execution roadmap from brief to analytics reporting.
6. **Investment Packages**: 3 tiered pricing packages (Essential/Starter, Signature/Growth, 360° Omnichannel) dynamically calculated from the creator's rate card.
7. **KPIs & Expected Results**: Deliverable guarantees and benchmarked engagement expectations.
8. **Proven Track Record & Social Proof**: Case studies and verified campaign outcomes.
9. **Next Steps & Call to Action**: Low-friction closing with calendar slot recommendations.

### 4. Interactive Section-by-Section Editor & Refinement
- Inline editing for every paragraph and pricing package.
- **Per-Section AI Refinement**: Quick-action buttons to make any section:
  - *Shorter & Punchier*
  - *More Persuasive & ROI-focused*
  - *More Casual & Conversational*
  - *Custom Refine Directive*
- **Version History**: Review chronological snapshots with timestamps and restore any previous revision with 1 click.

### 5. Branded PDF & Plain-Text Email Export
- **Download Branded PDF**: Executive presentation layout ready for brand marketing directors.
- **Copy Email Pitch**: Clean, plain-text email with greeting, bullet points, rate packages, and signature for Gmail/Outlook.
- **Direct Mail Launcher**: Launches your desktop mail client with subject and body pre-filled via `mailto:`.

### 6. Proposal Library & Deal CRM
- Pipeline status tracking: **Draft**, **Sent**, **Replied**, **Won**, **Lost**.
- Search proposals by brand name or title, and filter by deal stage.
- 1-Click duplicate proposal to pitch similar brands in the same category.
- **Pipeline Analytics**: Track total active proposals, pipeline value ($), closed won revenue ($), and win rate (%).

### 7. Instant Demo Mode
- Click **"Try Demo Data"** in the top navigation to immediately populate the full workflow with realistic creator data (Alex Rivera) and brand data (Notion) and preview generated proposals without typing a single word or entering an API key.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, html2pdf.js, canvas-confetti
- **Backend**: Node.js 22, Express, Node 22 Built-in SQLite (`node:sqlite`)
- **AI Engine**: Configurable LLM API (Google Gemini, OpenAI) + Built-in Smart Deterministic Demo Engine
- **Storage**: SQLite database (`server/data/brand_pitch.db`) with zero external DB dependencies

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v22+ recommended for built-in SQLite)
- **npm**: v9+

### 2. Installation
Clone the repository and install all dependencies:

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

Or from the root directory:
```bash
npm run install:all
```

### 3. Environment Configuration
Create a `.env` file in the root or `server/` directory:

```env
PORT=5000
NODE_ENV=development

# Option 1: Google Gemini (Recommended)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-flash-lite-latest

# Option 2: OpenAI
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# LLM Provider: 'gemini', 'openai', or 'mock' (Demo mode)
LLM_PROVIDER=gemini
```

> **Note**: Even if no API key is provided, the application runs seamlessly out of the box using the **Built-in Smart Demo Engine**!

### 4. Running the Application

In terminal 1 (start backend API on port 5000):
```bash
cd server
npm start
```

In terminal 2 (start Vite frontend on port 5173):
```bash
cd client
npm run dev
```

Open your browser and navigate to:
```
http://localhost:5173
```

---

## 🧪 Running Automated Tests

Run backend unit tests for prompt building, anti-hallucination metric validation, and proposal generation:

```bash
cd server
npm test
```

---

## 📁 Project Structure

```
brand-pitch-builder/
├── package.json               # Root scripts
├── .env.example               # Environment template
├── README.md                  # Project documentation
├── server/
│   ├── package.json           # Express server packages
│   ├── src/
│   │   ├── index.js           # Server bootstrap & routes
│   │   ├── config.js          # Config and env loader
│   │   ├── db/
│   │   │   └── index.js       # SQLite persistence (node:sqlite)
│   │   ├── data/
│   │   │   └── sampleData.js  # Sample creators & brands
│   │   ├── services/
│   │   │   ├── llmService.js     # Gemini / OpenAI / Smart Demo Engine
│   │   │   └── promptBuilder.js  # Anti-hallucination JSON prompts
│   │   └── routes/
│   │       ├── aiRoutes.js       # Proposal generation & brand extractor
│   │       ├── profileRoutes.js  # Creator profile CRUD
│   │       └── proposalRoutes.js # Proposals CRM, version history, stats
│   └── tests/
│       └── proposalLogic.test.js # Automated unit tests
└── client/
    ├── package.json           # React frontend packages
    ├── vite.config.js         # Vite configuration & /api proxy
    ├── tailwind.config.js     # Tailwind styling & dark mode
    ├── index.html             # HTML entry point
    └── src/
        ├── main.jsx           # React DOM mount
        ├── App.jsx            # Main app shell & wizard router
        ├── index.css          # Styling & PDF print stylesheet
        ├── context/
        │   └── ThemeContext.jsx # Dark/Light mode toggle
        ├── services/
        │   └── api.js           # Backend API connector
        ├── mock/
        │   └── demoPresets.js   # Instant 1-click test datasets
        └── components/
            ├── Navbar.jsx       # Header, demo loader, theme toggle
            ├── ProfileStep.jsx  # Creator profile & rate card builder
            ├── BrandStep.jsx    # Brand info & AI extractor
            ├── GenerateStep.jsx # Strategy, tone, progress animation
            ├── ProposalPreview.jsx # Executive PDF presentation layout
            ├── ExportModal.jsx  # PDF download & email text copy
            ├── ProposalLibrary.jsx # Proposal CRM & pipeline stats
            ├── ProfileManager.jsx  # Profiles list manager
            ├── SettingsModal.jsx   # AI API key configurator
            └── ProposalEditor/
                ├── ProposalEditor.jsx       # Master section editor
                ├── SectionCard.jsx          # Section inline editor & AI refine
                ├── SubjectLinePicker.jsx    # 3 subject line hooks
                ├── AlignmentScoreCard.jsx   # Synergy percentage meter
                ├── PricingPackagesEditor.jsx # Tier 1/2/3 pricing cards
                └── VersionHistoryModal.jsx  # Revisions snapshot drawer
```

---

## 🔒 Security & Data Integrity

1. **Zero Fake Metrics**: The AI is strictly instructed with guardrails to never fabricate engagement rates, follower counts, or historical revenue. If data is absent, the UI explicitly flags the field.
2. **Local Storage & Privacy**: Profiles and proposals are stored locally in your SQLite database (`server/data/brand_pitch.db`).
3. **No External Lock-In**: Works completely offline using the Smart Demo Engine or connects to your preferred LLM provider.

---

## 📄 License
MIT License. Built with ❤️ for content creators and partnership managers.
