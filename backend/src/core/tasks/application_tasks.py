"""
src/core/tasks/application_tasks.py
"""
from src.celery_app import celery_app
from src.core.tasks.event_loop import run_async, get_worker_session_factory


@celery_app.task(bind=True, max_retries=3, default_retry_delay=5)
def score_application_task(self, application_id: int):
    async def _run():
        SessionLocal = get_worker_session_factory()
        async with SessionLocal() as db:
            from src.core.services.application_service import score_application
            return await score_application(db, application_id)
    try:
        return run_async(_run())
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=2, default_retry_delay=30)
def shortlist_job_task(self, job_id: int, top_n: int = 10):
    async def _run():
        SessionLocal = get_worker_session_factory()
        async with SessionLocal() as db:
            from src.core.services.application_service import shortlist_job
            return await shortlist_job(db, job_id, top_n)
    try:
        return run_async(_run())
    except Exception as exc:
        raise self.retry(exc=exc)