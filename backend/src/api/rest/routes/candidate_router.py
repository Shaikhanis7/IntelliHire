"""
src/api/routes/candidate_router.py
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from src.data.clients.postgres_client import get_db
from src.utils.security import get_current_user

router = APIRouter(prefix="/candidates", tags=["Candidates"])


class CandidateProfileRequest(BaseModel):
    name:     str
    skills:   Optional[str] = None
    location: Optional[str] = None


# ── POST /candidates/profile ──────────────────────────────────────────────────
# Candidate creates their profile after registration
@router.post("/profile")
async def create_profile(
    data: CandidateProfileRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user["role"] != "candidate":
        raise HTTPException(403, "Candidates only.")
    from src.core.services.candidate_service import create_candidate_profile
    return await create_candidate_profile(db, user_id=user["id"], **data.model_dump())


# ── GET /candidates/me ────────────────────────────────────────────────────────
@router.get("/me")
async def my_profile(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user["role"] != "candidate":
        raise HTTPException(403, "Candidates only.")
    from src.data.repositories.candidate_repo import get_candidate_by_user_id
    candidate = await get_candidate_by_user_id(db, user["id"])
    if not candidate:
        raise HTTPException(404, "Profile not found.")
    return candidate


# ── PATCH /candidates/me ──────────────────────────────────────────────────────
@router.patch("/me")
async def update_profile(
    data: CandidateProfileRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user["role"] != "candidate":
        raise HTTPException(403, "Candidates only.")
    from src.core.services.candidate_service import update_candidate_profile
    return await update_candidate_profile(db, user_id=user["id"], **data.model_dump(exclude_none=True))


# ── GET /candidates/{candidate_id} ───────────────────────────────────────────
# Recruiter views a specific candidate profile
@router.get("/{candidate_id}")
async def get_candidate(
    candidate_id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user["role"] != "recruiter":
        raise HTTPException(403, "Recruiters only.")
    from src.data.repositories.candidate_repo import get_candidate_by_id
    candidate = await get_candidate_by_id(db, candidate_id)
    if not candidate:
        raise HTTPException(404, "Candidate not found.")
    return candidate