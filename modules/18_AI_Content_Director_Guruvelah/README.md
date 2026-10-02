# TREND-TO-CONTENT ENGINE 🚀

> **"Turn trends into content that actually fits YOU."**

A SaaS-style creator strategy web application built with Next.js App Router, Supabase, Tailwind CSS, and Google Gemini AI. The Trend-to-Content Engine transforms raw viral trends into personalized, high-converting content packages tailored specifically to a creator's niche, tone, audience pain points, target platform, and experience level.

---

## 🏗️ Architecture & Pipeline

```text
TREND + CREATOR IDENTITY + AUDIENCE PAIN POINT + PLATFORM + CONTENT GOAL + CREATOR HISTORY
                         ↓
              PERSONALIZED CONTENT STRATEGY
                         ↓
   Angle → Hooks (7 framework categories) → Format (parallel) → Script → Shot list → Caption → CTA → Hashtags
```

### The Angle Equation (Core Differentiator)
Unlike generic AI tools (`Trend → LLM → Generic Script`), the **Angle Engine** combines:
- **Trend Topic & Source Snippets**
- **Creator Niche & Sub-niche**
- **Target Audience Pain Point**
- **Target Platform Norms**
- **Content Goal Directives**

Output: A creator-positioned statement explaining **why this trend fits YOU**.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript (strict mode)
- **Styling & UI:** Tailwind CSS, Lucide Icons, shadcn/ui components, `next-themes` (Dark/Light)
- **Database & Auth:** Supabase (Postgres, Row Level Security, Auth with `@supabase/ssr`)
- **AI Integration:** Google Gemini via `@google/genai` SDK
- **Validation:** Zod schemas for all runtime inputs & structured JSON responses
- **Testing:** Vitest & React Testing Library (unit/integration), Playwright (e2e)

---

## 📂 Project Structure

```text
/app
  page.tsx                       # Marketing landing page
  (auth)/login signup forgot-password reset-password
  auth/callback/route.ts
  onboarding/page.tsx
  dashboard/
    layout.tsx                   # App shell
    page.tsx                     # Main dashboard & live trend cards
    new/page.tsx                 # 3-step Create Content stepper
    generation/[id]/page.tsx     # Result workspace & section editor
    history/page.tsx            # Content strategy history
    profile/page.tsx            # Creator profile editor
    settings/page.tsx           # Settings & Creator Content Memory
  api/
    analyze-trend generate-content generations feedback profile trends health
/components
  ui/                            # Reusable UI components (Button, Card, Stepper, etc.)
  dashboard/                     # App shell, Sidebar, MobileBottomNav, Header
/lib
  ai/                            # Provider interface, Gemini provider, modules, orchestrator
  domain/                        # Platform, goal, timing skeleton & shot-list logic
  db/                            # Supabase client, server, admin & repositories
  prompts/                       # Isolated AI prompts (Angle, Hooks, Script, Caption)
  validation/                    # Zod schemas
/supabase                        # Database SQL schema & migrations
/tests                           # Unit, integration & e2e tests
```

---

## ⚙️ Environment Variables

Create `.env.local` by copying `.env.example`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Configuration
GEMINI_API_KEY=your-gemini-api-key
AI_MODEL=gemini-1.5-flash        # Stable Flash-class model
AI_TIMEOUT_MS=45000

# Quota & Limits
DAILY_GENERATION_LIMIT=15
DAILY_REGEN_LIMIT=60

# Trends & Cron
TREND_REGION=IN
CRON_SECRET=your-cron-secret
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

*Note: The project builds cleanly with zero env vars set. Missing keys render a friendly `/components/ui/SetupRequired.tsx` screen at runtime.*

---

## 🚀 Local Setup & Development

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Setup Database:**
   Paste the contents of `supabase/schema.sql` into your Supabase project's SQL Editor and run it.

3. **Run Dev Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Run Quality Gates:**
   ```bash
   npm run typecheck
   npm run lint
   npm run test
   npm run build
   ```

---

## 🤖 AI Model Configuration & Upgrades

- **Default Model:** `gemini-1.5-flash` or `gemini-2.0-flash` (Stable Flash-class models recommended by Google AI Studio).
- **Upgrading:** You can upgrade to a stronger model (e.g. `gemini-1.5-pro`) by changing `AI_MODEL=gemini-1.5-pro` in `.env.local` without code changes.

---

## ⚠️ Known Limitations & Roadmap

- **Rate Limits:** Google Gemini free tier has strict per-minute quota limits.
- **Trend Discovery:** Ingests live RSS feeds (Google Trends RSS) and public APIs (Hacker News Algolia). If feeds are unreachable, manual input is supported.
- **Future Roadmap:** Social media posting integration, competitor channel tracking, and multi-user agency workspaces.
=======
# 🚀 Protosem — AI Product Development Sprint

Welcome to the **Protosem AI Product Development Repository**! 

This repository serves as the central hub for the cohort's AI application development sprint. Each student has been allocated a unique real-world creator-economy problem statement. Students are required to develop a working prototype, test it, and submit their project via a **Pull Request (PR)** following the branch naming convention and workflow outlined below.

---

## 📌 Submission Guidelines & Workflow

Students must submit their work by **forking this repository** and opening a **Pull Request (PR)**. Once reviewed and approved by the mentor/admin, your branch will be merged into this repository.

### ⚠️ Strict Branch Naming Convention

Your branch name **MUST** strictly follow this pattern:

```text
<No>_<Product_Name>
```

> **Examples:**
> - `01_Content_Idea_Generator`
> - `05_Reel_Script_Builder`
> - `18_AI_Content_Director`
>
> *(Use double digits for numbers 01 to 09, followed by an underscore, and your assigned product name in Title_Snake_Case or snake_case without spaces or special characters).*

---

## 🛠️ Step-by-Step Git Submission Guide

### Step 1: Fork the Repository
1. Navigate to the main repository page on GitHub.
2. Click the **Fork** button (top right corner) to create a copy under your personal GitHub account.

### Step 2: Clone Your Forked Repository
Open your terminal / command prompt and run:
```bash
git clone https://github.com/<YOUR_GITHUB_USERNAME>/ASADI_Protosem01.git
cd ASADI_Protosem01
```

### Step 3: Link to Upstream (Original) Repo
Keep your fork in sync with upstream changes:
```bash
git remote add upstream https://github.com/Rishi-ZAiFi/ASADI_Protosem01.git
git fetch upstream
```

### Step 4: Create and Checkout Your Assigned Branch
Create a new branch with your exact assigned branch name:
```bash
# Example for Problem 01:
git checkout -b 01_Content_Idea_Generator

# Example for Problem 14:
git checkout -b 14_Podcast_Assistant
```

### Step 5: Build Your Application
Develop your application inside your branch. Ensure your project is organized cleanly:

```text
├── README.md               <-- Detailed instructions on how to run your app
├── requirements.txt        <-- Python dependencies (or package.json for JS/TS)
├── .env.example            <-- Sample environment variables (NO REAL API KEYS!)
├── app.py / main.py        <-- Main application entry point
├── src/                    <-- Source code and modules
└── assets/                 <-- Screenshots / demo recordings / diagrams
```

> 🔒 **Security Notice:** **NEVER commit API keys or secrets!** Add `.env` to `.gitignore` and only commit a `.env.example` file showing placeholder keys (e.g., `GEMINI_API_KEY=your_key_here`).

### Step 6: Commit and Push to Your Fork
```bash
# Check modified files
git status

# Stage your files
git add .

# Commit with a clear message
git commit -m "feat(01_Content_Idea_Generator): initial implementation by Kavi Priya CA"

# Push the branch to your GitHub fork
git push -u origin <YOUR_BRANCH_NAME>
```

### Step 7: Create a Pull Request (PR)
1. Go to your forked repository on GitHub.
2. You will see a banner saying **"Compare & pull request"**. Click it.
3. Configure the PR:
   - **Base repository:** The main/original repository.
   - **Head repository:** Your fork.
   - **Compare branch:** Your assigned branch (`XX_<Product_Name>`).
4. Set the **PR Title**:
   ```text
   [Submission] <No>_<Product_Name> - <Your Full Name>
   ```
   *Example:* `[Submission] 01_Content_Idea_Generator - Kavi Priya CA`
5. Fill out the PR template completely:
   - Overview of the feature
   - Tech stack used
   - Screenshots / GIF / Loom video demonstrating the working app
   - Instructions to test locally

### Step 8: Mentor Review & Approval
- The mentor/admin will review your code and application logic.
- If changes or improvements are requested, make commits locally and push them to the same branch — your PR will update automatically.
- Upon final approval, your branch will be merged into the repository!

---

## 📋 Student Problem Allocations

| No. | Assigned Student | Application Name | Assigned Branch Name | Difficulty | Problem Statement | Build Challenge |
|:---:|:---|:---|:---|:---:|:---|:---|
| **01** | **Kavi Priya CA** | Content Idea Generator | `01_Content_Idea_Generator` | Standard | Creators struggle to consistently find content ideas. | Build an app where topic + audience generates 10 relevant content ideas. |
| **02** | **Jaishanth L** | Content Repurposer | `02_Content_Repurposer` | Standard | One idea needs different treatment on every platform. | Convert one content input into LinkedIn, Instagram, X and YouTube versions. |
| **03** | **Mithra Ravi** | Hook Generator | `03_Hook_Generator` | Standard | Writing strong hooks takes too much time. | Generate 10 hooks for a topic using different styles. |
| **04** | **Theeran P** | Daily Content Planner | `04_Daily_Content_Planner` | Standard | Creators don't know what to post today. | Use niche + goal to generate today's content plan. |
| **05** | **PRAVEEN.A** | Reel Script Builder | `05_Reel_Script_Builder` | Standard | Short-form creators struggle to structure 30–60 second videos. | Turn an idea into a hook, body and CTA. |
| **06** | **Manoj M** | Clip Finder | `06_Clip_Finder` | Standard | Long videos contain many reusable short clips. | Analyze a transcript and identify the best short-form moments with timestamps. |
| **07** | **Sanadhani** | Thumbnail Ideator | `07_Thumbnail_Ideator` | Standard | Creators need better thumbnail concepts. | Turn a video title into visual concepts and thumbnail text. |
| **08** | **Tejaswi K** | Caption Assistant | `08_Caption_Assistant` | Standard | Creators waste time writing captions. | Turn content or an image description into a platform-ready caption. |
| **09** | **Malligaarjunan AVK** | CTA Generator | `09_CTA_Generator` | Standard | Creators struggle with calls-to-action that don't sound repetitive. | Generate contextual CTAs based on the creator's goal. |
| **10** | **Poornaa Shree Praveenraj** | Comment Analyzer | `10_Comment_Analyzer` | Standard | Creators receive hundreds of comments but can't easily understand audience sentiment. | Analyze comments into themes, questions, complaints and opportunities. |
| **11** | **Satheesh** | Comment-to-Content | `11_Comment_to_Content` | Standard | Creators miss good ideas hidden inside audience comments. | Convert audience comments into future post and video ideas. |
| **12** | **Sudhiksha** | Creator Research Assistant | `12_Creator_Research_Assistant` | Standard | Research before creating educational content takes too long. | Turn a topic into key facts, angles and useful sources. |
| **13** | **Suryakumar J S** | Voice Replicator | `13_Voice_Replicator` | Standard | Creators don't maintain a consistent writing style. | Learn from previous posts and create a new draft following the creator's style. |
| **14** | **Priyadharshini B** | Podcast Assistant | `14_Podcast_Assistant` | Standard | Podcast creators spend too much time creating supporting content. | Turn a transcript into a title, description, chapters and highlights. |
| **15** | **Aatif F** | Creator Workspace | `15_Creator_Workspace` | Standard | Creators struggle to organize scripts, drafts and published content. | Build an Idea → Research → Script → Published workflow. |
| **16** | **Archana C** | Content Recycler | `16_Content_Recycler` | Standard | Creators don't know which old content deserves to be reused. | Analyze content history and recommend what to repost or rework. |
| **17** | **Prinetha kannan** | Brand Pitch Builder | `17_Brand_Pitch_Builder` | Standard | Brand collaborations require repetitive proposals and pitches. | Use creator profile + brand information to generate a personalized collaboration proposal. |
| **18** | **Sri Jananii S** | AI Content Director | `18_AI_Content_Director` | Extra High | Turning an idea into a complete production plan requires several disconnected steps. | Research a topic, identify angles, recommend a narrative, generate a script, suggest visuals/B-roll, create a shot list and publishing copy. |
| **19** | **Karthik Aravind M** | Creator Second Brain | `19_Creator_Second_Brain` | Extra High | Creators can't easily search, reuse or connect everything they have produced. | Store creator knowledge and enable semantic questions such as 'Have I talked about this before?' and 'What can become a reel?'. |
| **20** | **SaiSanjay R** | AI Screenplay Workspace | `20_AI_Screenplay_Workspace` | Extra High | Writers need AI assistance without losing character and story continuity. | Build a workspace that understands characters, locations, scenes and previous context while assisting with dialogue, action and scene progression. |
| **21** | **Sudharshan R** | Autonomous Content Pipeline | `21_Autonomous_Content_Pipeline` | Extra High | Creators repeatedly transform one idea into many different content formats. | Turn one idea through Research → YouTube Script → 3 Reels → LinkedIn Post → X Thread → Captions → Publishing Calendar. |
| **22** | **Udhayan K** | AI Creative Producer | `22_AI_Creative_Producer` | Extra High | Creators need ongoing strategic decisions, not just individual generated posts. | Given a creator goal, define audience, content pillars and a 30-day strategy, generate today's content, retain history and adapt recommendations using performance data. |

---

## ✅ Evaluation & Review Checklist

When evaluating your pull request, the mentor will review:

1. **Problem Solving & Core Logic:** Does the application address the specific challenge requirements?
2. **UI & Usability:** Is the interface intuitive and user-friendly (Streamlit, Gradio, React, Next.js, etc.)?
3. **Prompt Engineering & AI Integration:** Are prompt templates robust, structured, and handling edge cases effectively?
4. **Code Quality:** Is code cleanly structured, modular, and well-commented?
5. **Documentation:** Does your branch contain a clear `README.md` explaining how to set up, configure environment variables, and run the project?
6. **Zero Leaked Secrets:** Ensure `.env` is omitted and `.env.example` is supplied.

---

## ❓ Frequently Asked Questions (FAQ)

<details>
<summary><b>1. What if I accidentally made a typo in my branch name?</b></summary>

You can rename your local branch and force push the update:
```bash
# Rename the local branch
git branch -m wrong_branch_name 01_Content_Idea_Generator

# Push the new branch and delete the old remote branch
git push origin -u 01_Content_Idea_Generator
git push origin --delete wrong_branch_name
```
</details>

<details>
<summary><b>2. Which tech stack can I use?</b></summary>

You are free to choose the stack that best fits your project. Common choices include:
- **Python:** Streamlit, Gradio, FastAPI, Chainlit, Flask
- **JavaScript / TypeScript:** Next.js, React, Node.js, Express
- **AI Models & Frameworks:** Google Gemini API, OpenAI API, LangChain, LlamaIndex, LiteLLM
</details>

<details>
<summary><b>3. How do I provide API keys for the reviewer to test?</b></summary>

Do **NOT** put your API keys in the code or PR description. In your app's UI, provide an input field (such as `st.sidebar.text_input("Enter API Key", type="password")`) so the reviewer can enter their own API key, or instruct them in your branch `README.md` on how to set it in their local `.env`.
</details>

---

💡 *Happy building! If you have any questions or blockers, reach out to the mentor or open an issue.*
