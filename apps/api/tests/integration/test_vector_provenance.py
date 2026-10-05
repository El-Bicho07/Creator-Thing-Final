"""Vector provenance, anti-padding, and index verification (task §9, §10, §11).

Regression tests that FAIL if anyone converts 384-d vectors to 768-d without
actually re-embedding, or if the index stops matching the live vector column.
"""
from __future__ import annotations

import json
import uuid

import numpy as np
import pytest
from sqlalchemy import text

from app.ai.embedding import get_embedding_service
from app.core.config import settings
from app.core.db import admin_session_maker, rls_scoped_session

pytestmark = pytest.mark.asyncio

TOLERANCE = 1e-5
SAMPLE_SIZE = 25


async def _stored_chunks(limit: int = SAMPLE_SIZE):
    async with admin_session_maker() as db:
        return (await db.execute(text("""
            SELECT id, chunk_text, embedding::text AS vec,
                   embedding_model, embedding_dimension, embedding_version
            FROM chunks
            WHERE embedding IS NOT NULL
            ORDER BY chunk_text
            LIMIT :limit
        """), {"limit": limit})).mappings().all()



PROBE_USER = uuid.UUID("5f0c9a3e-7b41-4d2a-9e6f-0c1b2d3e4f50")


async def _ensure_embedded_chunk() -> None:
    """Guarantee at least one genuinely-embedded chunk exists.

    These tests previously skipped themselves when `chunks` was empty, which
    meant a wiped or never-migrated vector table would silently disable the
    whole provenance check -- exactly the failure mode §9 exists to catch.
    Instead we seed one chunk through the REAL ingest path (RLS-scoped session
    + live E5 service), so the assertions always run.
    """
    if await _stored_chunks(limit=1):
        return
    async with admin_session_maker() as db:
        await db.execute(
            text("INSERT INTO users (id, email) VALUES (:i, :e) "
                 "ON CONFLICT (id) DO NOTHING"),
            {"i": str(PROBE_USER),
             "e": "vector-provenance-probe@test.local"})
        await db.commit()
    from app.memory import (
        IngestRequest, MemoryCategory, SourceType, get_memory_engine,
    )
    async with rls_scoped_session({"sub": str(PROBE_USER)}) as db:
        await get_memory_engine(db, PROBE_USER).ingest(IngestRequest(
            title="vector provenance probe",
            raw_text=("A provenance probe chunk used to prove that stored "
                      "vectors are genuine 768-dimension E5 output."),
            source_type=SourceType.NOTE,
            category=MemoryCategory.FACT))
    assert await _stored_chunks(limit=1), (
        "seeding failed: still no embedded chunk to verify"
    )


# --------------------------------------------------------------------------- #
# §9 Provenance
# --------------------------------------------------------------------------- #

async def test_every_stored_vector_is_768d():
    async with admin_session_maker() as db:
        row = (await db.execute(text("""
            SELECT COUNT(*) AS total,
                   COUNT(DISTINCT vector_dims(embedding)) AS distinct_dims,
                   MIN(vector_dims(embedding)) AS min_dim,
                   MAX(vector_dims(embedding)) AS max_dim,
                   COUNT(*) FILTER (WHERE embedding IS NULL) AS nulls
            FROM chunks
        """))).mappings().one()
        assert int(row["nulls"]) == 0, "NULL embeddings must not exist"
        assert int(row["min_dim"]) == 768 == int(row["max_dim"]), \
            f"stored widths range {row['min_dim']}..{row['max_dim']}"
        assert int(row["distinct_dims"]) == 1


async def test_no_384d_columns_remain_anywhere():
    async with admin_session_maker() as db:
        legacy = (await db.execute(text("""
            SELECT table_name, column_name FROM information_schema.columns
            WHERE table_schema='public' AND udt_name='vector'
              AND character_maximum_length = 384
        """))).mappings().all()
        assert not legacy, f"stale vector(384) columns: {[dict(r) for r in legacy]}"


async def test_no_expand_column_remains():
    """The expand-phase column must be gone; no duplicate vector storage."""
    async with admin_session_maker() as db:
        row = (await db.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_schema='public' AND table_name='chunks'
              AND column_name='embedding_v2'
        """))).mappings().one_or_none()
        assert row is None, "embedding_v2 still present: duplicate vector storage"


async def test_stored_provenance_is_e5_base():
    async with admin_session_maker() as db:
        rows = (await db.execute(text("""
            SELECT DISTINCT embedding_model, embedding_dimension, embedding_version
            FROM chunks WHERE embedding IS NOT NULL
        """))).mappings().all()
        assert rows, "no embedded chunks to verify"
        for row in rows:
            assert row["embedding_model"] == "intfloat/multilingual-e5-base"
            assert int(row["embedding_dimension"]) == 768
            assert row["embedding_version"] == settings.embedding_version


async def test_stored_vectors_match_freshly_computed_embeddings():
    """Recompute with the current configuration and compare within tolerance."""
    await _ensure_embedded_chunk()
    rows = await _stored_chunks()
    assert rows, "no embedded chunks present"

    service = get_embedding_service()
    assert service.get_dimension() == 768, "fresh dimension must be 768"

    worst_abs = 0.0
    worst_cos = 1.0
    for row in rows:
        stored = np.asarray(json.loads(row["vec"]), dtype=np.float32)
        fresh = np.asarray(service.embed_document(row["chunk_text"]), dtype=np.float32)
        assert stored.shape == (768,), f"stored width {stored.shape}"
        assert fresh.shape == (768,), f"fresh width {fresh.shape}"
        worst_abs = max(worst_abs, float(np.abs(stored - fresh).max()))
        worst_cos = min(worst_cos, float(stored @ fresh))

    assert worst_abs <= TOLERANCE, (
        f"stored vectors deviate from freshly computed E5 output by {worst_abs} "
        f"(tolerance {TOLERANCE}) -- they were not produced by this model/config"
    )
    assert worst_cos > 0.999, f"lowest cosine vs fresh output: {worst_cos}"


async def test_stored_vectors_are_unit_norm():
    rows = await _stored_chunks(limit=50)
    for row in rows:
        stored = np.asarray(json.loads(row["vec"]), dtype=np.float32)
        assert abs(float(np.linalg.norm(stored)) - 1.0) < 1e-4, \
            "pgvector vector_cosine_ops requires L2-normalised vectors"


# --------------------------------------------------------------------------- #
# §10 Anti-padding regression
# --------------------------------------------------------------------------- #

async def test_stored_vectors_are_not_padded_or_repeated_384d():
    """A converted-without-re-embedding vector must be distinguishable.

    Real E5 output cannot be confused with any naive 384 -> 768 conversion:
    zero-padding, repeating, or cycling a genuine legacy 384-d MiniLM vector.
    """
    await _ensure_embedded_chunk()
    rows = await _stored_chunks(limit=SAMPLE_SIZE)
    assert rows, "no embedded chunks present"

    # Check EVERY sampled chunk, not just the first: a negative control that
    # corrupted one chunk proved this test missed it when it only looked at
    # rows[0]. Iterate the whole sample so no row can hide.
    def unit(vec):
        vec = vec.astype(np.float32).copy()
        return vec / np.linalg.norm(vec)

    checked = 0
    for row in rows:
        stored = np.asarray(json.loads(row["vec"]), dtype=np.float32)
        assert stored.shape == (768,)
        candidates = {}
        truncated = np.zeros(768, dtype=np.float32)
        truncated[:384] = stored[:384]
        candidates["zero_pad_of_truncation"] = unit(truncated)
        half = unit(stored[:384])
        candidates["repeated_half"] = unit(np.tile(half, 2))
        for name, fake in candidates.items():
            cosine = float(unit(stored) @ fake)
            assert cosine < 0.99, (
                f"chunk {row['id']} is suspiciously close to a '{name}' "
                f"conversion (cosine {cosine:.6f}); it may not be genuine E5 output"
            )
        checked += 1

    assert checked >= 5, f"only {checked} chunks checked; sample too small"
    # Keep a representative row for the genuine-MiniLM comparison below.
    row = rows[0]
    stored = np.asarray(json.loads(row["vec"]), dtype=np.float32)
    assert stored.shape == (768,)

    # A genuine legacy 384-d vector for the same text.
    legacy_vec = None
    try:
        from sentence_transformers import SentenceTransformer

        legacy = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")
        legacy_vec = np.asarray(
            legacy.encode([row["chunk_text"]], normalize_embeddings=True)[0],
            dtype=np.float32)
    except Exception:
        legacy_vec = None

    def unit(vec):
        vec = vec.astype(np.float32).copy()
        return vec / np.linalg.norm(vec)

    candidates = {}

    # zero-pad a 384-d vector derived from the stored one
    truncated = np.zeros(768, dtype=np.float32)
    truncated[:384] = stored[:384]
    candidates["zero_pad_of_truncation"] = unit(truncated)

    # repeat (cycle) a 384-d vector twice
    half = unit(stored[:384])
    candidates["repeated_half"] = unit(np.tile(half, 2))

    if legacy_vec is not None:
        padded = np.zeros(768, dtype=np.float32)
        padded[:384] = legacy_vec[:384]
        candidates["padded_real_minilm_384"] = unit(padded)

    for name, fake in candidates.items():
        cosine = float(stored @ fake)
        assert cosine < 0.99, (
            f"stored vector is suspiciously close to a '{name}' conversion "
            f"(cosine {cosine:.6f}); it may not be genuine E5 output"
        )


async def test_real_384_model_output_is_orthogonal_to_stored():
    """Strongest available evidence: a padded real 384-d vector is unrelated."""
    await _ensure_embedded_chunk()
    rows = await _stored_chunks(limit=1)
    assert rows, "no embedded chunks present"
    row = rows[0]
    stored = np.asarray(json.loads(row["vec"]), dtype=np.float32)

    try:
        from sentence_transformers import SentenceTransformer

        legacy = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")
        legacy_vec = np.asarray(
            legacy.encode([row["chunk_text"]], normalize_embeddings=True)[0],
            dtype=np.float32)
    except Exception:
        pytest.skip("legacy 384-d model unavailable in this environment")

    padded = np.zeros(768, dtype=np.float32)
    padded[:384] = legacy_vec[:384]
    padded /= np.linalg.norm(padded)
    cosine = float(stored @ padded)
    assert cosine < 0.9, (
        f"stored vector correlates {cosine:.4f} with a padded 384-d vector; "
        "the migration may have padded rather than re-embedded"
    )


# --------------------------------------------------------------------------- #
# §11 Index + retrieval
# --------------------------------------------------------------------------- #

async def test_vector_index_exists_on_the_768_column():
    async with admin_session_maker() as db:
        row = (await db.execute(text("""
            SELECT indexdef FROM pg_indexes
            WHERE schemaname='public' AND tablename='chunks'
              AND indexdef ILIKE '%vector%'
        """))).mappings().one_or_none()
        assert row is not None, "no vector index on chunks"
        assert "ivfflat" in row["indexdef"].lower()
        assert "vector_cosine_ops" in row["indexdef"].lower(), \
            "index must use the cosine operator class used by retrieval"


async def test_no_index_remains_on_a_384_column():
    async with admin_session_maker() as db:
        stale = (await db.execute(text("""
            SELECT indexname FROM pg_indexes
            WHERE schemaname='public' AND tablename='chunks'
              AND indexdef ILIKE '%384%'
        """))).scalars().all()
        assert not stale, f"index still targets a 384-d column: {stale}"


async def test_retrieval_uses_the_live_768_column():
    """A real end-to-end retrieval over the production column."""
    import uuid

    user = uuid.UUID("77777777-7777-4777-8777-777777777777")

    async with admin_session_maker() as db:
        await db.execute(
            text("INSERT INTO users (id, email) VALUES (:i, :e) "
                 "ON CONFLICT (id) DO NOTHING"),
            {"i": str(user), "e": "idx-check@test.local"})
        await db.commit()

    from app.memory import (IngestRequest, MemoryCategory, MemoryQuery,
                            SourceType, get_memory_engine)

    async with rls_scoped_session({"sub": str(user)}) as db:
        await db.execute(text("DELETE FROM chunks WHERE user_id = :u"),
                         {"u": str(user)})
        await db.commit()

        memory = get_memory_engine(db, user)
        await memory.ingest(IngestRequest(
            title="index check",
            raw_text=("My batching system produces twelve pieces every Sunday so "
                      "weekday burnout stays at zero across the month."),
            source_type=SourceType.NOTE,
            category=MemoryCategory.LESSON))
        # Genuinely distinct domains: generic English prose scores high against
        # everything under E5, so an undifferentiated distractor proves nothing.
        await memory.ingest(IngestRequest(
            title="tax",
            raw_text=("The quarterly corporate income tax liability must be "
                      "remitted to the revenue authority within thirty days of "
                      "period end."),
            source_type=SourceType.NOTE,
            category=MemoryCategory.FACT))
        await memory.ingest(IngestRequest(
            title="knitting",
            raw_text=("Cast on four hundred stitches, work the lace pattern "
                      "chart, and bind off loosely to avoid a too-tight edge."),
            source_type=SourceType.NOTE,
            category=MemoryCategory.FACT))

        # Within-query ranking: for each query, its own chunk must rank first.
        # Comparing scores ACROSS queries is meaningless (different score scales).
        cases = [
            ("how do I stop weekday burnout?", "batching"),
            ("quarterly corporate income tax liability", "tax"),
            ("lace pattern chart bind off", "stitches"),
        ]
        scores = []
        for query, expected_fragment in cases:
            hits = await memory.retrieve(MemoryQuery(query=query, top_k=3))
            assert hits, f"no results for {query!r}"
            top = hits[0]
            assert expected_fragment in top.text.lower(), (
                f"query {query!r} retrieved the wrong chunk as top hit: "
                f"{top.text[:70]!r}"
            )
            # The runner-up must be strictly worse.
            if len(hits) > 1:
                assert top.score > hits[1].score, "top hit is not the best match"
            scores.append(top.score)

        # A single query must still separate relevant from irrelevant.
        on_topic = await memory.retrieve(
            MemoryQuery(query="how do I stop weekday burnout?", top_k=3))
        assert on_topic[0].score > 0.5

        # The chunk actually lives in the 768-d column.
        dims = (await db.execute(text(
            "SELECT vector_dims(embedding) FROM chunks WHERE user_id = :u LIMIT 1"),
            {"u": str(user)})).scalar()
        assert int(dims) == 768

        await db.execute(text("DELETE FROM content_assets WHERE user_id = :u"),
                         {"u": str(user)})
        await db.commit()