"""
src/api/routes/resume_router.py
"""
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.services.resume_service import upload_resume_internal
from src.data.clients.postgres_client import get_db
from src.data.clients.s3_client import get_presigned_url
from src.data.repositories.candidate_repo import get_candidate_by_user_id
from src.data.repositories.resume_repo import get_latest_resume, get_resumes_by_candidate
from src.utils.security import get_current_user

router = APIRouter(prefix="/resumes", tags=["Resumes"])


# ── POST /resumes/upload ──────────────────────────────────────────────────────
# Standalone resume upload (not tied to a specific job application)
@router.post("/upload")
async def upload(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user["role"] != "candidate":
        raise HTTPException(403, "Only candidates can upload resumes.")
    candidate = await get_candidate_by_user_id(db, user["id"])
    if not candidate:
        raise HTTPException(404, "Candidate profile not found.")
    return await upload_resume_internal(db, candidate_id=candidate.id, file=file)


# ── GET /resumes/me ───────────────────────────────────────────────────────────
# Candidate views all their resume versions
@router.get("/me")
async def my_resumes(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user["role"] != "candidate":
        raise HTTPException(403, "Candidates only.")
    candidate = await get_candidate_by_user_id(db, user["id"])
    if not candidate:
        raise HTTPException(404, "Candidate profile not found.")
    resumes = await get_resumes_by_candidate(db, candidate.id)
    return [
        {
            "resume_id": r.id,
            "version":   r.version,
            "s3_key":    r.s3_key,
            "source_url": r.source_url,
        }
        for r in resumes
    ]


# ── GET /resumes/download ─────────────────────────────────────────────────────
# Returns a presigned S3 URL for the candidate's latest resume
@router.get("/download")
async def download_resume(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    candidate = await get_candidate_by_user_id(db, user["id"])
    if not candidate:
        raise HTTPException(404, "Candidate profile not found.")
    resume = await get_latest_resume(db, candidate.id)
    if not resume or not resume.s3_key:
        raise HTTPException(404, "No resume on file.")
    url = get_presigned_url(resume.s3_key)
    if not url:
        raise HTTPException(500, "Could not generate download link.")
    return {"download_url": url}


# ── GET /resumes/candidate/{candidate_id}/download ────────────────────────────
# Recruiter fetches a download link for any candidate's latest resume.
# Internal (S3-uploaded) resumes return a short-lived presigned URL.
# Externally-scraped resumes (no s3_key) return the source_url directly.
@router.get("/candidate/{candidate_id}/download")
async def download_candidate_resume(
    candidate_id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user["role"] not in ("recruiter", "admin"):
        raise HTTPException(403, "Recruiters only.")
    resume = await get_latest_resume(db, candidate_id)
    if not resume:
        raise HTTPException(404, "No resume on file for this candidate.")
    # Internal upload → presigned S3 URL
    if resume.s3_key:
        url = get_presigned_url(resume.s3_key)
        if not url:
            raise HTTPException(500, "Could not generate download link.")
        return {"download_url": url, "type": "s3"}
    # Externally scraped → the source_url is the original profile/resume page
    if resume.source_url:
        return {"download_url": resume.source_url, "type": "external"}
    raise HTTPException(404, "No downloadable resume found for this candidate.")


# ── GET /resumes/{resume_id}/sections ────────────────────────────────────────
# Recruiter or candidate views parsed sections of a specific resume
@router.get("/{resume_id}/sections")
async def resume_sections(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    from src.data.repositories.resume_repo import get_sections_by_resume
    sections = await get_sections_by_resume(db, resume_id)
    return [
        {
            "section_type": s.section_type,
            "content":      s.content,
        }
        for s in sections
    ]