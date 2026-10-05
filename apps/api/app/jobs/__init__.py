"""Background job tracking (Postgres-backed, no broker)."""
from app.jobs.service import JobRecord, JobService, get_job_service, run_job

__all__ = ["JobService", "JobRecord", "get_job_service", "run_job"]
