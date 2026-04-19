"""
src/api/rest/routes/job.py
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.rest.dependencies import require_admin_or_recruiter
from src.core.services import job_service
from src.data.clients.postgres_client import get_db

router = APIRouter(prefix="/jobs", tags=["Jobs"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class JobCreateRequest(BaseModel):
    title:               str
    description:         str
    skills_required:     list[str]
    experience_required: int = 0
    location:            Optional[str] = None


class JobUpdateRequest(BaseModel):
    title:               Optional[str]       = None
    description:         Optional[str]       = None
    skills_required:     Optional[list[str]] = None
    experience_required: Optional[int]       = None
    location:            Optional[str]       = None
    is_active:           Optional[bool]      = None


class JDGenerateRequest(BaseModel):
    """Request body for AI JD generation."""
    title:            str
    skills:           list[str]       = []
    experience_years: int             = 0
    location:         Optional[str]   = None
    extra_context:    Optional[str]   = None   # free-text recruiter notes


class JDEnhanceRequest(BaseModel):
    """Request body for enhancing an existing description."""
    title:           str
    description:     str
    skills:          list[str] = []


class JDExtractSkillsRequest(BaseModel):
    """Request body for skills extraction from a free-text JD."""
    description: str


# ── JD GENERATION ROUTES ─────────────────────────────────────────────────────

@router.post("/generate-jd")
async def generate_jd(
    data: JDGenerateRequest,
    user: dict = Depends(require_admin_or_recruiter),
):
    """
    AI-powered JD generation.

    Given a job title + skills (+ optional context), returns a fully structured
    Job Description with sections, suggested skills, and a ready-to-use
    full_description string for the form textarea.

    This endpoint is stateless — it does NOT create a job posting.
    The recruiter reviews / edits the output, then submits via POST /jobs/.
    """
    return await job_service.generate_job_description(
        title            = data.title,
        skills           = data.skills,
        experience_years = data.experience_years,
        location         = data.location,
        extra_context    = data.extra_context,
    )


@router.post("/enhance-jd")
async def enhance_jd(
    data: JDEnhanceRequest,
    user: dict = Depends(require_admin_or_recruiter),
):
    """
    Enhance / rewrite a recruiter-drafted job description.

    Returns the improved description + suggested skills + a note on what changed.
    Stateless — does NOT touch the database.
    """
    return await job_service.enhance_job_description(
        title           = data.title,
        raw_description = data.description,
        skills          = data.skills,
    )


@router.post("/extract-skills")
async def extract_skills(
    data: JDExtractSkillsRequest,
    user: dict = Depends(require_admin_or_recruiter),
):
    """
    Extract skill names from a free-text job description.

    Returns a plain list of skill strings.
    Stateless — does NOT touch the database.
    """
    skills = await job_service.extract_skills_from_description(data.description)
    return {"skills": skills}


# ── POST /jobs ────────────────────────────────────────────────────────────────
@router.post("/")
async def create_job(
    data: JobCreateRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_admin_or_recruiter),
):
    from src.core.services.job_service import create_job_posting
    return await create_job_posting(db, recruiter_id=user["id"], **data.model_dump())


# ── GET /jobs ─────────────────────────────────────────────────────────────────
@router.get("/")
async def list_jobs(db: AsyncSession = Depends(get_db)):
    from src.core.services.job_service import list_active_jobs
    return await list_active_jobs(db)


# ── GET /jobs/mine ────────────────────────────────────────────────────────────
@router.get("/mine")
async def my_jobs(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_admin_or_recruiter),
):
    from src.core.services.job_service import list_jobs_by_recruiter
    return await list_jobs_by_recruiter(db, recruiter_id=user["id"])


# ── GET /jobs/{job_id} ────────────────────────────────────────────────────────
@router.get("/{job_id}")
async def get_job(job_id: int, db: AsyncSession = Depends(get_db)):
    from src.core.services.job_service import get_job_details, _serialize_job
    job = await get_job_details(db, job_id)
    if not job:
        raise HTTPException(404, "Job not found.")
    return _serialize_job(job)


# ── PATCH /jobs/{job_id}/reopen ───────────────────────────────────────────────
@router.patch("/{job_id}/reopen")
async def reopen_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_admin_or_recruiter),
):
    """Reopen a closed job posting."""
    job = await job_service.reopen_job_posting(db, job_id, user["id"])
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found or you don't have permission to reopen it.",
        )
    return job


# ── PATCH /jobs/{job_id}/close ────────────────────────────────────────────────
@router.patch("/{job_id}/close")
async def close_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_admin_or_recruiter),
):
    """Close a job posting."""
    job = await job_service.close_job_posting(db, job_id, user["id"])
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found or you don't have permission to close it.",
        )
    return job


# ── PATCH /jobs/{job_id} ──────────────────────────────────────────────────────
@router.patch("/{job_id}")
async def update_job(
    job_id: int,
    data: JobUpdateRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_admin_or_recruiter),
):
    from src.core.services.job_service import update_job
    try:
        return await update_job(
            db,
            job_id=job_id,
            recruiter_id=user["id"],
            **data.model_dump(exclude_none=True),
        )
    except ValueError as e:
        raise HTTPException(404, str(e))


# ── DELETE /jobs/{job_id} ─────────────────────────────────────────────────────
@router.delete("/{job_id}")
async def delete_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_admin_or_recruiter),
):
    from src.core.services.job_service import delete_job
    try:
        return await delete_job(db, job_id=job_id, recruiter_id=user["id"])
    except ValueError as e:
        raise HTTPException(404, str(e))