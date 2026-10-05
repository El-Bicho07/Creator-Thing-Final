# Security Audit Report — Creator SaaS Platform

*Completed during Phase 0 Audit. Audits secrets exposure, API key handling, multi-tenant isolation risks, and production security policies.*

---

## 1. Secrets & Credentials Inspection

### Automated Pattern Scan Results

```bash
git grep -nE 'AIza[0-9A-Za-z_-]{35}'
# Output: No real production Google API keys detected.

git grep -nE '(OPENAI_API_KEY|ANTHROPIC_API_KEY|GEMINI_API_KEY|GOOGLE_API_KEY|GROQ_API_KEY|SUPABASE_SERVICE_ROLE_KEY)'
# Output: No committed secrets found in source files. All references are environment variable names or .env.example templates.
```

### Mock / Test Key Findings
- **Module 17 (`Brand_Pitch_Builder`):** File `modules/17_Brand_Pitch_Builder/server/tests/proposalLogic.test.js` contains test strings:
  - `'PASTE_YOUR_KEY_HERE'`
  - `'AIzaSyTestValidKey123456'` (Dummy key format used exclusively for mock unit test execution).
- **Module 10 (`Comment_Analyzer`):** File `modules/10_Comment_Analyzer/test/nlpPipeline.test.js` contains test assignment `process.env.GEMINI_API_KEY = 'your_gemini_api_key_here'`.

> [!NOTE]
> No active production credentials or secret keys were exposed or committed in any module directory or git history.

---

## 2. Multi-Tenant Security & Data Isolation Audit

### Prototype Vulnerability Analysis
The donor modules in `modules/` were built as single-tenant prototypes. They exhibit the following multi-tenant risks:
1. **Unchecked Request Payloads:** Prototype endpoints frequently accepted `user_id` directly in HTTP request JSON bodies without verifying session authentication.
2. **Missing Row Level Security (RLS):** Prototype schemas created database tables without PostgreSQL RLS policies enabled.
3. **Cross-Tenant Vector Exposure:** Vector similarity searches in prototype Module 19 performed ANN (Approximate Nearest Neighbor) queries across all table rows without mandatory tenant ID filtering (`WHERE user_id = :authenticated_user_id`).

### Hardened SaaS Security Requirements (AS IMPLEMENTED IN PHASE 1)

> **Status: IMPLEMENTED AND VERIFIED** — See ADR-004 for the full rationale.

1. **JWT Session Derivation:** The FastAPI backend derives `user_id` exclusively from the validated Supabase Auth JWT (`get_current_user_id` verifies the RS256 signature via JWKS). Client-supplied `user_id` values in request bodies, query strings, or paths are **ignored** for authorization.
2. **PostgreSQL RLS Policies:** All 13 tables enable RLS. Policies use `current_user_id()`, which reads the verified JWT subject from the `request.jwt.claims` session variable set by the `get_db_with_user` dependency:
   ```sql
   ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

   CREATE POLICY user_isolation_policy ON table_name
     FOR ALL
     USING (current_user_id() = user_id)
     WITH CHECK (current_user_id() = user_id);
   ```
3. **Non-Superuser API Role:** The API connects as `api_user`, which is deliberately **not** a superuser. PostgreSQL bypasses RLS for superusers and `BYPASSRLS` roles, so this guarantees RLS cannot be circumvented by the application connection.
4. **Fail-Safe Identity Function:** If no JWT context is set, `current_user_id()` returns the zero UUID, which matches no row — returning empty results rather than all rows.
5. **Automated Tenant Isolation Tests:** Cross-tenant assertions in `apps/api/tests/security/` verify that User A cannot read, update, or delete User B's `creator_profiles`, `chunks` (embeddings), `jobs`, or `ai_calls`. **All pass.**

---

## 3. API Gateway & AI Provider Security

1. **Centralized Provider Isolation:** No client application (Next.js frontend) or feature module will directly invoke LLM APIs (`gemini.generateContent` or `anthropic.messages.create`).
2. **Key Encapsulation:** All API keys (`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, `OPENAI_API_KEY`) reside exclusively in server-side environment variables managed by `apps/api/app/llm/gateway.py`.
3. **Sanitized Error Messaging:** Raw provider stack traces and error responses containing internal API parameters or provider endpoints MUST BE caught and normalized into clean application error objects (`AI_PROVIDER_ERROR`, `AI_RATE_LIMIT`).

---

## 4. Security Action Plan & Remediation

| Risk Category | Mitigation Strategy | Target Component | Status |
|:---|:---|:---|:---|
| Secret Exposure | Environment variable encapsulation & `.gitignore` enforcement | `.env.example` / `apps/api/app/core/config.py` | Implemented in Phase 1 |
| Multi-tenant Leakage | Supabase JWT verification & PostgreSQL Row Level Security | `apps/api/app/core/auth.py` + DB Migrations | Implemented in Phase 1 |
| Direct DB Access | Service role key restricted strictly to migrations & admin tasks | `infra/db/migrations/` | Implemented in Phase 1 |
| Unsanitized AI Errors | Custom exception middleware transforming provider errors | `apps/api/app/core/errors.py` | Implemented in Phase 1 |
