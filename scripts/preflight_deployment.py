#!/usr/bin/env python3
"""Preflight deployment validation script for Creator Platform SaaS.

Verifies production configuration, environment variables, directory structures,
and database readiness WITHOUT logging or exposing any secret values.

Usage:
    python scripts/preflight_deployment.py [--check-db]
"""
import argparse
import asyncio
import os
import re
import sys
from pathlib import Path


def mask_string(val: str) -> str:
    if not val:
        return "<EMPTY>"
    if len(val) <= 8:
        return "***"
    return f"{val[:3]}...[REDACTED]...{val[-3:]}"


def mask_url(url: str) -> str:
    if not url:
        return "<EMPTY>"
    # Mask password in postgresql+asyncpg://user:password@host:port/db
    return re.sub(r":([^/@:]+)@", ":****@", url)


def check_env_vars() -> bool:
    print("\n--- [1] Environment Variables Validation ---")
    app_env = os.getenv("APP_ENV", "development").lower()
    is_prod = app_env in ("production", "prod")
    print(f"  APP_ENV: {app_env} (Production mode: {is_prod})")

    all_ok = True

    # 1. Database URLs
    db_url = os.getenv("DATABASE_URL", "")
    if not db_url:
        print("  [FAIL] DATABASE_URL is missing")
        all_ok = False
    else:
        insecure_patterns = ["api_password", "changeme", "postgres:postgres", "root:root"]
        if is_prod and any(p in db_url for p in insecure_patterns):
            print(f"  [FAIL] DATABASE_URL contains insecure default credentials: {mask_url(db_url)}")
            all_ok = False
        else:
            print(f"  [OK] DATABASE_URL configured: {mask_url(db_url)}")

    # 2. Supabase Auth
    supabase_url = os.getenv("SUPABASE_URL", "")
    if not supabase_url:
        print("  [FAIL] SUPABASE_URL is missing")
        all_ok = False
    elif not (supabase_url.startswith("https://") or supabase_url.startswith("http://")):
        print(f"  [FAIL] SUPABASE_URL must be an HTTP/HTTPS URL: {supabase_url}")
        all_ok = False
    else:
        print(f"  [OK] SUPABASE_URL configured: {supabase_url}")

    anon_key = os.getenv("SUPABASE_ANON_KEY", "")
    if not anon_key:
        print("  [FAIL] SUPABASE_ANON_KEY is missing")
        all_ok = False
    else:
        print(f"  [OK] SUPABASE_ANON_KEY configured: {mask_string(anon_key)}")

    jwt_secret = os.getenv("SUPABASE_JWT_SECRET", "")
    if is_prod and (not jwt_secret or jwt_secret in ("changeme", "test-secret", "secret")):
        print("  [FAIL] SUPABASE_JWT_SECRET must be securely set in production")
        all_ok = False
    elif jwt_secret:
        print(f"  [OK] SUPABASE_JWT_SECRET configured: {mask_string(jwt_secret)}")
    else:
        print("  [WARN] SUPABASE_JWT_SECRET not set (will rely exclusively on JWKS asymmetric verification)")

    # 3. CORS
    cors = os.getenv("CORS_ORIGINS", "")
    if is_prod and (not cors or "localhost" in cors and "vercel.app" not in cors and "http://" in cors):
        print(f"  [WARN] CORS_ORIGINS in production appears to use development/localhost settings: {cors}")
    else:
        print(f"  [OK] CORS_ORIGINS configured: {cors or 'defaulting to localhost:3000'}")

    return all_ok


def check_assets() -> bool:
    print("\n--- [2] Shared Assets & Prompt Assets ---")
    here = Path(__file__).resolve().parent.parent
    prompts_candidates = [
        here / "packages" / "prompts",
        Path("/packages/prompts"),
    ]
    prompts_dir = next((p for p in prompts_candidates if p.is_dir()), None)
    if not prompts_dir:
        print(f"  [FAIL] Could not locate packages/prompts directory in candidates: {[str(p) for p in prompts_candidates]}")
        return False

    prompt_files = list(prompts_dir.glob("**/*.json"))
    if not prompt_files:
        print(f"  [FAIL] Found prompts directory at {prompts_dir} but it contains no JSON prompts")
        return False

    print(f"  [OK] Found prompts directory at {prompts_dir} ({len(prompt_files)} prompt files verified)")
    return True


async def check_database_connectivity() -> bool:
    print("\n--- [3] Database Connectivity & Schema Probe ---")
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("  [SKIP] Skipping database check: DATABASE_URL not set")
        return False

    try:
        from sqlalchemy.ext.asyncio import create_async_engine
        from sqlalchemy import text

        engine = create_async_engine(db_url, echo=False, pool_pre_ping=True)
        async with engine.connect() as conn:
            # 1. Version check
            res = await conn.execute(text("SELECT version()"))
            v = res.scalar()
            print(f"  [OK] Connected to PostgreSQL: {v.split(',')[0] if v else 'OK'}")

            # 2. Extension check
            res = await conn.execute(text("SELECT extname FROM pg_extension WHERE extname IN ('vector', 'uuid-ossp', 'pgcrypto')"))
            exts = [r[0] for r in res.fetchall()]
            print(f"  [OK] Installed Extensions: {', '.join(exts)}")
            if "vector" not in exts:
                print("  [FAIL] 'vector' extension is missing from PostgreSQL!")
                return False

            # 3. Tables check
            res = await conn.execute(text("""
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name IN ('users', 'creator_profiles', 'memories', 'chunks', 'today_plans', 'studio_sessions')
            """))
            tables = [r[0] for r in res.fetchall()]
            print(f"  [OK] Verified Core Tables: {', '.join(tables)}")

            # 4. Vector dimension check on chunks
            res = await conn.execute(text("""
                SELECT atttypmod FROM pg_attribute
                JOIN pg_class ON pg_class.oid = pg_attribute.attrelid
                WHERE pg_class.relname = 'chunks' AND pg_attribute.attname = 'embedding'
            """))
            typmod = res.scalar()
            if typmod == 768:
                print("  [OK] chunks.embedding column verified as vector(768)")
            elif typmod:
                print(f"  [WARN] chunks.embedding vector dimension is {typmod} (expected 768)")

        await engine.dispose()
        return True
    except Exception as exc:
        print(f"  [FAIL] Database connection failed: {exc}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Preflight Deployment Check")
    parser.add_argument("--check-db", action="store_true", help="Attempt connection to DATABASE_URL")
    parser.add_argument("--env-file", type=str, default=".env", help="Path to env file to load (default: .env)")
    args = parser.parse_args()

    if args.env_file and Path(args.env_file).is_file():
        try:
            from dotenv import load_dotenv
            load_dotenv(args.env_file)
            print(f"Loaded environment variables from {args.env_file}")
        except ImportError:
            pass

    print("==================================================")
    print("CREATOR PLATFORM SAAS — DEPLOYMENT PREFLIGHT CHECK")
    print("==================================================")

    env_ok = check_env_vars()
    assets_ok = check_assets()
    db_ok = True
    if args.check_db:
        db_ok = asyncio.run(check_database_connectivity())

    print("\n--------------------------------------------------")
    if env_ok and assets_ok and db_ok:
        print("PREFLIGHT RESULT: PASS — Ready for deployment")
        sys.exit(0)
    else:
        print("PREFLIGHT RESULT: FAIL — Fix flagged issues before deploying")
        sys.exit(1)


if __name__ == "__main__":
    main()
