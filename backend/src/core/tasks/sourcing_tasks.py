"""
src/core/tasks/sourcing_tasks.py

Background worker replacement for Celery.
The task function is async — Starlette's BackgroundTasks detects this and
schedules it directly on the event loop instead of running it in a thread pool.
"""

from __future__ import annotations

from src.observability.logging.logger import setup_logger

log = setup_logger()


async def source_candidates_task(
    job_id: int,
    role: str,
    skills: list[str],
    min_exp: int,
    count: int,
    mode: str,
    sourcing_id: int,
    triggered_by: int | None = None,   # ← added
) -> None:
    """
    Async background task — drop-in replacement for the Celery task.

    Must be async so Starlette's BackgroundTasks runs it on the event loop
    directly. If it were sync, Starlette would push it to a thread pool via
    anyio, where asyncio.get_event_loop() raises a RuntimeError.

    Usage (in router):
        background_tasks.add_task(
            source_candidates_task,
            job_id, role, skills, min_exp, count, mode, sourcing.id, triggered_by,
        )
    """
    try:
        from src.data.clients.postgres_client import get_async_session
        from src.core.services.sourcing_service import source_candidates

        log.info(
            f"[bg_task] Starting | sourcing_id={sourcing_id} job_id={job_id} "
            f"role='{role}' mode={mode} count={count} triggered_by={triggered_by}"
        )

        async with get_async_session() as db:
            result = await source_candidates(
                db=db,
                job_id=job_id,
                role=role,
                skills=skills,
                min_exp=min_exp,
                count=count,
                mode=mode,
                sourcing_id=sourcing_id,
                triggered_by=triggered_by,   # ← forwarded
            )

        log.info(
            f"[bg_task] Done | sourcing_id={sourcing_id} job_id={job_id} "
            f"total_found={result.total_found}"
        )

    except Exception as exc:
        log.error(
            f"[bg_task] FAILED | sourcing_id={sourcing_id} job_id={job_id} | {exc}",
            exc_info=True,
        )
        from src.data.clients.postgres_client import get_async_session
        from src.data.repositories.sourcing_repo import fail_sourcing
        async with get_async_session() as db:
            await fail_sourcing(db, sourcing_id=sourcing_id)