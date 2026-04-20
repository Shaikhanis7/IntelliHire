"""
src/core/services/resume_service.py

Orchestrates the full resume ingestion pipeline:

  UploadFile  →  text extraction
              →  LangChain structured parse  (all 9 sections)
              →  per-section embedding  (Google gemini-embedding-001)
              →  full-resume embedding
              →  persist Resume + ResumeSection rows
              →  return response dict

Two upload paths
────────────────
  upload_resume_for_job_application(db, candidate_id, file, background_tasks)
    Thin/fast path used when a candidate applies for a job.
    Does minimum synchronous work (extract text → S3 → bare Resume row),
    then defers heavy parsing + embedding to process_resume_in_background()
    via FastAPI BackgroundTasks. The HTTP response returns immediately.

  upload_resume_from_profile_page(db, candidate_id, file)
    Full synchronous path used on the candidate profile page.
    Runs the complete pipeline (extract → parse → embed → persist) inline
    before returning. Suitable when the UI waits for a fully-processed result.

Background task
───────────────
  process_resume_in_background(resume_id, candidate_id, raw_text)
    Replaces the old Celery task. Registered with FastAPI BackgroundTasks.
    Opens its own DB session (request session is already closed by the time
    it runs). Runs: LangChain parse → experience years → section embeddings
    → full embedding → persist ResumeSection rows → attach embedding.

Experience years
────────────────
  Computed by ResumeSectionEmbedder.total_experience_years(parsed), which
  sums ONLY full-time experience entries (is_fulltime=True, years > 0).
  Written to the experience ResumeSection row via bulk_create_resume_sections().
"""

from __future__ import annotations

import json
import logging

from fastapi import UploadFile, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.settings import settings
from src.data.repositories.resume_repo import (
    create_resume,
    create_resume_from_upload,
    bulk_create_resume_sections,
    get_next_version,
    get_resume,
    update_section_embedding,
)
from src.data.clients.s3_client import upload_resume_to_s3
from src.core.services.resume_langchain_service import (
    LangChainResumeParser,
    ResumeSectionEmbedder,
    ResumeFileExtractor,
    ParsedResumeSchema,
)
from src.data.clients.postgres_client import get_db as get_db_session

log = logging.getLogger(__name__)

# Module-level singletons — initialised once at application startup
_resume_parser   = LangChainResumeParser(settings.GROQ_API_KEY)
_section_embedder = ResumeSectionEmbedder()


# ═══════════════════════════════════════════════════════════════════════════════
# PARSE  (LangChain → structured schema)
# ═══════════════════════════════════════════════════════════════════════════════

async def parse_resume_text(raw_text: str) -> ParsedResumeSchema:
    """
    Extract all resume sections from raw text via the LangChain pipeline.

    Returns a ParsedResumeSchema Pydantic model. Each ExperienceEntry carries
    a .years int field (0 if unknown) and an .is_fulltime bool.

    Call ResumeSectionEmbedder.total_experience_years(parsed) to get the
    total full-time experience years from the result.
    """
    return await _resume_parser.parse_async(raw_text)


# ═══════════════════════════════════════════════════════════════════════════════
# EMBED  (per-section vectors + full-resume vector)
# ═══════════════════════════════════════════════════════════════════════════════

async def generate_section_embeddings(
    parsed: ParsedResumeSchema,
) -> dict[str, list[float]]:
    """
    Generate {section_name: embedding_vector} for every non-empty section.

    Runs in a thread pool via asyncio.to_thread so the event loop is not blocked
    by the synchronous Google embedding API call.
    """
    import asyncio
    return await asyncio.to_thread(_section_embedder.embed_all_sections, parsed)


# ═══════════════════════════════════════════════════════════════════════════════
# ATTACH EMBEDDING TO RESUME ROW
# ═══════════════════════════════════════════════════════════════════════════════

async def attach_full_embedding_to_resume_row(
    db: AsyncSession,
    resume_id: int,
    embedding_vector: list[float],
) -> None:
    """
    Persist the full-resume embedding vector on the Resume DB row.

    Called after the embedding is computed — both from the synchronous profile
    upload path and from the background task after job application uploads.

    Raises:
        ValueError: if the Resume row does not exist.
    """
    resume = await get_resume(db, resume_id)
    if not resume:
        raise ValueError(f"Resume {resume_id} not found — cannot attach embedding")

    resume.embedding = json.dumps(embedding_vector)
    await db.commit()
    log.info(f"Full embedding attached to resume_id={resume_id}")


# ═══════════════════════════════════════════════════════════════════════════════
# BACKGROUND TASK  (replaces old Celery task)
# ═══════════════════════════════════════════════════════════════════════════════

async def process_resume_in_background(
    resume_id: int,
    candidate_id: int,
    raw_text: str,
) -> None:
    """
    Heavy post-intake processing, run after the HTTP response has been sent.

    Registered with FastAPI BackgroundTasks by upload_resume_for_job_application().
    Opens its own DB session because the request session is already closed.

    Pipeline
    ────────
    1. LangChain parse  →  ParsedResumeSchema
    2. Compute total full-time experience years
    3. Embed all sections  (batched Google API call)
    4. Embed full resume   (single Google API call)
    5. Persist ResumeSection rows with experience_years
    6. Attach full embedding to the Resume row
    """
    log.info(
        f"[bg] process_resume_in_background started — "
        f"resume_id={resume_id} candidate_id={candidate_id}"
    )
    try:
        async with get_db_session() as db:

            # 1. Parse
            parsed: ParsedResumeSchema = await parse_resume_text(raw_text)

            if not parsed.skills and not parsed.experience:
                log.error("Parse returned empty data, retrying...")
                # Implement retry or skip
                return

            # 2. Experience years (full-time only)
            experience_years = ResumeSectionEmbedder.total_experience_years(parsed)
            log.info(
                f"[bg] resume_id={resume_id} "
                f"experience_years={experience_years} "
                f"experience_entries={len(parsed.experience)}"
            )

            # 3 + 4. Embeddings
            section_embedding_vectors = await generate_section_embeddings(parsed)
            full_resume_embedding     = _section_embedder.embed_full_resume(parsed)

            # 5. Persist section rows
            section_texts = ResumeSectionEmbedder.section_texts(parsed)
            sections = await bulk_create_resume_sections(
                db,
                resume_id=resume_id,
                sections=section_texts,
                section_embeddings=section_embedding_vectors,
                experience_years=experience_years,
            )

            # 6. Attach full embedding
            await attach_full_embedding_to_resume_row(
                db, resume_id, full_resume_embedding
            )

            log.info(
                f"[bg] process_resume_in_background done — "
                f"resume_id={resume_id} sections={len(sections)} "
                f"experience_years={experience_years}"
            )

    except Exception:
        log.exception(
            f"[bg] process_resume_in_background FAILED — "
            f"resume_id={resume_id} candidate_id={candidate_id}"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# UPLOAD — FAST PATH  (job application flow)
# ═══════════════════════════════════════════════════════════════════════════════

async def upload_resume_for_job_application(
    db: AsyncSession,
    candidate_id: int,
    file: UploadFile,
    background_tasks: BackgroundTasks,
) -> dict:
    """
    Thin, non-blocking resume intake for job applications.

    Returns immediately after persisting a bare Resume row. All heavy work
    (LangChain parse, section rows, embeddings, experience_years) is deferred
    to process_resume_in_background() via FastAPI BackgroundTasks.

    Returns
    -------
    dict with keys: resume_id, version, s3_key
    """
    import asyncio

    file_bytes: bytes = await file.read()
    filename: str     = file.filename or "resume"

    # 1. Extract text (no LLM — fast CPU-only)
    raw_text = ResumeFileExtractor.extract(file_bytes, filename)
    if not raw_text.strip():
        raise ValueError("Could not extract text from the uploaded file.")

    # 2. Version number + S3 upload
    version = await get_next_version(db, candidate_id)
    s3_key  = await asyncio.to_thread(
        upload_resume_to_s3, file_bytes, filename, candidate_id, version
    )

    # 3. Persist bare Resume row (no sections, no embedding yet)
    resume = await create_resume_from_upload(
        db,
        candidate_id=candidate_id,
        s3_key=s3_key,
        parsed_text=raw_text,
        version=version,
    )

    # 4. Schedule heavy work for after the response is sent
    background_tasks.add_task(
        process_resume_in_background,
        resume_id=resume.id,
        candidate_id=candidate_id,
        raw_text=raw_text,
    )

    log.info(
        f"[upload_resume_for_job_application] resume_id={resume.id} v{version} "
        f"s3={s3_key} | parse+embed+experience_years deferred to BackgroundTask"
    )

    return {
        "resume_id": resume.id,
        "version":   version,
        "s3_key":    s3_key,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# UPLOAD — FULL SYNCHRONOUS PATH  (profile page flow)
# ═══════════════════════════════════════════════════════════════════════════════

async def upload_resume_from_profile_page(
    db: AsyncSession,
    candidate_id: int,
    file: UploadFile,
) -> dict:
    """
    Full synchronous pipeline for standalone resume upload on the profile page.

    Runs the complete pipeline before returning so the UI receives fully-
    processed results (sections, scores, experience years) immediately.

    Pipeline
    ────────
    1. Read bytes from upload stream
    2. Extract raw text (CPU-only, no LLM)
    3. LangChain parse → ParsedResumeSchema
    4. Compute full-time experience years
    5. Embed all sections + full resume
    6. Upload file to S3
    7. Persist Resume row
    8. Persist ResumeSection rows with experience_years
    9. Attach full embedding to Resume row

    Returns
    -------
    dict with keys: resume_id, version, s3_key, sections_saved,
                    skills_found, experience_entries, experience_years, contact
    """
    import asyncio

    file_bytes: bytes = await file.read()
    filename: str     = file.filename or "resume"

    # 1 + 2. Extract text
    raw_text = ResumeFileExtractor.extract(file_bytes, filename)
    if not raw_text.strip():
        raise ValueError("Could not extract text from the uploaded file.")

    # 3. Parse
    parsed: ParsedResumeSchema = await parse_resume_text(raw_text)

    # 4. Experience years
    experience_years = ResumeSectionEmbedder.total_experience_years(parsed)
    log.info(
        f"[upload_resume_from_profile_page] candidate_id={candidate_id} "
        f"experience_years={experience_years} "
        f"experience_entries={len(parsed.experience)}"
    )

    # 5. Embeddings
    section_embedding_vectors = await generate_section_embeddings(parsed)
    full_resume_embedding     = _section_embedder.embed_full_resume(parsed)

    # 6. Version + S3 upload
    version = await get_next_version(db, candidate_id)
    s3_key  = await asyncio.to_thread(
        upload_resume_to_s3, file_bytes, filename, candidate_id, version
    )

    # 7. Persist Resume row
    resume = await create_resume_from_upload(
        db,
        candidate_id=candidate_id,
        s3_key=s3_key,
        parsed_text=raw_text,
        version=version,
    )

    # 8. Persist section rows
    section_texts = ResumeSectionEmbedder.section_texts(parsed)
    sections = await bulk_create_resume_sections(
        db,
        resume_id=resume.id,
        sections=section_texts,
        section_embeddings=section_embedding_vectors,
        experience_years=experience_years,
    )

    # 9. Attach full embedding
    await attach_full_embedding_to_resume_row(db, resume.id, full_resume_embedding)

    log.info(
        f"Resume {resume.id} (v{version}) uploaded to S3 for candidate {candidate_id} | "
        f"s3={s3_key} sections={len(sections)} experience_years={experience_years}"
    )

    return {
        "resume_id":          resume.id,
        "version":            version,
        "s3_key":             s3_key,
        "sections_saved":     len(sections),
        "skills_found":       len(parsed.skills),
        "experience_entries": len(parsed.experience),
        "experience_years":   experience_years,
        "contact": {
            "name":  parsed.contact.name,
            "email": parsed.contact.email,
        },
    }