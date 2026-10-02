# Hook Generator ⚡

> **Turn Any Topic Into a Scroll-Stopping Hook**  
> *Generate 10 hooks in different styles in seconds.*

Hook Generator is a fullstack web application designed for content creators, marketers, and founders. It solves the critical bottleneck in content creation: crafting high-converting, scroll-stopping hooks tailored to specific platforms and psychological frameworks using **Google Gemini**.

---

## 💡 Problem Statement

Writing strong hooks takes too much time. Most creators either stare at a blank screen or rely on generic, repetitive templates. Furthermore, AI tools frequently hallucinate fake statistics and percentages that undermine credibility.

**Hook Generator solves this by:**
1. Generating **exactly 10 distinct hooks** covering 10 psychological angles simultaneously.
2. Tailoring phrasing, structure, and pacing to the platform (LinkedIn, X/Twitter, Instagram, TikTok, YouTube).
3. Enforcing **Strict Statistical Safety**: Never fabricating fake study figures, sample sizes, or percentages.

---

## 🚀 Features

- **10 Core Psychological Frameworks**:
  1. *Curiosity* — Stirs deep intrigue & creates an irresistible knowledge gap.
  2. *Question* — Provocative, engagement-driving questions.
  3. *Contrarian* — Flips common industry wisdom upside down.
  4. *Bold Claim* — High-conviction statement that commands attention.
  5. *Statistic/Data* — Data-driven trend angles **without** hallucinated numbers.
  6. *Story* — Irresistible opening narrative beat.
  7. *Problem/Pain Point* — Striking an acute frustration or bottleneck.
  8. *Fear/Urgency* — FOMO, costly misconceptions, or timely warnings.
  9. *Future/Possibility* — Inspiring vision of what could be.
  10. *Surprise/Twist* — Subverting standard expectations.
- **Platform Customization**: Optimized for LinkedIn, X / Twitter, Instagram, TikTok, and YouTube.
- **Tone Control**: Choose between *Bold*, *Professional*, *Funny*, *Educational*, and *Emotional*.
- **Instant Clipboard Actions**: One-click individual hook copying with visual feedback ("Copied!"), plus a global "Copy All" action.
- **One-Click Regeneration**: Quickly re-roll hooks while preserving input state.
- **Audience Context**: Fine-tune output for specific niches (e.g., B2B founders, junior developers, solo creators).
- **Strict Security**: API keys are isolated on the server side and never leak to the client or browser bundles.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Vanilla CSS Design System with custom tokens, glassmorphism, micro-animations, and responsive layout
- **Backend / API**: Next.js Server Route Handlers (`/api/generate-hooks`)
- **AI Integration**: LangChain (`@langchain/google-genai` & `@langchain/core`)
- **LLM**: Google Gemini (`gemini-2.5-pro` with resilient fallback support)
- **Icons**: Lucide React

---

## 🏗️ Architecture

```
[ Browser / Client ]
        │
        ▼ (POST /api/generate-hooks)
[ Next.js Server Route ] ── reads ──> [ process.env.GEMINI_API_KEY ]
        │
        ▼ (LangChain Structured Output + Statistical Guardrails)
[ LangChain ChatGoogleGenerativeAI ] ── HTTPS ──> [ Google Gemini API ]
        │
        ▼ (Validates Exactly 10 Structured Hooks)
[ Clean JSON Response ]
        │
        ▼ (Renders 10 Styled Result Cards)
[ User Interface ]
```

### Server-Side Security Isolation
The browser communicates **only** with the internal Next.js backend endpoint (`/api/generate-hooks`). The Google Gemini API key resides solely in server-side memory via environment variables and is never exposed in client bundles, HTML, or logs.

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory. You can copy the provided `.env.example`:

### Windows (PowerShell):
```powershell
Copy-Item .env.example .env
```

### macOS / Linux:
```bash
cp .env.example .env
```

### Required Configuration:
```env
# Google Gemini API Key from Google AI Studio: https://aistudio.google.com/
GEMINI_API_KEY=your_gemini_api_key_here
```

> **Security Note:** The `.env` file is gitignored. Never commit your API key to version control.

---

## 💻 Local Setup & Development

### 1. Clone the repository
```bash
git clone https://github.com/mithra4325/hook-generator.git
cd hook-generator
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure your API key
Edit `.env` and paste your Gemini API key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to start generating hooks!

---

## 🧪 Testing the Application

1. **Input Validation**: Leave the topic empty and click "Generate 10 Hooks". The app will prompt for a topic without making an API call.
2. **Missing Key Handling**: If `GEMINI_API_KEY` is omitted, the backend returns a clean, user-friendly 500 error explaining how to set the key, without revealing stack traces.
3. **Hook Generation**: Enter a topic (e.g. *"Why 90% of SaaS founders fail at customer retention"*), select **LinkedIn** and **Bold**, then click **Generate 10 Hooks**.
4. **Style Verification**: Verify that exactly 10 cards appear, corresponding to all 10 styles in order.
5. **Statistical Safety**: Examine card 05 (*Statistic/Data*); note that it frames trends realistically without fabricating fake numbers.
6. **Clipboard Actions**: Test the **Copy** button on individual cards (transitions to "Copied!" for 2 seconds) and the **Copy All** button.
7. **Regenerate**: Click **Regenerate** to produce 10 new variations with the same settings.
8. **Responsive Layout**: Test on mobile viewports to ensure seamless stacking and typography scaling.

---

## 🛡️ Statistical Safety Rule

For the *Statistic/Data* hook:
- **Rule**: NEVER invent statistics, survey results, percentages, or fake citations.
- **Bad Example**: *"87% of creators fail within 30 days."*
- **Good Example**: *"The data behind why creators hit a plateau points directly to retention, not reach."*

Hook Generator enforces this prompt rule via system-level instructions and schema validation.

---

## 📦 GitHub Repository

- **Repository**: [https://github.com/mithra4325/hook-generator](https://github.com/mithra4325/hook-generator)
- **License**: MIT
