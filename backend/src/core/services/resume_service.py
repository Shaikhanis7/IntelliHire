"""
src/core/services/resume_service.py

Orchestrates the full resume ingestion pipeline:

  UploadFile  →  text extraction
              →  LangChain structured parse  (all 9 sections)
              →  per-section embedding  (Google gemini-embedding-001)
              →  full-resume embedding
              →  persist Resume + ResumeSection rows
              →  return ResumeUploadResponse

Also exposes attach_embedding_to_resume() for deferred
re-embedding (e.g. background worker).

experience_years changes:
  - upload_resume_internal(): computes total_experience_years(parsed) and
    passes it to bulk_create_resume_sections() — fixes the profile-page flow.
  - upload_resume_fast(): does NOT call bulk_create_resume_sections() —
    sections are written by the Celery task (process_resume_upload_task)
    which already has the fix applied.
  - parse_resume() is unchanged — returns ParsedResumeSchema with
    ExperienceEntry.years populated by LLM.
"""

from __future__ import annotations

from src.config.settings import settings
import json
import logging

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

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

log = logging.getLogger(__name__)

# ── singletons (initialised once at startup) ──────────────────────────────────
_parser   = LangChainResumeParser(settings.GROQ_API_KEY)
_embedder = ResumeSectionEmbedder()


# ═══════════════════════════════════════════════════════════════════════════════
# 2.  PARSE RESUME  (LangChain → structured schema)
# ═══════════════════════════════════════════════════════════════════════════════

async def parse_resume(raw_text: str) -> ParsedResumeSchema:
    """
    Calls the LangChain chain to extract all resume sections.
    Returns a ParsedResumeSchema Pydantic model.

    Each ExperienceEntry in the result carries a .years int field
    (populated by the LLM from the duration string, 0 if unknown).
    Call ResumeSectionEmbedder.total_experience_years(parsed) to get the total.
    """
    return await _parser.parse_async(raw_text)


# ═══════════════════════════════════════════════════════════════════════════════
# 3.  GENERATE RESUME EMBEDDING  (per-section + full)
# ═══════════════════════════════════════════════════════════════════════════════

async def generate_resume_embedding(
    parsed: ParsedResumeSchema,
) -> dict[str, list[float]]:
    """
    Returns {section_name: embedding_vector} for every non-empty section.
    """
    import asyncio
    return await asyncio.to_thread(_embedder.embed_all_sections, parsed)


# ═══════════════════════════════════════════════════════════════════════════════
# 4.  ATTACH EMBEDDING TO RESUME  (deferred / background worker)
# ═══════════════════════════════════════════════════════════════════════════════

async def attach_embedding_to_resume(
    db: AsyncSession,
    resume_id: int,
    embedding: list[float],
) -> None:
    """
    Stores the full-resume embedding on the Resume row.
    Called inline from upload_resume_internal() but can also be used by a
    background worker to re-embed without re-uploading the file.
    """
    resume = await get_resume(db, resume_id)
    if not resume:
        raise ValueError(f"Resume {resume_id} not found")

    resume.embedding = json.dumps(embedding)  # type: ignore[attr-defined]
    await db.commit()
    log.info(f"Embedding attached to resume {resume_id}")


# ═══════════════════════════════════════════════════════════════════════════════
# 5.  UPLOAD RESUME FROM APPLICATION  (internal → S3, fully synchronous)
#     Called from the profile page standalone upload flow.
# ═══════════════════════════════════════════════════════════════════════════════

async def upload_resume_internal(
    db: AsyncSession,
    candidate_id: int,
    file: UploadFile,
) -> dict:
    """
    Full synchronous pipeline for standalone resume upload (profile page):
      read bytes → S3 upload → extract text → LangChain parse → embed → persist

    experience_years is computed here from the LLM-parsed result and written
    to the experience ResumeSection row via bulk_create_resume_sections().
    """
    import asyncio

    file_bytes: bytes = await file.read()
    filename: str     = file.filename or "resume"

    # ── 1. extract raw text ───────────────────────────────────────────────────
    raw_text = ResumeFileExtractor.extract(file_bytes, filename)
    if not raw_text.strip():
        raise ValueError("Could not extract text from the uploaded file.")

    # ── 2. LangChain parse ────────────────────────────────────────────────────
    parsed: ParsedResumeSchema = await parse_resume(raw_text)

    # ── 3. compute experience_years from LLM output ───────────────────────────
    # Returns int (sum of ExperienceEntry.years) or None when LLM found no
    # usable durations → bulk_create_resume_sections leaves the column NULL
    # → scoring/sourcing falls back to regex automatically.
    experience_years = ResumeSectionEmbedder.total_experience_years(parsed)
    log.info(
        f"[upload_resume_internal] candidate_id={candidate_id} "
        f"experience_years={experience_years} "
        f"experience_entries={len(parsed.experience)}"
    )

    # ── 4. embed ──────────────────────────────────────────────────────────────
    section_embeddings = await generate_resume_embedding(parsed)
    full_embedding     = _embedder.embed_full_resume(parsed)

    # ── 5. version ────────────────────────────────────────────────────────────
    version = await get_next_version(db, candidate_id)

    # ── 6. upload to S3 ───────────────────────────────────────────────────────
    s3_key = await asyncio.to_thread(
        upload_resume_to_s3, file_bytes, filename, candidate_id, version
    )

    # ── 7. persist Resume row ─────────────────────────────────────────────────
    resume = await create_resume_from_upload(
        db,
        candidate_id=candidate_id,
        s3_key=s3_key,
        parsed_text=raw_text,
        version=version,
    )

    # ── 8. persist sections + experience_years ────────────────────────────────
    section_texts = ResumeSectionEmbedder.section_texts(parsed)
    sections = await bulk_create_resume_sections(
        db,
        resume_id=resume.id,
        sections=section_texts,
        section_embeddings=section_embeddings,
        experience_years=experience_years,   # ← fixed: was `experience_years | None`
    )

    # ── 9. attach full embedding ──────────────────────────────────────────────
    await attach_embedding_to_resume(db, resume.id, full_embedding)

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


# ═══════════════════════════════════════════════════════════════════════════════
# 6.  UPLOAD RESUME FAST  (thin intake for job application flow)
#     Called from apply_for_job_with_resume() — heavy work deferred to Celery.
# ═══════════════════════════════════════════════════════════════════════════════

async def upload_resume_fast(
    db: AsyncSession,
    candidate_id: int,
    file: UploadFile,
) -> dict:
    """
    Thin, non-blocking resume intake for job applications.

    Does the MINIMUM synchronous work needed to unblock the candidate:
      1. Read file bytes from the upload stream
      2. Extract raw text (CPU-only, no LLM, fast)
      3. Upload bytes to S3
      4. Persist a bare Resume row (no sections, no embedding yet)
      5. Return resume_id + raw_text so Celery task can pick them up

    The heavy work (LangChain parse → section rows → experience_years →
    full embedding) is dispatched as a Celery task by the caller
    (apply_for_job_with_resume → process_resume_upload_task).

    NOTE: bulk_create_resume_sections is NOT called here — sections including
    experience_years are written by process_resume_upload_task which has the
    experience_years fix applied.

    Returns
    -------
    dict with keys: resume_id, version, s3_key, raw_text
    """
    import asyncio

    file_bytes: bytes = await file.read()
    filename: str = file.filename or "resume"

    # ── 1. extract raw text (no LLM — fast) ──────────────────────────────────
    raw_text = ResumeFileExtractor.extract(file_bytes, filename)
    if not raw_text.strip():
        raise ValueError("Could not extract text from the uploaded file.")

    # ── 2. version + S3 upload ────────────────────────────────────────────────
    version = await get_next_version(db, candidate_id)
    s3_key = await asyncio.to_thread(
        upload_resume_to_s3, file_bytes, filename, candidate_id, version
    )

    # ── 3. persist bare Resume row (no sections, no embedding yet) ───────────
    resume = await create_resume_from_upload(
        db,
        candidate_id=candidate_id,
        s3_key=s3_key,
        parsed_text=raw_text,
        version=version,
    )

    log.info(
        f"[upload_resume_fast] resume_id={resume.id} v{version} "
        f"s3={s3_key} | parse+embed+experience_years deferred to Celery"
    )

    return {
        "resume_id": resume.id,
        "version":   version,
        "s3_key":    s3_key,
        "raw_text":  raw_text,
    }