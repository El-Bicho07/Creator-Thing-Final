# Engineering Decision Log

| # | Topic | Decision | Reason |
|---|-------|----------|--------|
| 1 | **Hosting** | Vercel (standard Next.js App Router server deployment) | GitHub Pages cannot handle Next.js server routes or secure environment keys. |
| 2 | **AI Provider SDK** | Google Gemini via official `@google/genai` | `@google/generative-ai` is deprecated. Abstracted behind `lib/ai/provider.ts`. Default model set to stable Flash model `gemini-1.5-flash` or `gemini-2.0-flash`. |
| 3 | **Structured Output** | Provider JSON Schema + Zod validation | Gemini `responseMimeType: "application/json"` with Zod runtime validation & custom semantic validators. |
| 4 | **Database & Auth** | Supabase `@supabase/ssr` & `@supabase/supabase-js` | Provides Postgres, RLS, and Auth. `supabase.auth.getUser()` used exclusively on server. |
| 5 | **Script Data Structure** | Discriminated union (`kind: 'video' | 'text_post'`) | Video platforms get timestamped segment timelines; text platforms (LinkedIn/X) get sectioned post structures. |
| 6 | **Hooks Strategy** | 7 qualitative categories without numeric scores | Includes Curiosity, Contrarian, Question, Story, Bold statement, Problem, Transformation, plus top pick reason. |
| 7 | **Shot List Generation** | Deterministic derivation from video script segments | Converts voiceover/visual/camera/b-roll text into formatted shot list without extra LLM latency/cost. |
| 8 | **Rate Limiting** | DB-backed `usage_events` table | Works reliably in serverless stateless environments. |
| 9 | **Multi-Agent Engine** | LangGraph / LangChain StateGraph | Convert `.md` specifications into modular agent state graphs with tools, conditional routing, and Zod output schemas. |
