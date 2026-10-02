# Standing Rules & Operating Guidelines for Antigravity Agents

## 1. Operating Rules
- **Autonomous Execution:** Do not stop to ask questions or wait for user approval. Make reasonable engineering decisions and append them to `docs/DECISIONS.md`.
- **Milestone Quality Gates:** Never build on broken code. Run `typecheck`, `lint`, `test`, `build`, and verify app boot after every milestone before moving to the next.
- **Maintain `PROGRESS.md`:** Update milestone checkboxes, current status, next steps, and known issues continuously.
- **No Fake Product Data:** Never ship mocked AI responses, fake trends, or invented metrics in production code paths. Test doubles belong strictly in `tests/`.
- **Zero-Env Build & Runtime Guard:** The project MUST build and pass typecheck without any `.env` variables set. Validate env vars lazily at runtime and show a friendly "Setup Required" screen if keys are missing.
- **Honest Reporting:** Only report features as verified if actually executed and tested. List non-verified items separately.

## 2. Key Architecture & Resolved Decisions
- **Hosting:** Next.js App Router deployed on Vercel. Standard server-side routes (no static export `output: 'export'`).
- **AI Integration:** Google Gemini via `@google/genai` behind `AIProvider` interface (`lib/ai/provider.ts`). Always Zod-validate structured output.
- **Auth & Database:** Supabase (Postgres + Auth + RLS). Server uses `supabase.auth.getUser()`. All tables have strict RLS.
- **Content Pipeline:** Trend Analysis (cached 24h) → Creator Angle (Angle Equation card) → Hooks (7 categories) & Format (parallel) → Script (Video vs Text discriminated union) → Caption & CTA → Derived Shot List (deterministic).
- **Rate Limits & Streaming:** Database-driven rate limits via `usage_events`. NDJSON stage streaming on `/api/generate-content`.

## 3. Strict Prohibitions
- Do NOT expose `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or `CRON_SECRET` to client code (no `NEXT_PUBLIC_` prefix).
- Do NOT target GitHub Pages or export static HTML.
- Do NOT use Docker.
- Do NOT rewrite the full content package when regenerating a single section.
