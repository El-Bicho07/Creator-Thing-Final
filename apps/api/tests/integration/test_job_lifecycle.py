"""Job system verification.

Phase 2 added `JobService` on top of the existing `jobs` table (migration 002), and
Phase 4 reuses it for asynchronous Producer planning. The service has eleven public
operations but, until now, had **no dedicated test file** -- coverage arrived only
incidentally through other features.

These tests pin the lifecycle the module docstring promises:

    create -> pending -> claimed -> running -> completed
                                       \\-> failed (retryable)
                                       \\-> cancelled

They run against the real database with RLS enabled, because the ownership
guarantee (`WHERE user_id = :user_id` on every statement) *is* the authorization
boundary and a mocked session would not exercise it.

Deliberately NOT tested here, because the service does not implement them: stale
job recovery (a claimed job is never reclaimed), and priority ordering (jobs are
strictly FIFO by `created_at`). Both are asserted as absent so a future change is
a conscious decision rather than an accident.
"""
from __future__ import annotations

import asyncio
import uuid

import pytest
from sqlalchemy import text

from app.jobs import JobService, run_job
from tests.conftest import USER_A, USER_B, rls_session

pytestmark = pytest.mark.asyncio


# --------------------------------------------------------------------------- #
# create
# --------------------------------------------------------------------------- #


@pytest.mark.asyncio
async def test_create_starts_pending_with_zero_progress():
    async with rls_session(USER_A) as db:
        job_id = await JobService(db, USER_A).create("studio.generate")

        record = await JobService(db, USER_A).get(job_id)

    assert record is not None
    assert record.status == "pending"
    assert record.progress == 0
    assert record.job_type == "studio.generate"
    assert record.user_id == USER_A


@pytest.mark.asyncio
async def test_create_records_supplied_total_and_metadata():
    async with rls_session(USER_A) as db:
        service = JobService(db, USER_A)
        job_id = await service.create(
            "producer.plan", total=7, metadata={"source": "today", "nested": {"k": 1}}
        )
        record = await service.get(job_id)

    assert record.total == 7
    assert record.metadata["source"] == "today"
    assert record.metadata["nested"] == {"k": 1}


@pytest.mark.asyncio
async def test_create_defaults_metadata_to_an_empty_object_not_null():
    async with rls_session(USER_A) as db:
        job_id = await JobService(db, USER_A).create("studio.generate")
        record = await JobService(db, USER_A).get(job_id)

    assert record.metadata == {}


# --------------------------------------------------------------------------- #
# claim
# --------------------------------------------------------------------------- #


@pytest.mark.asyncio
async def test_claim_moves_a_pending_job_to_running():
    async with rls_session(USER_A) as db:
        service = JobService(db, USER_A)
        job_id = await service.create("studio.generate")

        claimed = await service.claim()

        assert claimed is not None
        assert claimed.id == job_id
        assert claimed.status == "running"


@pytest.mark.asyncio
async def test_claim_returns_none_when_the_queue_is_empty():
    async with rls_session(USER_A) as db:
        assert await JobService(db, USER_A).claim() is None


@pytest.mark.asyncio
async def test_claim_only_returns_pending_jobs():
    """A running job must not be handed out a second time."""
    async with rls_session(USER_A) as db:
        service = JobService(db, USER_A)
        await service.create("studio.generate")

        first = await service.claim()
        second = await service.claim()

    assert first is not None
    assert second is None


@pytest.mark.asyncio
async def test_claim_filters_by_job_type():
    async with rls_session(USER_A) as db:
        service = JobService(db, USER_A)
        await service.create("studio.generate")
        await service.create("producer.plan")

        assert await service.claim("producer.plan") is not None
        # The other type is untouched and still claimable.
        remaining = await service.claim("studio.generate")
        assert remaining is not None
        assert remaining.job_type == "studio.generate"


@pytest.mark.asyncio
async def test_claim_never_returns_another_users_job():
    async with rls_session(USER_A) as db:
        await JobService(db, USER_A).create("studio.generate")

    async with rls_session(USER_B) as db:
        assert await JobService(db, USER_B).claim() is None


@pytest.mark.asyncio
async def test_concurrent_workers_never_claim_the_same_job():
    """`FOR UPDATE SKIP LOCKED` must make claiming atomic across workers.

    Two independent sessions (each with its own connection and RLS identity) race
    for the same queue. Every job must be delivered exactly once -- no job lost to
    a double-claim, none skipped.
    """
    async with rls_session(USER_A) as db:
        service = JobService(db, USER_A)
        job_ids = {await service.create("studio.generate") for _ in range(6)}

    async def drain() -> set[uuid.UUID]:
        claimed: set[uuid.UUID] = set()
        async with rls_session(USER_A) as db:
            worker = JobService(db, USER_A)
            while True:
                record = await worker.claim()
                if record is None:
                    return claimed
                claimed.add(record.id)

    first, second = await asyncio.gather(drain(), drain())

    assert first.isdisjoint(second), "a job was claimed by both workers"
    assert first | second == job_ids, "a job was lost or double-delivered"


# --------------------------------------------------------------------------- #
# progress
# --------------------------------------------------------------------------- #


@pytest.mark.asyncio
async def test_update_progress_records_intermediate_progress():
    async with rls_session(USER_A) as db:
        service = JobService(db, USER_A)
        job_id = await service.create("studio.generate", total=10)
        await service.update_progress(job_id, 4)

        record = await service.get(job_id)

    assert record.progress == 4
    assert record.total == 10


@pytest.mark.asyncio
async def test_update_progress_clamps_to_the_zero_hundred_range():
    """Progress is a percentage. A caller reporting 5000 must not store 5000."""
    async with rls_session(USER_A) as db:
        service = JobService(db, USER_A)
        high = await service.create("studio.generate")
        low = await service.create("studio.generate")
        await service.update_progress(high, 5000)
        await service.update_progress(low, -20)

        assert (await service.get(high)).progress == 100
        assert (await service.get(low)).progress == 0


@pytest.mark.asyncio
async def test_update_progress_can_revise_the_total_but_omitting_it_keeps_the_total():
    async with rls_session(USER_A) as db:
        service = JobService(db, USER_A)
        job_id = await service.create("studio.generate", total=10)
        await service.update_progress(job_id, 5, total=25)
        await service.update_progress(job_id, 6)

        record = await service.get(job_id)

    assert record.total == 25
    assert record.progress == 6


@pytest.mark.asyncio
async def test_progress_update_cannot_touch_another_users_job():
    async with rls_session(USER_A) as db:
        job_id = await JobService(db, USER_A).create("studio.generate")

    async with rls_session(USER_B) as db:
        await JobService(db, USER_B).update_progress(job_id, 99)

    async with rls_session(USER_A) as db:
        assert (await JobService(db, USER_A).get(job_id)).progress == 0


# --------------------------------------------------------------------------- #
# complete / fail
# --------------------------------------------------------------------------- #


@pytest.mark.asyncio
async def test_complete_marks_done_and_stores_the_result():
    async with rls_session(USER_A) as db:
        service = JobService(db, USER_A)
        job_id = await service.create("studio.generate")
        await service.complete(job_id, {"generation_id": "abc"})

        record = await service.get(job_id)

    assert record.status == "completed"
    assert record.progress == 100
    assert record.error_message is None
    assert record.metadata["result"] == {"generation_id": "abc"}


@pytest.mark.asyncio
async def test_completing_a_job_does_not_erase_earlier_metadata():
    """`_merge_metadata` exists so a result never discards context already stored."""
    async with rls_session(USER_A) as db:
        service = JobService(db, USER_A)
        job_id = await service.create("studio.generate", metadata={"requested_by": "today"})
        await service.complete(job_id, {"ok": True})

        record = await service.get(job_id)

    assert record.metadata["requested_by"] == "today"
    assert record.metadata["result"] == {"ok": True}


@pytest.mark.asyncio
async def test_fail_records_the_error_and_stops_the_job():
    async with rls_session(USER_A) as db:
        service = JobService(db, USER_A)
        job_id = await service.create("studio.generate")
        await service.fail(job_id, "provider exploded")

        record = await service.get(job_id)

    assert record.status == "failed"
    assert "provider exploded" in record.error_message
    assert record.metadata["last_error"] == "provider exploded"


@pytest.mark.asyncio
async def test_fail_truncates_a_pathological_error_message():
    """`error_message` is a bounded column; a giant traceback must not break it."""
    async with rls_session(USER_A) as db:
        service = JobService(db, USER_A)
        job_id = await service.create("studio.generate")
        await service.fail(job_id, "x" * 50_000)

        record = await service.get(job_id)

    assert len(record.error_message) <= 1000


@pytest.mark.asyncio
async def test_fail_with_retry_returns_the_job_to_the_queue():
    async with rls_session(USER_A) as db:
        service = JobService(db, USER_A)
        job_id = await service.create("studio.generate")
        await service.claim()
        await service.fail(job_id, "transient", retry=True)

        assert (await service.get(job_id)).status == "pending"
        # And it is genuinely claimable again, not merely relabelled.
        assert (await service.claim()).id == job_id


@pytest.mark.asyncio
async def test_a_failed_job_cannot_be_completed_by_the_wrong_creator():
    async with rls_session(USER_A) as db:
        job_id = await JobService(db, USER_A).create("studio.generate")

    async with rls_session(USER_B) as db:
        await JobService(db, USER_B).complete(job_id, {"stolen": True})

    async with rls_session(USER_A) as db:
        record = await JobService(db, USER_A).get(job_id)

    assert record.status == "pending"
    assert "result" not in record.metadata


# --------------------------------------------------------------------------- #
# cancel
# --------------------------------------------------------------------------- #


@pytest.mark.asyncio
async def test_cancel_stops_a_pending_job():
    async with rls_session(USER_A) as db:
        service = JobService(db, USER_A)
        job_id = await service.create("studio.generate")

        assert await service.cancel(job_id) == {"cancelled": 1}
        assert (await service.get(job_id)).status == "cancelled"


@pytest.mark.asyncio
async def test_cancel_stops_a_running_job():
    async with rls_session(USER_A) as db:
        service = JobService(db, USER_A)
        job_id = await service.create("studio.generate")
        await service.claim()

        assert await service.cancel(job_id) == {"cancelled": 1}
        assert (await service.get(job_id)).status == "cancelled"


@pytest.mark.asyncio
async def test_cancel_refuses_to_rewrite_a_finished_job():
    """Invalid state transition: a completed job must stay completed."""
    async with rls_session(USER_A) as db:
        service = JobService(db, USER_A)
        job_id = await service.create("studio.generate")
        await service.complete(job_id)

        assert await service.cancel(job_id) == {"cancelled": 0}
        assert (await service.get(job_id)).status == "completed"


@pytest.mark.asyncio
async def test_cancel_is_idempotent():
    async with rls_session(USER_A) as db:
        service = JobService(db, USER_A)
        job_id = await service.create("studio.generate")
        await service.cancel(job_id)

        assert await service.cancel(job_id) == {"cancelled": 0}


@pytest.mark.asyncio
async def test_cancel_cannot_touch_another_users_job():
    async with rls_session(USER_A) as db:
        job_id = await JobService(db, USER_A).create("studio.generate")

    async with rls_session(USER_B) as db:
        assert await JobService(db, USER_B).cancel(job_id) == {"cancelled": 0}

    async with rls_session(USER_A) as db:
        assert (await JobService(db, USER_A).get(job_id)).status == "pending"


# --------------------------------------------------------------------------- #
# read / list
# --------------------------------------------------------------------------- #


@pytest.mark.asyncio
async def test_get_returns_none_for_a_foreign_or_unknown_job():
    async with rls_session(USER_A) as db:
        job_id = await JobService(db, USER_A).create("studio.generate")

    async with rls_session(USER_B) as db:
        assert await JobService(db, USER_B).get(job_id) is None
        assert await JobService(db, USER_B).get(uuid.uuid4()) is None


@pytest.mark.asyncio
async def test_list_jobs_returns_only_the_callers_jobs_newest_first():
    async with rls_session(USER_A) as db:
        service = JobService(db, USER_A)
        first = await service.create("studio.generate")
        second = await service.create("producer.plan")

    async with rls_session(USER_B) as db:
        await JobService(db, USER_B).create("studio.generate")

    async with rls_session(USER_A) as db:
        listed = await JobService(db, USER_A).list_jobs()

    assert [j["id"] for j in listed] == [str(second), str(first)]
    assert all(j["user_id"] == str(USER_A) for j in listed)


@pytest.mark.asyncio
async def test_as_dict_exposes_the_progress_ratio():
    async with rls_session(USER_A) as db:
        service = JobService(db, USER_A)
        job_id = await service.create("studio.generate", total=4)
        await service.update_progress(job_id, 1)

        record = await service.get(job_id)
        as_dict = record.as_dict()

    assert as_dict["progress"] == 1
    assert as_dict["total"] == 4
    assert as_dict["id"] == str(job_id)


# --------------------------------------------------------------------------- #
# run_job
# --------------------------------------------------------------------------- #


@pytest.mark.asyncio
async def test_run_job_completes_and_returns_the_final_record():
    async def work(service, record):
        await service.update_progress(record.id, 50)
        return {"written": 1}

    async with rls_session(USER_A) as db:
        record = await run_job(db, USER_A, "producer.plan", work, metadata={"d": "2026-03-10"})

    assert record.status == "completed"
    assert record.progress == 100
    assert record.metadata["result"] == {"written": 1}
    assert record.metadata["d"] == "2026-03-10"


@pytest.mark.asyncio
async def test_run_job_retries_then_succeeds():
    """A flaky worker must be retried, not failed on the first exception."""
    attempts = {"n": 0}

    async def work(service, record):
        attempts["n"] += 1
        if attempts["n"] < 3:
            raise RuntimeError("transient upstream blip")
        return {"attempt": attempts["n"]}

    async with rls_session(USER_A) as db:
        record = await run_job(db, USER_A, "producer.plan", work, max_retries=2)

    assert attempts["n"] == 3
    assert record.status == "completed"
    assert record.metadata["result"] == {"attempt": 3}


@pytest.mark.asyncio
async def test_run_job_gives_up_after_max_retries():
    """`max_retries=2` means three attempts total, then a terminal failure."""
    attempts = {"n": 0}

    async def work(service, record):
        attempts["n"] += 1
        raise RuntimeError("permanently broken")

    async with rls_session(USER_A) as db:
        record = await run_job(db, USER_A, "producer.plan", work, max_retries=2)

    assert attempts["n"] == 3
    assert record.status == "failed"
    assert "permanently broken" in record.error_message


@pytest.mark.asyncio
async def test_run_job_zero_retries_fails_on_the_first_error():
    attempts = {"n": 0}

    async def work(service, record):
        attempts["n"] += 1
        raise RuntimeError("nope")

    async with rls_session(USER_A) as db:
        record = await run_job(db, USER_A, "producer.plan", work, max_retries=0)

    assert attempts["n"] == 1
    assert record.status == "failed"


@pytest.mark.asyncio
async def test_run_job_never_leaks_the_exception_to_the_client_surface():
    """A job failure is recorded, not raised into the request path.

    Phase 2's stance is that background work fails closed and quietly: the caller
    observes a failed record, and the message stays inside the job row rather than
    becoming an API 500 with a traceback.
    """
    secret = "sk-do-not-leak-me"

    async def work(service, record):
        raise RuntimeError(f"provider rejected {secret}")

    async with rls_session(USER_A) as db:
        record = await run_job(db, USER_A, "producer.plan", work, max_retries=0)

    assert record.status == "failed"
    # Recorded for operators...
    assert secret in record.error_message
    # ...and truncated to the documented bound rather than unbounded.
    assert len(record.error_message) <= 1000


# --------------------------------------------------------------------------- #
# RLS boundary
# --------------------------------------------------------------------------- #


@pytest.mark.asyncio
async def test_jobs_table_has_rls_enabled_with_a_creator_scoped_policy():
    async with rls_session(USER_A) as db:
        enabled = (await db.execute(
            text("SELECT relrowsecurity FROM pg_class WHERE relname = 'jobs'")
        )).scalar()
        policies = (await db.execute(
            text("SELECT policyname, coalesce(qual, '') , cmd FROM pg_policies "
                 "WHERE tablename = 'jobs' ORDER BY policyname")
        )).all()

    assert enabled is True
    assert policies, "jobs has RLS enabled but no policies at all"

    # Every policy must actually scope on the creator identity, otherwise RLS is
    # enabled in name only and the service's WHERE clause becomes the real control.
    unqualified = [name for name, _qual, _cmd in policies if "user_id" not in (_qual or "")]
    assert not unqualified, f"jobs policies not scoped by user_id: {unqualified}"


@pytest.mark.asyncio
async def test_raw_sql_cannot_read_another_users_jobs():
    """Bypassing JobService entirely must still be denied by RLS.

    This is the property that makes `WHERE user_id = :user_id` in the service a
    convenience rather than the actual security control.
    """
    async with rls_session(USER_A) as db:
        await JobService(db, USER_A).create("studio.generate")

    async with rls_session(USER_B) as db:
        rows = (await db.execute(text("SELECT id FROM jobs"))).fetchall()

    assert rows == []


@pytest.mark.asyncio
async def test_raw_sql_cannot_delete_another_users_jobs():
    async with rls_session(USER_A) as db:
        job_id = await JobService(db, USER_A).create("studio.generate")

    async with rls_session(USER_B) as db:
        await db.execute(text("DELETE FROM jobs"))
        await db.commit()

    async with rls_session(USER_A) as db:
        assert await JobService(db, USER_A).get(job_id) is not None


# --------------------------------------------------------------------------- #
# Deliberately unimplemented behaviour
# --------------------------------------------------------------------------- #


@pytest.mark.asyncio
async def test_a_claimed_job_is_never_reclaimed_after_a_worker_dies():
    """No stale-job recovery exists in Phase 2, and that is intentional.

    `claim` only selects `status IN ('pending')`, so a job left `running` by a
    dead worker stays running forever. Asserted so the limitation is explicit: a
    future Phase that adds recovery will fail this test and have to decide what the
    right timeout is.
    """
    async with rls_session(USER_A) as db:
        service = JobService(db, USER_A)
        job_id = await service.create("studio.generate")
        await service.claim()

        # A second worker joining later finds nothing.
        assert await service.claim() is None
        assert (await service.get(job_id)).status == "running"
