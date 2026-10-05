# Migration Management Decision — Creator Platform SaaS

*Architecture Decision Record: ADR-005*

## Status

**ACCEPTED** — Versioned SQL migrations in `infra/db/migrations/`.

## Context

The Phase 1 implementation uses raw SQL migrations executed by PostgreSQL's `docker-entrypoint-initdb.d` mechanism. The audit questioned whether to continue with versioned SQL files or adopt Alembic (which donor modules 13 and 19 used).

## Options Considered

### Option A: Versioned SQL Files (CHOSEN)

**Structure:**
```
infra/db/migrations/
├── 000_create_api_user.sql
├── 001_enable_extensions.sql
├── 002_core_schema.sql
├── 003_add_feature_tables.sql
└── ...
```

**Execution:** Mounted to `/docker-entrypoint-initdb.d` in PostgreSQL container. Runs automatically on first container start (alphabetical order).

**Pros:**
- Simple, no additional tooling
- Human-readable SQL
- Works with any PostgreSQL deployment
- No Python dependencies for migrations
- Easy to review in PRs
- Compatible with Supabase, RDS, Cloud SQL, etc.

**Cons:**
- No automatic rollback (manual `DOWN` scripts needed)
- No migration state tracking in DB (relies on file order)
- No partial application detection
- Manual conflict resolution in team environments

### Option B: Alembic

**Structure:**
```
apps/api/app/alembic/
├── versions/
│   ├── 001_initial.py
│   └── 002_add_feature.py
├── env.py
└── script.py.mako
```

**Execution:** `alembic upgrade head` via CLI or application startup.

**Pros:**
- Automatic upgrade/downgrade
- Migration state tracked in `alembic_version` table
- Python-based migrations (can use SQLAlchemy models)
- Team-friendly: detects conflicts, supports branching
- Rich ecosystem (autogenerate from models)

**Cons:**
- Additional dependency and complexity
- Requires Python environment to run
- Autogenerate can miss schema-only changes (RLS, functions, indexes)
- More complex CI/CD integration
- Donor modules used different Alembic setups (inconsistent)

### Option C: Hybrid (SQL + Alembic)

Use Alembic for state tracking but write raw SQL in migration files.

**Pros:**
- Best of both worlds
- Alembic manages versioning
- Raw SQL for complex DDL (RLS, functions)

**Cons:**
- Still requires Alembic tooling
- More complex than pure SQL

## Decision

**Use Option A: Versioned SQL Files in `infra/db/migrations/`**

### Rationale

1. **Simplicity First**: Phase 1 is foundation; avoid premature tooling. SQL files are transparent and portable.

2. **Donor Module Divergence**: Module 13 and Module 19 had different Alembic configurations and migration histories. Consolidating would require rebasing or squashing — more effort than writing clean unified SQL.

3. **RLS & Functions**: Our migrations contain PostgreSQL-specific features (RLS policies, `current_user_id()` function, triggers) that Alembic autogenerate often misses or represents poorly.

3. **Deployment Flexibility**: SQL files work on Supabase, RDS, Cloud SQL, bare metal, Kubernetes — no Alembic runtime needed.

4. **Team Review**: SQL diffs are easier to review in PRs than Python migration scripts.

4. **Future Migration**: Can adopt Alembic later if team/workflow demands it. SQL files can be imported as initial Alembic state.

## Implementation

### Migration Naming Convention

```
{sequence}_{description}.sql
```

- Sequence: 3-digit zero-padded (000, 001, 002...)
- Description: lowercase, underscores, concise
- Examples: `000_create_api_user.sql`, `001_enable_extensions.sql`, `002_core_schema.sql`

### Migration Content Standards

Each migration MUST:
- Be idempotent where possible (use `IF NOT EXISTS`, `ON CONFLICT`)
- Include both `UP` (forward) logic — `DOWN` logic documented as comments
- Be transactional (single transaction per file via `docker-entrypoint-initdb.d`)
- Document any data migration steps

### Execution

**Local Development:**
```bash
docker-compose -f infra/docker-compose.yml up
# PostgreSQL container runs all *.sql in /docker-entrypoint-initdb.d on first init
```

**Re-running Migrations:**
```bash
docker-compose -f infra/docker-compose.yml down -v  # Drops volume, fresh start
docker-compose -f infra/docker-compose.yml up
```

**Production:**
- Mount `infra/db/migrations/` to init directory
- Or run via `psql -f` in deployment pipeline
- Track applied migrations via separate `schema_migrations` table (future)

### Future Migration: Adding `schema_migrations` Table

When team/process demands it, add:

```sql
-- 003_add_migration_tracking.sql
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    checksum VARCHAR(64) -- SHA256 of migration file
);
```

Then modify entrypoint to check this table before applying.

## Consequences

### Positive
- Zero additional dependencies
- Portable across all PostgreSQL environments
- Clear audit trail in git history
- Easy to review and reason about

### Negative
- No automatic rollback (manual intervention required)
- No built-in conflict detection for parallel development
- Must enforce naming convention manually

## Migration to Alembic (Future)

If/when adopting Alembic:
1. `alembic init` in `apps/api/app/alembic/`
2. Create baseline migration from current schema: `alembic revision --autogenerate -m "baseline"`
3. Mark existing SQL migrations as "applied" by inserting into `alembic_version`
4. Future migrations via Alembic

## Related Decisions

- ADR-004: RLS Implementation (migrations create RLS policies)
- ADR-006: Database Connection Pooling (affects migration execution)

## Conclusion

Versioned SQL files in `infra/db/migrations/` provide the right balance of simplicity, portability, and auditability for Phase 1. Alembic can be adopted later if team workflow demands it.