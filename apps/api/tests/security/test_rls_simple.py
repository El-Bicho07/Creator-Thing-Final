"""
Cross-User Isolation Security Tests - Simple Version

These tests verify that the RLS policies exist and are correctly configured.
They run against the actual database with RLS enabled.
"""

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from sqlalchemy import text
import uuid

from app.core.config import settings
from app.core.db import Base, rls_scoped_session

# Use the same database as the main app
TEST_DATABASE_URL = settings.database_url

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    poolclass=NullPool,
)

TestAsyncSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Test user IDs
USER_A_ID = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
USER_B_ID = uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")


class TestRLSPoliciesExist:
    """Verify all tables have RLS enabled and policies created."""

    @pytest.fixture
    def db(self):
        """Sync fixture returning an async context manager.

        pytest-asyncio 0.24 runs async fixtures on the session loop but async
        tests on a per-test loop, so a session created inside an async fixture
        cannot be used (or closed) from the test body. Returning a context
        manager moves session creation into the test's own loop.
        """
        return rls_scoped_session({"sub": str(USER_A_ID)})

    @pytest.mark.asyncio
    async def test_all_13_tables_have_rls_enabled(self, db):
        async with db as db:
            """Verify all 13 core tables have RLS enabled."""
            result = await db.execute(text("""
                SELECT tablename, rowsecurity 
                FROM pg_tables 
                WHERE schemaname = 'public' 
                AND tablename IN (
                    'users', 'creator_profiles', 'voice_profiles', 'content_assets',
                    'chunks', 'ideas', 'plan_items', 'performance_records',
                    'comments', 'comment_insights', 'lessons', 'jobs', 'ai_calls'
                )
                ORDER BY tablename
            """))
            rows = result.fetchall()
        
            assert len(rows) == 13, f"Expected 13 tables, found {len(rows)}: {[r[0] for r in rows]}"
            for table, rls_enabled in rows:
                assert rls_enabled, f"RLS not enabled on {table}"
    @pytest.mark.asyncio
    async def test_all_13_tables_have_rls_policies(self, db):
        async with db as db:
            """Verify all 13 core tables have RLS policies."""
            result = await db.execute(text("""
                SELECT tablename, policyname 
                FROM pg_policies 
                WHERE schemaname = 'public' 
                AND tablename IN (
                    'users', 'creator_profiles', 'voice_profiles', 'content_assets',
                    'chunks', 'ideas', 'plan_items', 'performance_records',
                    'comments', 'comment_insights', 'lessons', 'jobs', 'ai_calls'
                )
                ORDER BY tablename, policyname
            """))
            rows = result.fetchall()
        
            tables_with_policies = set(r[0] for r in rows)
            expected_tables = {
                'users', 'creator_profiles', 'voice_profiles', 'content_assets',
                'chunks', 'ideas', 'plan_items', 'performance_records',
                'comments', 'comment_insights', 'lessons', 'jobs', 'ai_calls'
            }
            missing = expected_tables - tables_with_policies
            assert not missing, f"Missing policies on: {missing}"
    @pytest.mark.asyncio
    async def test_rls_policies_use_current_user_id(self, db):
        async with db as db:
            """Verify RLS policies use current_user_id() function."""
            result = await db.execute(text("""
                SELECT tablename, policyname, qual, with_check
                FROM pg_policies 
                WHERE schemaname = 'public' 
                AND tablename IN (
                    'users', 'creator_profiles', 'voice_profiles', 'content_assets',
                    'chunks', 'ideas', 'plan_items', 'performance_records',
                    'comments', 'comment_insights', 'lessons', 'jobs', 'ai_calls'
                )
                ORDER BY tablename
            """))
            rows = result.fetchall()
        
            for table, policy, qual, with_check in rows:
                assert qual is not None, f"Policy {policy} on {table} has no USING clause"
                assert with_check is not None, f"Policy {policy} on {table} has no WITH CHECK clause"
                assert "user_id" in qual.lower(), f"Policy {policy} on {table} USING clause doesn't filter by user_id"
                assert "user_id" in with_check.lower(), f"Policy {policy} on {table} WITH CHECK clause doesn't filter by user_id"
    @pytest.mark.asyncio
    async def test_current_user_id_function_exists(self, db):
        async with db as db:
            """Verify the current_user_id() function exists."""
            result = await db.execute(text("""
                SELECT proname FROM pg_proc WHERE proname = 'current_user_id'
            """))
            assert result.fetchone() is not None, "current_user_id() function not found"
class TestRLSFunctionalBehavior:
    """Test that RLS actually filters data when current_user_id() is set."""

    @pytest.fixture
    def db(self):
        """Sync fixture returning an async context manager.

        pytest-asyncio 0.24 runs async fixtures on the session loop but async
        tests on a per-test loop, so a session created inside an async fixture
        cannot be used (or closed) from the test body. Returning a context
        manager moves session creation into the test's own loop.
        """
        return rls_scoped_session({"sub": str(USER_A_ID)})

    def cleanup_user_data(self, db, user_ids):
        """Clean up test data."""
        for table in [
            'creator_profiles', 'voice_profiles', 'content_assets', 'chunks',
            'ideas', 'plan_items', 'performance_records', 'comments',
            'comment_insights', 'lessons', 'jobs', 'ai_calls'
        ]:
            db.execute(text(f"DELETE FROM {table} WHERE user_id = ANY(CAST(:ids AS uuid[]))"), 
                      {"ids": [str(u) for u in user_ids]})
        db.commit()

    @pytest.mark.asyncio
    async def test_user_can_access_own_data(self, db):
        async with db as db:
            """Test that User A can access their own data."""
            # Cleanup first
            for table in ['creator_profiles', 'voice_profiles', 'content_assets', 'chunks',
                'ideas', 'plan_items', 'performance_records', 'comments',
                'comment_insights', 'lessons', 'jobs', 'ai_calls']:
                await db.execute(text(f"DELETE FROM {table} WHERE user_id = ANY(CAST(:ids AS uuid[]))"), 
                              {"ids": [str(USER_A_ID), str(USER_B_ID)]})
            await db.commit()
        
            # Insert as User A
            await db.execute(text("SELECT set_config('request.jwt.claims', :claims, false)"), 
                        {"claims": '{"sub": "' + str(USER_A_ID) + '"}'})
            await db.execute(text("""
                INSERT INTO creator_profiles (id, user_id, full_name, niche, target_audience, primary_platform, content_goals)
                VALUES (gen_random_uuid(), :user_id, 'User A', 'Tech', 'Developers', 'YouTube', '[]')
            """), {"user_id": USER_A_ID})
            await db.commit()

            # Query as User A
            await db.execute(text("SELECT set_config('request.jwt.claims', :claims, false)"), 
                        {"claims": '{"sub": "' + str(USER_A_ID) + '"}'})
            result = await db.execute(text("SELECT * FROM creator_profiles WHERE user_id = :user_id"), 
                               {"user_id": USER_A_ID})
            rows = result.fetchall()
            assert len(rows) == 1
            assert rows[0].full_name == "User A"
        
            # Cleanup
            for table in ['creator_profiles', 'voice_profiles', 'content_assets', 'chunks',
                'ideas', 'plan_items', 'performance_records', 'comments',
                'comment_insights', 'lessons', 'jobs', 'ai_calls']:
                await db.execute(text(f"DELETE FROM {table} WHERE user_id = ANY(CAST(:ids AS uuid[]))"), 
                              {"ids": [str(USER_A_ID), str(USER_B_ID)]})
            await db.commit()
    @pytest.mark.asyncio
    async def test_user_isolation_on_creator_profiles(self, db):
        async with db as db:
            """Test that User A cannot see User B's creator profile."""
            # Cleanup first
            for table in ['creator_profiles', 'voice_profiles', 'content_assets', 'chunks',
                'ideas', 'plan_items', 'performance_records', 'comments',
                'comment_insights', 'lessons', 'jobs', 'ai_calls']:
                await db.execute(text(f"DELETE FROM {table} WHERE user_id = ANY(CAST(:ids AS uuid[]))"), 
                              {"ids": [str(USER_A_ID), str(USER_B_ID)]})
            await db.commit()
        
            # Insert as User B
            await db.execute(text("SELECT set_config('request.jwt.claims', :claims, false)"), 
                        {"claims": '{"sub": "' + str(USER_B_ID) + '"}'})
            await db.execute(text("""
                INSERT INTO creator_profiles (id, user_id, full_name, niche, target_audience, primary_platform, content_goals)
                VALUES (gen_random_uuid(), :user_id, 'User B', 'Fitness', 'Athletes', 'Instagram', '[]')
            """), {"user_id": USER_B_ID})
            await db.commit()

            # Query as User A
            await db.execute(text("SELECT set_config('request.jwt.claims', :claims, false)"), 
                        {"claims": '{"sub": "' + str(USER_A_ID) + '"}'})
            result = await db.execute(text("SELECT * FROM creator_profiles WHERE user_id = :user_id"), 
                               {"user_id": USER_B_ID})
            rows = result.fetchall()
            assert len(rows) == 0, "User A should not see User B's profile"
        
            # Cleanup
            for table in ['creator_profiles', 'voice_profiles', 'content_assets', 'chunks',
                'ideas', 'plan_items', 'performance_records', 'comments',
                'comment_insights', 'lessons', 'jobs', 'ai_calls']:
                await db.execute(text(f"DELETE FROM {table} WHERE user_id = ANY(CAST(:ids AS uuid[]))"), 
                              {"ids": [str(USER_A_ID), str(USER_B_ID)]})
            await db.commit()
    @pytest.mark.asyncio
    async def test_user_isolation_on_chunks(self, db):
        async with db as db:
            """Test that User A cannot see User B's chunks (embeddings)."""
            # Cleanup first
            for table in ['creator_profiles', 'voice_profiles', 'content_assets', 'chunks',
                'ideas', 'plan_items', 'performance_records', 'comments',
                'comment_insights', 'lessons', 'jobs', 'ai_calls']:
                await db.execute(text(f"DELETE FROM {table} WHERE user_id = ANY(CAST(:ids AS uuid[]))"), 
                              {"ids": [str(USER_A_ID), str(USER_B_ID)]})
            await db.commit()
        
            # Insert content asset and chunk as User B
            await db.execute(text("SELECT set_config('request.jwt.claims', :claims, false)"), 
                        {"claims": '{"sub": "' + str(USER_B_ID) + '"}'})
            result = await db.execute(text("""
                INSERT INTO content_assets (id, user_id, title, source_type, raw_text)
                VALUES (gen_random_uuid(), :user_id, 'Test Video', 'youtube', 'Test content')
                RETURNING id
            """), {"user_id": USER_B_ID})
            asset_id = result.fetchone()[0]

            await db.execute(text("""
                INSERT INTO chunks (id, user_id, asset_id, chunk_index, chunk_text, embedding)
                VALUES (gen_random_uuid(), :user_id, :asset_id, 0, 'Test chunk', '[0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918,0.0360843918]'::vector)
            """), {"user_id": USER_B_ID, "asset_id": asset_id})
            await db.commit()

            # Query chunks as User A
            await db.execute(text("SELECT set_config('request.jwt.claims', :claims, false)"), 
                        {"claims": '{"sub": "' + str(USER_A_ID) + '"}'})
            result = await db.execute(text("SELECT * FROM chunks WHERE user_id = :user_id"), 
                               {"user_id": USER_B_ID})
            rows = result.fetchall()
            assert len(rows) == 0, "User A should not see User B's embeddings"
        
            # Cleanup
            for table in ['creator_profiles', 'voice_profiles', 'content_assets', 'chunks',
                'ideas', 'plan_items', 'performance_records', 'comments',
                'comment_insights', 'lessons', 'jobs', 'ai_calls']:
                await db.execute(text(f"DELETE FROM {table} WHERE user_id = ANY(CAST(:ids AS uuid[]))"), 
                              {"ids": [str(USER_A_ID), str(USER_B_ID)]})
            await db.commit()
    @pytest.mark.asyncio
    async def test_user_isolation_on_jobs(self, db):
        async with db as db:
            """Test that User A cannot see User B's jobs."""
            # Cleanup first
            for table in ['creator_profiles', 'voice_profiles', 'content_assets', 'chunks',
                'ideas', 'plan_items', 'performance_records', 'comments',
                'comment_insights', 'lessons', 'jobs', 'ai_calls']:
                await db.execute(text(f"DELETE FROM {table} WHERE user_id = ANY(CAST(:ids AS uuid[]))"), 
                              {"ids": [str(USER_A_ID), str(USER_B_ID)]})
            await db.commit()
        
            # Insert job as User B
            await db.execute(text("SELECT set_config('request.jwt.claims', :claims, false)"), 
                        {"claims": '{"sub": "' + str(USER_B_ID) + '"}'})
            await db.execute(text("""
                INSERT INTO jobs (id, user_id, job_type, status, progress, total)
                VALUES (gen_random_uuid(), :user_id, 'ingest', 'processing', 50, 100)
            """), {"user_id": USER_B_ID})
            await db.commit()

            # Query jobs as User A
            await db.execute(text("SELECT set_config('request.jwt.claims', :claims, false)"), 
                        {"claims": '{"sub": "' + str(USER_A_ID) + '"}'})
            result = await db.execute(text("SELECT * FROM jobs WHERE user_id = :user_id"), 
                               {"user_id": USER_B_ID})
            rows = result.fetchall()
            assert len(rows) == 0, "User A should not see User B's jobs"
        
            # Cleanup
            for table in ['creator_profiles', 'voice_profiles', 'content_assets', 'chunks',
                'ideas', 'plan_items', 'performance_records', 'comments',
                'comment_insights', 'lessons', 'jobs', 'ai_calls']:
                await db.execute(text(f"DELETE FROM {table} WHERE user_id = ANY(CAST(:ids AS uuid[]))"), 
                              {"ids": [str(USER_A_ID), str(USER_B_ID)]})
            await db.commit()
    @pytest.mark.asyncio
    async def test_user_isolation_on_ai_calls(self, db):
        async with db as db:
            """Test that User A cannot see User B's AI calls."""
            # Cleanup first
            for table in ['creator_profiles', 'voice_profiles', 'content_assets', 'chunks',
                'ideas', 'plan_items', 'performance_records', 'comments',
                'comment_insights', 'lessons', 'jobs', 'ai_calls']:
                await db.execute(text(f"DELETE FROM {table} WHERE user_id = ANY(CAST(:ids AS uuid[]))"), 
                              {"ids": [str(USER_A_ID), str(USER_B_ID)]})
            await db.commit()
        
            # Insert AI call as User B
            await db.execute(text("SELECT set_config('request.jwt.claims', :claims, false)"), 
                        {"claims": '{"sub": "' + str(USER_B_ID) + '"}'})
            await db.execute(text("""
                INSERT INTO ai_calls (id, user_id, feature, provider, model, prompt_version, 
                                     input_tokens, output_tokens, estimated_cost, latency_ms, success)
                VALUES (gen_random_uuid(), :user_id, 'test', 'gemini', 'gemini-2.5-flash', 'v1',
                       100, 50, 0.001, 200, true)
            """), {"user_id": USER_B_ID})
            await db.commit()

            # Query AI calls as User A
            await db.execute(text("SELECT set_config('request.jwt.claims', :claims, false)"), 
                        {"claims": '{"sub": "' + str(USER_A_ID) + '"}'})
            result = await db.execute(text("SELECT * FROM ai_calls WHERE user_id = :user_id"), 
                               {"user_id": USER_B_ID})
            rows = result.fetchall()
            assert len(rows) == 0, "User A should not see User B's AI calls"
        
            # Cleanup
            for table in ['creator_profiles', 'voice_profiles', 'content_assets', 'chunks',
                'ideas', 'plan_items', 'performance_records', 'comments',
                'comment_insights', 'lessons', 'jobs', 'ai_calls']:
                await db.execute(text(f"DELETE FROM {table} WHERE user_id = ANY(CAST(:ids AS uuid[]))"), 
                              {"ids": [str(USER_A_ID), str(USER_B_ID)]})
            await db.commit()