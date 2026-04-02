from fastapi import APIRouter, Depends, HTTPException , status 
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from src.core.services import job_service
from src.data.clients.postgres_client import get_db
from src.utils.security import get_current_user

router = APIRouter(prefix="/jobs", tags=["Jobs"])


class JobCreateRequest(BaseModel):
    title:               str
    description:         str
    skills_required:     list[str]
    experience_required: int = 0
    location:            Optional[str] = None


class JobUpdateRequest(BaseModel):
    title:               Optional[str] = None
    description:         Optional[str] = None
    skills_required:     Optional[list[str]] = None
    experience_required: Optional[int] = None
    location:            Optional[str] = None
    is_active:           Optional[bool] = None


# ── POST /jobs ────────────────────────────────────────────────────────────────
@router.post("/")
async def create_job(
    data: JobCreateRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user["role"] != "recruiter":
        raise HTTPException(403, "Recruiters only.")
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
    user=Depends(get_current_user),
):
    if user["role"] != "recruiter":
        raise HTTPException(403, "Recruiters only.")
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


@router.patch("/{job_id}/reopen")
async def reopen_job(
    job_id: int,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Reopen a closed job posting (set is_active = True).
    Only the recruiter who created the job can reopen it.
    """
    if user["role"] != "recruiter":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only recruiters can reopen jobs."
        )
    
    job = await job_service.reopen_job_posting(db, job_id, user["id"])
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found or you don't have permission to reopen it."
        )
    
    return job



@router.patch("/{job_id}/close")
async def close_job(
    job_id: int,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Close a job posting (set is_active = False).
    Only the recruiter who created the job can close it.
    """
    if user["role"] != "recruiter":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only recruiters can close jobs."
        )
    
    job = await job_service.close_job_posting(db, job_id, user["id"])
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found or you don't have permission to close it."
        )
    
    return job

# ── PATCH /jobs/{job_id} ──────────────────────────────────────────────────────
@router.patch("/{job_id}")
async def update_job(
    job_id: int,
    data: JobUpdateRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user["role"] != "recruiter":
        raise HTTPException(403, "Recruiters only.")
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
    user=Depends(get_current_user),
):
    if user["role"] != "recruiter":
        raise HTTPException(403, "Recruiters only.")
    from src.core.services.job_service import delete_job
    try:
        return await delete_job(db, job_id=job_id, recruiter_id=user["id"])
    except ValueError as e:
        raise HTTPException(404, str(e))
    
# In your jobs router file (e.g., src/api/routes/jobs.py)
