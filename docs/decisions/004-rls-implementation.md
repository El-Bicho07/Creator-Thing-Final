# RLS Implementation Decision — Creator Platform SaaS

*Architecture Decision Record: ADR-004*

## Status

**ACCEPTED** — Implemented and verified in Phase 1.

## Context

The Phase 1 audit revealed a critical security gap: the PostgreSQL Row Level Security (RLS) policies were defined in migrations but **not functionally enforced** because:

1. The `current_user_id()` function read from `request.jwt.claims` session variable
2. No FastAPI middleware set this variable on database connections
3. The development database user (`creator`) was a **superuser**, and PostgreSQL **does not enforce RLS for superusers** by default

## Options Considered

### Option A: FastAPI Middleware Setting Session Variable

```python
# Middleware approach
@app.middleware("http")
async def set_rls_context(request: Request, call_next):
    user_id = await get_current_user_id(request)  # From JWT
    async with async_session_maker() as session:
        await session.execute(
            text("SET LOCAL request.jwt.claims = :claims"),
            {"claims": json.dumps({"sub": user_id})}
        )
    response = await call_next(request)
    return response
```

**Pros:**
- Transparent to feature code
- Centralized in one place
- Works with existing `current_user_id()` function

**Cons:**
- Middleware runs before route handlers; DB session not yet created
- Requires DB session in middleware (complexity)
- Hard to test

### Option B: Database Dependency with User Context (CHOSEN)

```python
# apps/api/app/core/auth.py
async def get_db_with_user(
    request: Request,
    user_id: str = Depends(get_current_user_id)
):
    async with async_session_maker() as session:
        try:
            jwt_claims = json.dumps(request.state.jwt_payload)
            await session.execute(
                text("SET LOCAL request.jwt.claims = :claims"),
                {"claims": jwt_claims}
            )
            yield session
        finally:
            await session.close()
```

**Pros:**
- Leverages existing FastAPI dependency injection
- User authentication happens first (`get_current_user_id`)
- DB session created with RLS context already set
- Explicit in route signatures: `db: AsyncSession = Depends(get_db_with_user)`
- Easy to test and mock
- Works with FastAPI's `Depends` ordering

**Cons:**
- Must remember to use `get_db_with_user` instead of `get_db` in protected routes
- Slightly more verbose route signatures

### Option C: Supabase `auth.uid()` with Supabase Project

Use Supabase's built-in `auth.users` table and `auth.uid()` function directly in RLS policies.

**Pros:**
- No custom `current_user_id()` function needed
- Supabase handles JWT validation and session management
- Battle-tested in production

**Cons:**
- Requires Supabase project (external dependency)
- Local development needs Supabase CLI or remote project
- Ties us to Supabase for auth (vendor lock-in)
- More complex local dev setup

### Option D: Non-Superuser API Role + `SET row_security = on`

Create a dedicated non-superuser database role (`api_user`) for the API connection. Force `SET row_security = on` for the session.

**Pros:**
- RLS enforced at database level regardless of application bugs
- Works with any PostgreSQL deployment
- Defense in depth

**Cons:**
- Requires managing separate database user
- `SET row_security = on` must be set per session
- Still needs user context (`current_user_id()`) for multi-tenancy

## Decision

**Primary: Option B (Database Dependency with User Context)**

**Defense in Depth: Option D (Non-Superuser API Role)**

### Implementation Details

#### 1. Database Role (`000_create_api_user.sql`)

```sql
-- Create non-superuser role for API
CREATE ROLE api_user WITH LOGIN PASSWORD 'api_password';
GRANT CONNECT ON DATABASE creator_platform TO api_user;
GRANT USAGE ON SCHEMA public TO api_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO api_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO api_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO api_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO api_user;
```

The API connects as `api_user` (non-superuser), ensuring RLS is enforced even if application code forgets to set context.

#### 2. User Context Function (`002_core_schema.sql`)

```sql
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        nullif(current_setting('request.jwt.claims', true), '')::json->>'sub',
        '00000000-0000-0000-0000-000000000000'
    )::UUID;
EXCEPTION WHEN OTHERS THEN
    RETURN '00000000-0000-0000-0000-000000000000'::UUID;
END;
$$ LANGUAGE plpgsql STABLE;
```

Reads `request.jwt.claims` session variable set by FastAPI. Returns zero UUID if not set (fail-safe: no data visible).

#### 3. RLS Policies (All 13 Tables)

```sql
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_creator_profiles_isolation ON creator_profiles
    FOR ALL USING (current_user_id() = user_id) WITH CHECK (current_user_id() = user_id);
```

All 13 tables have identical pattern: `USING (current_user_id() = user_id) WITH CHECK (current_user_id() = user_id)`.

#### 4. FastAPI Dependency (`apps/api/app/core/auth.py`)

```python
async def get_db_with_user(
    request: Request,
    user_id: str = Depends(get_current_user_id)
):
    async with async_session_maker() as session:
        try:
            jwt_claims = json.dumps(request.state.jwt_payload)
            await session.execute(
                text("SET LOCAL request.jwt.claims = :claims"),
                {"claims": jwt_claims}
            )
            yield session
        finally:
            await session.close()
```

Usage in routes:
```python
@router.get("/profile")
async def get_profile(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),  # RLS context set here
):
    ...
```

## Verification Results

### RLS Policy Coverage
| Table | RLS Enabled | Policy Exists | Uses `current_user_id()` |
|-------|-------------|---------------|-------------------------|
| users | ✅ | ✅ | ✅ (id) |
| creator_profiles | ✅ | ✅ | ✅ |
| voice_profiles | ✅ | ✅ | ✅ |
| content_assets | ✅ | ✅ | ✅ |
| chunks | ✅ | ✅ | ✅ |
| ideas | ✅ | ✅ | ✅ |
| plan_items | ✅ | ✅ | ✅ |
| performance_records | ✅ | ✅ | ✅ |
| comments | ✅ | ✅ | ✅ |
| comment_insights | ✅ | ✅ | ✅ |
| lessons | ✅ | ✅ | ✅ |
| jobs | ✅ | ✅ | ✅ |
| ai_calls | ✅ | ✅ | ✅ |

**All 13 tables: ✅ PASS**

### Functional Isolation Tests (via `api_user` role)

| Test | Result |
|------|--------|
| User A can read own creator_profile | ✅ PASS |
| User A cannot read User B's creator_profile | ✅ PASS (0 rows) |
| User A can insert own creator_profile | ✅ PASS |
| User A cannot insert for User B | ✅ PASS (FK violation) |
| User A cannot update User B's profile | ✅ PASS (0 rows affected) |
| User A cannot delete User B's profile | ✅ PASS (0 rows affected) |
| User A cannot read User B's chunks (embeddings) | ✅ PASS (0 rows) |
| User A cannot read User B's jobs | ✅ PASS (0 rows) |
| User A cannot read User B's ai_calls | ✅ PASS (0 rows) |
| User A cannot read User B's comments | ✅ PASS (0 rows) |

**All isolation tests: ✅ PASS**

## Security Implications

### Threat Model Addressed

| Threat | Mitigation |
|--------|------------|
| User A reads User B's data via API | RLS policy filters by `current_user_id()` |
| User A updates User B's data via API | RLS `WITH CHECK` blocks writes |
| User A deletes User B's data via API | RLS `WITH CHECK` blocks deletes |
| User A accesses User B's embeddings | RLS on `chunks` table |
| User A accesses User B's AI usage logs | RLS on `ai_calls` table |
| User A accesses User B's background jobs | RLS on `jobs` table |
| SQL injection bypasses RLS | Parameterized queries + RLS as second line |
| Superuser bypasses RLS | API connects as non-superuser `api_user` |
| Missing JWT context returns all data | `current_user_id()` returns zero UUID (no rows match) |

### Residual Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Developer uses `get_db` instead of `get_db_with_user` | Medium | High | Code review, linting rule, tests |
| `SET LOCAL` not executed due to error | Low | High | Exception handling in dependency |
| JWT validation bypassed | Low | Critical | Supabase JWT verification in `get_current_user_id` |
| `api_user` password compromised | Low | High | Rotate regularly, use secrets manager in prod |

## Testing Strategy

### Automated Tests
- `tests/security/test_rls_policies.py` — Schema-level policy verification
- `tests/security/test_rls_functional.py` — Functional isolation tests (require `api_user`)

### CI/CD Integration
- Run security tests on every PR
- Fail build if any isolation test fails

## Related Decisions

- ADR-003: LLM Gateway Contract (uses `user_id` for `ai_calls` logging)
- ADR-005: Supabase Auth Integration (JWT validation source)

## Future Considerations

1. **Supabase Migration**: When moving to Supabase-hosted PostgreSQL, replace `current_user_id()` with `auth.uid()` and use Supabase's `auth.users` table. Policies remain identical.

2. **Row-Level Encryption**: For highly sensitive data (e.g., AI call prompts), consider `pgcrypto` column encryption in addition to RLS.

3. **Audit Logging**: Add `pg_audit` or trigger-based audit logs for all DML on tenant tables.

## Conclusion

The RLS implementation uses a **defense-in-depth** approach:
1. **Application layer**: FastAPI dependency sets user context per request
2. **Database function**: `current_user_id()` reads context safely
3. **Database policies**: RLS on all 13 tables enforces isolation
4. **Connection role**: API uses non-superuser role where RLS is mandatory

This satisfies the Phase 1 requirement: **RLS FUNCTIONAL: YES** — verified by automated schema checks and manual functional tests against non-superuser role.