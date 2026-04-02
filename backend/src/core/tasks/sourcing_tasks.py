"""
src/core/tasks/sourcing_tasks.py
"""
import asyncio
from src.celery_app import celery_app
from src.core.tasks.event_loop import run_async, get_worker_session_factory

SOURCING_TIMEOUT = 840


@celery_app.task(
    bind=True,
    max_retries=1,
    default_retry_delay=60,
)
def source_candidates_task(
    self,
    job_id: int,
    role: str,
    skills: list,
    min_exp: int,
    count: int,
    mode: str = "both",
    sourcing_id: int | None = None,   # ← added
):
    async def _run():
        SessionLocal = get_worker_session_factory()
        async with SessionLocal() as db:
            from src.core.services.sourcing_service import source_candidates
            return await asyncio.wait_for(
                source_candidates(
                    db,
                    job_id,
                    role,
                    skills,
                    min_exp,
                    count,
                    mode,
                    sourcing_id=sourcing_id,   # ← pass through
                ),
                timeout=SOURCING_TIMEOUT,
            )

    try:
        return run_async(_run())
    except asyncio.TimeoutError:
        return {
            "status": "partial",
            "job_id": job_id,
            "note":   f"Sourcing hit {SOURCING_TIMEOUT}s timeout — partial results may be in DB",
        }
    except Exception as exc:
        raise self.retry(exc=exc)