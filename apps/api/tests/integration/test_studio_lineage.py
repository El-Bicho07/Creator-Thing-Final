"""Generation lineage, refinement budget, and asset lifecycle.

Phase 3 shipped with four defects, and this file exists so they cannot come back:

1. Studio deleting `chunks` directly (a Memory Engine boundary violation).
2. Orphaned generated assets / embeddings after deletion.
3. Refinement budget following the wrong lineage.

Lineage itself was thin: `test_studio_flow.py` referenced
`max_refinements_per_version` exactly once. The properties below were asserted
nowhere -- monotonic versions, `parent_generation_id` chain shape, latest-version
selection, and duplicate-version rejection.

The boundary that matters here: `studio_generations.asset_id ->
content_assets(id) ON DELETE CASCADE` cascades in the *asset -> generation*
direction only. Deleting a session or a version therefore removes the generation
row but strands the generated text unless the asset is deleted too. Every
cleanup test below asserts on BOTH the generation row and the asset row, because
asserting on only one is exactly how defect 2 shipped.
"""
from __future__ import annotations

import uuid

import pytest
from sqlalchemy import text

from app.studio.persistence import StudioRepository
from tests.conftest import USER_A, USER_B, rls_session

pytestmark = pytest.mark.asyncio


async def _session_and_generations(db, *, versions: int, capability: str = "script"):
    """Create a session plus `versions` generations chained by parent link."""
    repo = StudioRepository(db, USER_A)
    session = await repo.create_session(title="reel work")
    parent = None
    made = []
    for index in range(1, versions + 1):
        asset = await repo.create_asset(
            title=f"v{index}",
            raw_text=f"version {index} body",
            source_type="studio",
        )
        generation = await repo.create_generation(
            session_id=session.id,
            asset_id=asset,
            version=index,
            capability=capability if index == 1 else "refine",
            parent_generation_id=parent,
        )
        made.append(generation)
        parent = generation.id
    return session, made


# --------------------------------------------------------------------------- #
# version ordering
# --------------------------------------------------------------------------- #


@pytest.mark.asyncio
async def test_next_version_is_monotonic_and_starts_at_one():
    async with rls_session(USER_A) as db:
        repo = StudioRepository(db, USER_A)
        session = await repo.create_session(title="reel work")

        assert await repo.next_version(session.id) == 1


@pytest.mark.asyncio
async def test_next_version_advances_past_existing_versions():
    async with rls_session(USER_A) as db:
        session, generations = await _session_and_generations(db, versions=3)
        repo = StudioRepository(db, USER_A)

        assert await repo.next_version(session.id) == 4
        assert [g.version for g in generations] == [1, 2, 3]


@pytest.mark.asyncio
async def test_list_generations_returns_ascending_versions():
    async with rls_session(USER_A) as db:
        session, _ = await _session_and_generations(db, versions=4)
        listed = await StudioRepository(db, USER_A).list_generations(session.id)

    assert [g.version for g in listed] == [1, 2, 3, 4]


@pytest.mark.asyncio
async def test_versions_are_numbered_per_session_not_globally():
    """A second session restarts at 1; the unique index is (session, version)."""
    async with rls_session(USER_A) as db:
        repo = StudioRepository(db, USER_A)
        first = await repo.create_session(title="reel work")
        await _session_and_generations(db, versions=2)

        asset = await repo.create_asset(title="a", raw_text="body", source_type="studio")
        second_session = await repo.create_session(title="reel work")
        fresh = await repo.create_generation(
            session_id=second_session.id, asset_id=asset, version=1,
            capability="script",
        )

    assert fresh.version == 1


@pytest.mark.asyncio
async def test_a_duplicate_version_in_one_session_is_rejected_by_the_database():
    """`idx_studio_generations_session_version` is UNIQUE -- the last line of defence."""
    async with rls_session(USER_A) as db:
        repo = StudioRepository(db, USER_A)
        session = await repo.create_session(title="reel work")
        asset = await repo.create_asset(title="a", raw_text="body", source_type="studio")
        await repo.create_generation(
            session_id=session.id, asset_id=asset, version=1, capability="script"
        )
        asset2 = await repo.create_asset(title="b", raw_text="body 2", source_type="studio")

        with pytest.raises(Exception):
            await repo.create_generation(
                session_id=session.id, asset_id=asset2, version=1, capability="script"
            )
        await db.rollback()


@pytest.mark.asyncio
async def test_version_zero_is_rejected_by_the_check_constraint():
    """`CHECK (version >= 1)` -- versions are 1-based, never 0."""
    async with rls_session(USER_A) as db:
        repo = StudioRepository(db, USER_A)
        session = await repo.create_session(title="reel work")
        asset = await repo.create_asset(title="a", raw_text="body", source_type="studio")

        with pytest.raises(Exception):
            await repo.create_generation(
                session_id=session.id, asset_id=asset, version=0, capability="script"
            )
        await db.rollback()


# --------------------------------------------------------------------------- #
# lineage
# --------------------------------------------------------------------------- #


@pytest.mark.asyncio
async def test_refinement_appends_and_links_to_its_parent():
    """Refinement must never overwrite: the original stays retrievable."""
    async with rls_session(USER_A) as db:
        _, generations = await _session_and_generations(db, versions=3)
        repo = StudioRepository(db, USER_A)

        first, second, third = generations
        assert first.parent_generation_id is None
        assert second.parent_generation_id == first.id
        assert third.parent_generation_id == second.id

        # The original is still fully readable after two refinements.
        original = await repo.get_generation(first.id)
        assert original.version == 1


@pytest.mark.asyncio
async def test_the_lineage_chain_walks_back_to_a_single_origin():
    async with rls_session(USER_A) as db:
        _, generations = await _session_and_generations(db, versions=4)

    seen = []
    node = generations[-1]
    while node is not None:
        seen.append(node.version)
        parent_id = node.parent_generation_id
        node = next((g for g in generations if g.id == parent_id), None)

    assert seen == [4, 3, 2, 1]


@pytest.mark.asyncio
async def test_first_generation_of_a_capability_is_an_origin():
    """Only `refine` chains; a fresh `script` starts a new root."""
    async with rls_session(USER_A) as db:
        repo = StudioRepository(db, USER_A)
        session = await repo.create_session(title="reel work")
        asset = await repo.create_asset(title="a", raw_text="body", source_type="studio")
        root = await repo.create_generation(
            session_id=session.id, asset_id=asset, version=1, capability="script"
        )
        asset2 = await repo.create_asset(title="b", raw_text="body 2", source_type="studio")
        sibling = await repo.create_generation(
            session_id=session.id, asset_id=asset2, version=2,
            capability="hook", parent_generation_id=None,
        )

    assert root.parent_generation_id is None
    assert sibling.parent_generation_id is None


@pytest.mark.asyncio
async def test_latest_generation_is_the_highest_version_not_the_newest_row():
    async with rls_session(USER_A) as db:
        session, _ = await _session_and_generations(db, versions=3)
        latest = await StudioRepository(db, USER_A).latest_generation(session.id)

    assert latest.version == 3


@pytest.mark.asyncio
async def test_latest_generation_is_none_for_an_empty_session():
    async with rls_session(USER_A) as db:
        repo = StudioRepository(db, USER_A)
        session = await repo.create_session(title="reel work")

        assert await repo.latest_generation(session.id) is None
        assert await repo.list_generations(session.id) == []


@pytest.mark.asyncio
async def test_deleting_a_parent_does_not_delete_its_descendants():
    """`parent_generation_id ... ON DELETE SET NULL` -- lineage loss, not data loss."""
    async with rls_session(USER_A) as db:
        session, generations = await _session_and_generations(db, versions=3)
        repo = StudioRepository(db, USER_A)

        assert await repo.delete_generation(generations[1].id) is True
        child = await repo.get_generation(generations[2].id)

    assert child is not None, "deleting v2 must not cascade-delete v3"
    assert child.parent_generation_id is None, "the link should be nulled, not dangling"


# --------------------------------------------------------------------------- #
# asset lifecycle (Phase 3 defect 2: orphans)
# --------------------------------------------------------------------------- #


@pytest.mark.asyncio
async def test_deleting_a_generation_also_deletes_its_asset():
    async with rls_session(USER_A) as db:
        session, generations = await _session_and_generations(db, versions=1)
        repo = StudioRepository(db, USER_A)
        asset_id = generations[0].asset_id

        assert await repo.delete_generation(generations[0].id) is True
        asset = await repo.get_asset_text(asset_id)

    assert asset is None, "deleting a version orphaned its content asset"


@pytest.mark.asyncio
async def test_deleting_a_session_removes_its_generations_and_assets():
    async with rls_session(USER_A) as db:
        repo = StudioRepository(db, USER_A)
        session, generations = await _session_and_generations(db, versions=3)
        asset_ids = [g.asset_id for g in generations]

        assert await repo.delete_session(session.id) is True

        remaining_generations = (
            await db.execute(text(
                "SELECT COUNT(*) FROM studio_generations WHERE session_id = :s"),
                {"s": str(session.id)})
        ).scalar()
        remaining_assets = (
            await db.execute(text(
                "SELECT id FROM content_assets WHERE id = ANY(CAST(:ids AS uuid[]))"),
                {"ids": [str(a) for a in asset_ids]})
        ).fetchall()

    assert remaining_generations == 0
    assert remaining_assets == [], "session deletion orphaned content assets"


@pytest.mark.asyncio
async def test_deleting_an_asset_cascades_to_the_generation():
    """The other cascade direction: asset -> generation, via the FK."""
    async with rls_session(USER_A) as db:
        repo = StudioRepository(db, USER_A)
        session, generations = await _session_and_generations(db, versions=1)

        await db.execute(
            text("DELETE FROM content_assets WHERE id = :a"),
            {"a": str(generations[0].asset_id)},
        )
        await db.commit()

        assert await repo.get_generation(generations[0].id) is None


@pytest.mark.asyncio
async def test_deleting_a_session_cascades_asset_deletion_to_chunks():
    """Regression for Phase 3 defect 1.

    Studio must reach chunk cleanup *through* the `content_assets` FK, never by
    issuing `DELETE FROM chunks` itself -- `chunks` is the Memory Engine's vector
    store.

    The realistic shape: a Studio generation points at an asset that Memory Engine
    also owns and has chunked (a creator's reference material reused as a
    generation's body). Deleting the session must take the chunks with it, via the
    cascade only. A companion architecture test asserts the absence of the SQL.
    """
    async with rls_session(USER_A) as db:
        from app.memory import IngestRequest, MemoryCategory, SourceType, get_memory_engine

        # Memory Engine creates and chunks the asset.
        created = await get_memory_engine(db, USER_A).ingest(IngestRequest(
            title="creator reference",
            raw_text="A launch day lesson worth remembering in detail.",
            source_type=SourceType.NOTE,
            category=MemoryCategory.PREFERENCE,
        ))
        await db.commit()
        asset_id = uuid.UUID(str(created["asset_id"]))
        assert created["chunks"] >= 1, "Memory Engine produced no chunk to clean up"

        # Studio adopts that asset as a generation body.
        repo = StudioRepository(db, USER_A)
        session = await repo.create_session(title="reel work")
        await repo.create_generation(
            session_id=session.id, asset_id=asset_id, version=1, capability="script"
        )

        chunk_before = (
            await db.execute(text("SELECT COUNT(*) FROM chunks WHERE user_id = :u"),
                             {"u": str(USER_A)})
        ).scalar()

        await repo.delete_session(session.id)

        chunk_after = (
            await db.execute(text("SELECT COUNT(*) FROM chunks WHERE user_id = :u"),
                             {"u": str(USER_A)})
        ).scalar()
        asset_after = await repo.get_asset_text(asset_id)

    assert chunk_before >= 1
    assert chunk_after == chunk_before - 1, (
        "asset deletion did not cascade to chunks -- Studio must not touch chunks "
        "directly, but the content_assets cascade must still fire"
    )
    assert asset_after is None


@pytest.mark.asyncio
async def test_a_foreign_creator_cannot_delete_a_generation():
    async with rls_session(USER_A) as db:
        _, generations = await _session_and_generations(db, versions=1)

    async with rls_session(USER_B) as db:
        repo = StudioRepository(db, USER_B)
        assert await repo.delete_generation(generations[0].id) is False
        assert await repo.get_generation(generations[0].id) is None

    async with rls_session(USER_A) as db:
        assert await StudioRepository(db, USER_A).get_generation(generations[0].id) is not None


@pytest.mark.asyncio
async def test_a_foreign_creator_cannot_delete_a_session_or_its_assets():
    async with rls_session(USER_A) as db:
        session, generations = await _session_and_generations(db, versions=2)

    async with rls_session(USER_B) as db:
        assert await StudioRepository(db, USER_B).delete_session(session.id) is False

    async with rls_session(USER_A) as db:
        repo = StudioRepository(db, USER_A)
        assert len(await repo.list_generations(session.id)) == 2
        assert await repo.get_asset_text(generations[0].asset_id) is not None


# --------------------------------------------------------------------------- #
# critique attachment
# --------------------------------------------------------------------------- #


@pytest.mark.asyncio
async def test_attached_critique_references_the_generation_it_was_written_for():
    async with rls_session(USER_A) as db:
        _, generations = await _session_and_generations(db, versions=1)
        repo = StudioRepository(db, USER_A)

        await repo.attach_critique(
            generations[0].id, {"verdict": "needs_work", "notes": ["hook is slow"]}
        )
        record = await repo.get_generation(generations[0].id)

    assert record.critique["verdict"] == "needs_work"
    assert record.critique["notes"] == ["hook is slow"]


@pytest.mark.asyncio
async def test_critique_cannot_be_attached_to_another_users_generation():
    async with rls_session(USER_A) as db:
        _, generations = await _session_and_generations(db, versions=1)

    async with rls_session(USER_B) as db:
        result = await StudioRepository(db, USER_B).attach_critique(
            generations[0].id, {"verdict": "forged"}
        )
        assert result is None

    async with rls_session(USER_A) as db:
        record = await StudioRepository(db, USER_A).get_generation(generations[0].id)

    assert record.critique is None


@pytest.mark.asyncio
async def test_attaching_critique_to_a_missing_generation_returns_none():
    async with rls_session(USER_A) as db:
        repo = StudioRepository(db, USER_A)
        assert await repo.attach_critique(uuid.uuid4(), {"verdict": "x"}) is None


@pytest.mark.asyncio
async def test_approval_is_explicit_and_default_off():
    """Studio never approves on the creator's behalf."""
    async with rls_session(USER_A) as db:
        _, generations = await _session_and_generations(db, versions=1)
        repo = StudioRepository(db, USER_A)

        assert (await repo.get_generation(generations[0].id)).creator_approved is False

        await repo.set_approved(generations[0].id, True)
        assert (await repo.get_generation(generations[0].id)).creator_approved is True


@pytest.mark.asyncio
async def test_a_foreign_creator_cannot_approve():
    async with rls_session(USER_A) as db:
        _, generations = await _session_and_generations(db, versions=1)

    async with rls_session(USER_B) as db:
        await StudioRepository(db, USER_B).set_approved(generations[0].id, True)

    async with rls_session(USER_A) as db:
        record = await StudioRepository(db, USER_A).get_generation(generations[0].id)

    assert record.creator_approved is False
