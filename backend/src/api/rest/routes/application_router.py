"""
src/api/routes/application_router.py
"""
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.services.application_service import (
    apply_for_job_with_resume,
    score_application,
    shortlist_job,
    get_job_applications,
    get_my_applications,
)
from src.data.repositories.candidate_repo import get_candidate_by_user_id
from src.data.clients.postgres_client import get_db
from src.utils.security import get_current_user

app_router = APIRouter(prefix="/applications", tags=["Applications"])


# ── POST /applications/apply/{job_id} ─────────────────────────────────────────
# Candidate applies — optionally uploads resume as multipart
@app_router.post("/apply/{job_id}")
async def apply(
    job_id: int,
    background_tasks: BackgroundTasks, 
    file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user["role"] != "candidate":
        raise HTTPException(403, "Only candidates can apply.")
    candidate = await get_candidate_by_user_id(db, user["id"])
    if not candidate:
        raise HTTPException(404, "Candidate profile not found.")
    return await apply_for_job_with_resume(
        db, candidate_id=candidate.id, job_id=job_id, file=file,
        background_tasks=background_tasks
    )


# ── GET /applications/mine ────────────────────────────────────────────────────
# Candidate views their own applications
@app_router.get("/mine")
async def my_applications(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user["role"] != "candidate":
        raise HTTPException(403, "Candidates only.")
    return await get_my_applications(db, candidate_id=user["id"])


# ── GET /applications/job/{job_id} ────────────────────────────────────────────
# Recruiter views all applicants for a job (ranked)
@app_router.get("/job/{job_id}")
async def job_applications(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user["role"] != "recruiter":
        raise HTTPException(403, "Recruiters only.")
    return await get_job_applications(db, job_id=job_id, recruiter_id=user["id"])


# ── POST /applications/score/{application_id} ─────────────────────────────────
# Manually re-score a single application
@app_router.post("/score/{application_id}")
async def rescore(
    application_id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user["role"] != "recruiter":
        raise HTTPException(403, "Recruiters only.")
    return await score_application(db, application_id)


# ── POST /applications/shortlist/{job_id} ────────────────────────────────────
# Recruiter triggers shortlisting — scores all pending, returns top N
@app_router.post("/shortlist/{job_id}")
async def shortlist(
    job_id: int,
    top_n: int = 10,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user["role"] != "recruiter":
        raise HTTPException(403, "Recruiters only.")
    return await shortlist_job(db, job_id=job_id, top_n=top_n)


# ── PATCH /applications/{application_id}/status ───────────────────────────────
# Recruiter updates application status (shortlisted / rejected / hired)
@app_router.patch("/{application_id}/status")
async def update_status(
    application_id: int,
    status: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user["role"] != "recruiter":
        raise HTTPException(403, "Recruiters only.")
    from src.core.services.application_service import update_application_status
    return await update_application_status(db, application_id, status)