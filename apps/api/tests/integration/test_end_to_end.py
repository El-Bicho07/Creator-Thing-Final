"""End-to-end integration test for the Phase 2 architecture.

Proves the chain from task §35 works, and critically that it works **without
bypassing RLS** -- every step runs over a real RLS-scoped session:

    Authenticated Creator
        -> Voice Engine
        -> Voice Profile
        -> Memory Ingestion
        -> E5-base EmbeddingService
        -> 768-D pgvector
        -> Memory Retrieval
        -> LLM Gateway

Also asserts the negative: a second creator cannot observe any of it.
"""
import numpy as np
import pytest
from sqlalchemy import text

from app.ai.embedding import get_embedding_service
from app.core.config import settings
from app.llm import get_llm_gateway, LLMRequest
from app.memory import IngestRequest, MemoryCategory, MemoryQuery, SourceType
from app.memory import get_memory_engine
from app.voice import get_voice_engine

pytestmark = pytest.mark.asyncio


async def test_full_platform_chain(session_a, session_b, user_a_id, user_b_id):
    async with session_a as db, session_b as db_b:
        # ---------------------------------------------------------------- 1. Voice
        samples = [
            "Most creators burn out because they optimise for output instead of "
            "recovery. Here is the fix that actually worked for me. 🚀",
            "I batch on Sundays. Twelve pieces, zero weekday burnout. What do you think?",
            "You do not need more discipline. You need a system that survives a bad week.",
        ]
        voice = get_voice_engine(db, user_a_id)
        profile = await voice.create_profile_from_samples(samples)
        assert profile.sample_count == 3
        assert profile.confidence > 0

        stored = await voice.get_profile()
        assert stored is not None, "voice profile must persist to voice_profiles"

        # --------------------------------------------- 2. Memory ingestion -> E5 -> pgvector
        memory = get_memory_engine(db, user_a_id)
        ingest = await memory.ingest(IngestRequest(
            title="Launch retrospective",
            raw_text=("I launched my SaaS landing page on a Tuesday and got 400 "
                      "signups in 48 hours. My mistake was waiting three weeks to "
                      "email my list. Next launch I will pre-warm the audience "
                      "48 hours in advance."),
            source_type=SourceType.NOTE,
            category=MemoryCategory.LESSON,
        ))
        assert ingest["persisted"] and ingest["chunks"] >= 1
        assert ingest["embedding_dimension"] == 768

        # ------------------------------------------------ 3. Stored vector is real E5
        row = (await db.execute(text(
            "SELECT chunk_text, embedding::text AS vec, embedding_model, "
            "embedding_dimension FROM chunks WHERE user_id = :u LIMIT 1"),
            {"u": str(user_a_id)})).mappings().one()

        stored_vec = np.asarray(json_loads(row["vec"]), dtype=np.float32)
        assert stored_vec.shape == (768,), "stored vector must be 768-D"
        assert row["embedding_model"] == "intfloat/multilingual-e5-base"
        assert row["embedding_dimension"] == 768

        service = get_embedding_service()
        recomputed = np.asarray(service.embed_document(row["chunk_text"]), dtype=np.float32)
        # Genuine model output, not padded or truncated.
        assert np.allclose(stored_vec, recomputed, atol=1e-5), \
            "stored vector must equal freshly computed E5 output"
        assert np.linalg.norm(stored_vec) == pytest.approx(1.0, abs=1e-5)

        # ------------------------------------------------------- 4. Memory retrieval
        hits = await memory.retrieve(MemoryQuery(
            query="why did the launch underperform?", top_k=3, purpose="integration"))
        assert hits, "own memory must be retrievable"
        assert hits[0].score > 0.5
        assert hits[0].retrieval_purpose == "integration"
        assert hits[0].content_asset_id == ingest["asset_id"]

        # Irrelevant query must score materially lower (retrieval is discriminative).
        off = await memory.retrieve(MemoryQuery(
            query="photosynthesis in marine phytoplankton", top_k=3))
        if off:
            assert off[0].score < hits[0].score

        # ------------------------------------------------- 5. Voice uses the same store
        voice_hits = await voice.similar_memories("how do I avoid burnout", top_k=3)
        assert isinstance(voice_hits, list)
        # `similar_memories` serialises ids to str, so compare like with like.
        assert all(v["content_asset_id"] == str(ingest["asset_id"])
                   for v in voice_hits[:1])

        # ------------------------------------------------------ 6. LLM Gateway step
        gateway = get_llm_gateway()
        from pydantic import BaseModel

        class CoachNote(BaseModel):
            summary: str
            next_actions: list[str]

        note = await gateway.generate(
            user_id=user_a_id,
            request=LLMRequest(
                purpose="integration_coach",
                feature="integration",
                input_data={"creator_id": str(user_a_id),
                            "memory_hits": [h.text for h in hits]},
                temperature=0.2,
            ),
            response_model=CoachNote,
        )
        assert isinstance(note, CoachNote)
        assert note.next_actions

        # Usage was recorded for this creator.
        logged = (await db.execute(
            text("SELECT count(*) FROM ai_calls WHERE user_id = :u"),
            {"u": str(user_a_id)})).scalar()
        assert logged >= 1, "gateway must log an ai_calls row"

        # --------------------------------------- 7. Isolation: user B sees none of it
        other = get_memory_engine(db_b, user_b_id)
        assert (await other.stats()).chunks == 0
        assert await other.retrieve(
            MemoryQuery(query="why did the launch underperform?", top_k=5)) == []
        assert await other.list_assets() == []
        assert await get_voice_engine(db_b, user_b_id).get_profile() is None
        # Even an unfiltered query must leak nothing: RLS is the boundary.
        assert (await db_b.execute(
            text("SELECT count(*) FROM chunks"))).scalar() == 0
        assert (await db_b.execute(
            text("SELECT count(*) FROM voice_profiles"))).scalar() == 0
async def test_single_vector_store_and_single_gateway(session_a, user_a_id):
    async with session_a as db:
        """Architecture invariants asserted against live objects."""
        import app.llm.gateway as gateway_module
        import app.memory.retrieval as retrieval_module

        # Only one embedding service instance is shared platform-wide.
        assert get_embedding_service() is get_embedding_service()

        # Memory engine holds the abstraction, not the model.
        engine = get_memory_engine(db, user_a_id)
        assert type(engine).__module__ == retrieval_module.__name__

        # Gateway is a process singleton: one egress point.
        assert get_llm_gateway() is get_llm_gateway()
        assert gateway_module.LLMGateway is not None

        metadata = get_embedding_service().get_model_metadata()
        assert metadata["dimension"] == settings.embedding_dimension == 768
        assert metadata["query_prefix"] == "query: "
        assert metadata["document_prefix"] == "passage: "
async def test_update_chunk_reembeds(session_a, user_a_id):
    async with session_a as db:
        """Editing a chunk must regenerate its vector, not orphan the old one."""
        memory = get_memory_engine(db, user_a_id)
        created = await memory.ingest(IngestRequest(
            title="Editable",
            raw_text="The original text about batching weekly output into one session."))
        assert created["persisted"]

        chunk_id = (await db.execute(
            text("SELECT id FROM chunks WHERE user_id = :u LIMIT 1"),
            {"u": str(user_a_id)})).scalar()

        before = (await db.execute(
            text("SELECT embedding::text FROM chunks WHERE id = :i"),
            {"i": str(chunk_id)})).scalar()

        updated = await memory.update_chunk(
            chunk_id, "Completely different content about pricing experiments.")
        assert updated["chunks_updated"] == 1
        assert updated["re_embedded"] is True

        after = (await db.execute(
            text("SELECT embedding::text FROM chunks WHERE id = :i"),
            {"i": str(chunk_id)})).scalar()
        assert before != after, "vector must change when the text changes"

        # And the new vector really corresponds to the new text.
        service = get_embedding_service()
        recomputed = service.embed_document("Completely different content about pricing experiments.")
        assert np.allclose(np.asarray(json_loads(after), dtype=np.float32),
                           np.asarray(recomputed, dtype=np.float32), atol=1e-5)
def json_loads(text: str):
    import json
    return json.loads(text)


def retrieval_path() -> str:
    import app.memory.retrieval as m
    return m.__file__