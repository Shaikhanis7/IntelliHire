"""
src/core/tasks/resume_tasks.py

Celery tasks for resume processing.

process_resume_upload_task
──────────────────────────
  Called after BOTH:
    a) standalone resume upload (profile page)  — same as before
    b) resume uploaded during job application    — NEW, dispatched by apply_for_job_with_resume

  Input:
    resume_id    — already-persisted Resume row (bare: s3_key + parsed_text, no sections yet)
    candidate_id — owner
    raw_text     — extracted text (already stored on Resume.parsed_text, passed here to
                   avoid a redundant DB read inside the worker)

  Work done inside the worker:
    1. LangChain parse   → ParsedResumeSchema
    2. total_experience_years() extracted from parsed experience entries  ← NEW
    3. Per-section embed → section rows in DB (experience_years written here) ← NEW
    4. Full-resume embed → Resume.embedding in DB

  On completion the Resume row is fully populated and score_application_task
  can use it if the recruiter triggers shortlisting.
"""

from src.celery_app import celery_app
from src.core.tasks.event_loop import run_async, get_worker_session_factory


@celery_app.task(bind=True, max_retries=3, default_retry_delay=10)
def process_resume_upload_task(
    self,
    resume_id: int,
    candidate_id: int,
    raw_text: str,
):
    """
    Heavy resume processing: parse (LLM) → section embeddings → full embedding.
    Safe to retry — bulk_create_resume_sections is idempotent if sections are
    cleared first (or you can add a guard in the repo).
    """
    async def _run():
        SessionLocal = get_worker_session_factory()
        async with SessionLocal() as db:
            from src.core.services.resume_service import (
                parse_resume,
                generate_resume_embedding,
                attach_embedding_to_resume,
            )
            from src.core.services.resume_langchain_service import ResumeSectionEmbedder
            from src.data.repositories.resume_repo import bulk_create_resume_sections

            # ── 1. LangChain structured parse ─────────────────────────────────
            parsed = await parse_resume(raw_text)

            # ── 2. compute experience_years from LLM output ───────────────────
            # Returns int (sum of role years) or None if LLM found no durations.
            # None → bulk_create_resume_sections leaves the column NULL →
            # scoring/sourcing falls back to regex on parsed_text automatically.
            experience_years = ResumeSectionEmbedder.total_experience_years(parsed)

            # ── 3. per-section embeddings ─────────────────────────────────────
            section_embeddings = await generate_resume_embedding(parsed)
            section_texts = ResumeSectionEmbedder.section_texts(parsed)

            await bulk_create_resume_sections(
                db,
                resume_id=resume_id,
                sections=section_texts,
                section_embeddings=section_embeddings,
                experience_years=experience_years,   # ← fixed: was `experience_years | None`
            )

            # ── 4. full-resume embedding ──────────────────────────────────────
            full_embedding = ResumeSectionEmbedder().embed_full_resume(parsed)
            await attach_embedding_to_resume(db, resume_id, full_embedding)

    try:
        return run_async(_run())
    except Exception as exc:
        raise self.retry(exc=exc)


# ── kept for backwards-compat (standalone upload flow via profile page) ───────

@celery_app.task(bind=True, max_retries=3, default_retry_delay=10)
def process_resume_upload_task_legacy(
    self,
    resume_id: int,
    candidate_id: int,
    raw_text: str,
):
    """
    Alias — identical to process_resume_upload_task.
    Kept so any existing queued tasks or references don't break during deploy.
    """
    return process_resume_upload_task.apply(
        args=[resume_id, candidate_id, raw_text]
    )