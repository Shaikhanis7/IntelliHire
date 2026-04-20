import json
import logging
import asyncio

import numpy as np
from sqlalchemy.ext.asyncio import AsyncSession

from src.data.models.postgres.job import Job
from src.data.repositories.job_repo import (
    create_job,
    get_job_by_id,
    get_all_jobs,
    get_jobs_by_recruiter,
    update_job as repo_update_job,
    delete_job as repo_delete_job,
)

from src.observability.logging.logger import setup_logger
log = setup_logger()
from src.core.services.resume_langchain_service import ResumeSectionEmbedder
_embedder = ResumeSectionEmbedder()

# ── JD Generation Agent (lazy-imported to keep startup fast) ─────────────────
_jd_agent = None

def _get_jd_agent():
    global _jd_agent
    if _jd_agent is None:
        from src.control.agents.jd_generation_agent import JDGenerationAgent
        _jd_agent = JDGenerationAgent()
    return _jd_agent


# ═══════════════════════════════════════════════════════════════════════════════
# 0.  JD GENERATION  (AI-powered)
# ═══════════════════════════════════════════════════════════════════════════════

async def generate_job_description(
    title: str,
    skills: list[str],
    experience_years: int = 0,
    location: str | None = None,
    extra_context: str | None = None,
) -> dict:
    """
    Call the JDGenerationAgent to produce a full structured JD.

    This is a stateless helper — it does NOT touch the database.
    The frontend can call this on-the-fly while filling the job form,
    then submit the finalized data via create_job_posting().

    Returns the GeneratedJD as a plain dict ready for JSON serialisation.
    """
    agent = _get_jd_agent()
    jd    = await agent.generate_jd(
        title            = title,
        skills           = skills,
        experience_years = experience_years,
        location         = location,
        extra_context    = extra_context,
    )
    log.info(
        f"[job_service] generate_job_description | title='{title}' "
        f"skills={len(skills)} suggested_skills={len(jd.suggested_skills)}"
    )
    return jd.model_dump()


async def enhance_job_description(
    title: str,
    raw_description: str,
    skills: list[str],
) -> dict:
    """
    Enhance / rewrite a recruiter-drafted description via the JDGenerationAgent.

    Returns EnhancedJD as a plain dict.
    """
    agent  = _get_jd_agent()
    result = await agent.enhance_jd(
        title           = title,
        raw_description = raw_description,
        skills          = skills,
    )
    log.info(f"[job_service] enhance_job_description | title='{title}'")
    return result.model_dump()


async def extract_skills_from_description(description: str) -> list[str]:
    """
    Extract skill names from a free-text job description.
    Returns a plain list of strings.
    """
    agent  = _get_jd_agent()
    skills = await agent.extract_skills_from_jd(description)
    log.info(f"[job_service] extract_skills_from_description → {skills}")
    return skills


# ═══════════════════════════════════════════════════════════════════════════════
# 1.  CREATE
# ═══════════════════════════════════════════════════════════════════════════════

async def create_job_posting(
    db: AsyncSession,
    recruiter_id: int,
    title: str,
    description: str,
    skills_required: list[str],
    experience_required: int = 0,
    location: str | None = None,
) -> dict:
    job = await create_job(
        db,
        recruiter_id=recruiter_id,
        title=title,
        description=description,
        skills_required=", ".join(skills_required),
        experience_required=experience_required,
        location=location,
    )

    # embed immediately so scoring never embeds on the fly
    await _attach_job_embedding(db, job)

    # ✅ FIX: refresh after the commit inside _attach_job_embedding so that
    # all columns (including created_at / updated_at) are eagerly re-loaded
    # into the ORM instance before _serialize_job (a sync fn) touches them.
    # Without this, SQLAlchemy tries to lazy-load expired attributes outside
    # the async greenlet and raises MissingGreenlet.
    await db.refresh(job)

    log.info(f"Job {job.id} created and embedded for recruiter {recruiter_id}")
    return _serialize_job(job)


# ═══════════════════════════════════════════════════════════════════════════════
# 2.  READ
# ═══════════════════════════════════════════════════════════════════════════════

async def get_job_details(db: AsyncSession, job_id: int) -> Job | None:
    return await get_job_by_id(db, job_id)


async def list_active_jobs(db: AsyncSession) -> list[dict]:
    jobs = await get_all_jobs(db)
    return [_serialize_job(j) for j in jobs]


async def list_jobs_by_recruiter(db: AsyncSession, recruiter_id: int) -> list[dict]:
    jobs = await get_jobs_by_recruiter(db, recruiter_id)
    return [_serialize_job(j) for j in jobs]


# ═══════════════════════════════════════════════════════════════════════════════
# 3.  UPDATE
# ═══════════════════════════════════════════════════════════════════════════════

async def update_job(
    db: AsyncSession,
    job_id: int,
    recruiter_id: int,
    **kwargs,
) -> dict:
    job = await repo_update_job(db, job_id, recruiter_id, **kwargs)
    if not job:
        raise ValueError("Job not found or not authorized.")

    # re-embed if content changed
    if any(k in kwargs for k in ("title", "description", "skills_required")):
        await _attach_job_embedding(db, job)

    # ✅ FIX: same reason as in create_job_posting — reload expired attrs
    await db.refresh(job)

    return _serialize_job(job)


# ═══════════════════════════════════════════════════════════════════════════════
# 4.  DELETE
# ═══════════════════════════════════════════════════════════════════════════════

async def delete_job(
    db: AsyncSession,
    job_id: int,
    recruiter_id: int,
) -> dict:
    deleted = await repo_delete_job(db, job_id, recruiter_id)
    if not deleted:
        raise ValueError("Job not found or not authorized.")
    return {"job_id": job_id, "deleted": True}


# ═══════════════════════════════════════════════════════════════════════════════
# 5.  EMBEDDING HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

async def _attach_job_embedding(db: AsyncSession, job: Job) -> None:
    """
    Embed the job text and persist it.

    NOTE: this function calls db.commit() which marks every attribute on `job`
    as expired (SQLAlchemy default: expire_on_commit=True).  Callers MUST call
    `await db.refresh(job)` after this function returns if they intend to access
    any job attribute afterwards in a sync context (e.g. _serialize_job).
    """
    job_text = _job_text(job)
    try:
        vec: list[float] = await asyncio.to_thread(_embedder.embed_query, job_text)
        job.embedding = json.dumps(vec)
        await db.commit()
        await db.refresh(job)
        log.info(f"Job {job.id} embedding stored ({len(vec)} dims)")
    except Exception as exc:
        log.error(f"Job {job.id} embedding failed: {exc}")


def _job_text(job: Job) -> str:
    parts = [
        job.title or "",
        job.description or "",
        job.skills_required or "",
    ]
    return " ".join(p for p in parts if p).strip()


def load_job_vector(job: Job) -> "np.ndarray | None":
    raw = getattr(job, "embedding", None)
    if not raw:
        return None
    try:
        data = json.loads(raw) if isinstance(raw, str) else raw
        return np.array(data, dtype=np.float32)
    except Exception:
        return None


# ═══════════════════════════════════════════════════════════════════════════════
# 6.  SERIALIZER
# ═══════════════════════════════════════════════════════════════════════════════

def _serialize_job(job: Job) -> dict:
    """
    Pure sync serialiser — must only be called AFTER all commits and refreshes
    are done, so every attribute is already in memory with no lazy-load needed.
    """
    created_at = getattr(job, "created_at", None)
    updated_at = getattr(job, "updated_at", None)

    return {
        "id":                  job.id,
        "recruiter_id":        job.recruiter_id,
        "title":               job.title,
        "description":         job.description,
        "skills_required":     job.skills_required,
        "experience_required": job.experience_required,
        "location":            job.location,
        "is_active":           job.is_active,
        "created_at":          created_at.isoformat() if created_at else None,
        "updated_at":          updated_at.isoformat() if updated_at else None,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 7.  CLOSE / REOPEN
# ═══════════════════════════════════════════════════════════════════════════════

async def close_job_posting(
    db: AsyncSession,
    job_id: int,
    recruiter_id: int,
) -> dict:
    """
    Close a job posting (set is_active = False).
    Returns the updated job or None if not found/unauthorized.
    """
    job = await get_job_by_id(db, job_id)

    job.is_active = False
    await db.commit()
    await db.refresh(job)

    log.info(f"Job {job_id} closed by recruiter {recruiter_id}")
    return _serialize_job(job)


async def reopen_job_posting(
    db: AsyncSession,
    job_id: int,
    recruiter_id: int,
) -> dict:
    """
    Reopen a closed job posting (set is_active = True).
    Returns the updated job or None if not found/unauthorized.
    """
    job = await get_job_by_id(db, job_id)

    job.is_active = True
    await db.commit()
    await db.refresh(job)

    log.info(f"Job {job_id} reopened by recruiter {recruiter_id}")
    return _serialize_job(job)