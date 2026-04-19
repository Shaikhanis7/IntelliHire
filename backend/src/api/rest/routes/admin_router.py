"""
src/api/rest/routes/admin_router.py
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel, EmailStr
from typing import List

from src.api.rest.dependencies import require_admin
from src.core.services.auth_service import register_user
from src.core.exceptions.auth_exceptions import UserAlreadyExists
from src.data.clients.postgres_client import get_db
from src.data.models.postgres.user import User
from src.data.repositories.sourcing_repo import (
    get_all_sourcing_runs,
    get_sourcing_stats_by_recruiter,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Request / Response schemas ────────────────────────────────────────────────

class CreateRecruiterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class RecruiterResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str

    class Config:
        from_attributes = True


class SourcingRunItem(BaseModel):
    sourcing_id:   int
    job_id:        int | None
    role:          str
    status:        str
    triggered_by:  int | None
    total_checked: int
    total_sourced: int
    created_at:    str


class RecruiterStat(BaseModel):
    recruiter_id:   int
    recruiter_name: str
    total_runs:     int
    avg_sourced:    float
    failed_runs:    int
    last_active:    str | None


# ── Recruiter endpoints ───────────────────────────────────────────────────────

@router.post(
    "/recruiters",
    status_code=status.HTTP_201_CREATED,
    response_model=RecruiterResponse,
    summary="Create a recruiter account (admin only)",
)
async def create_recruiter(
    data: CreateRecruiterRequest,
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    try:
        user = await register_user(
            db,
            email=data.email,
            password=data.password,
            role="recruiter",
            name=data.name,
        )
        return RecruiterResponse(id=user.id, email=user.email, role=user.role, name=data.name)
    except UserAlreadyExists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )


@router.get(
    "/recruiters",
    response_model=List[RecruiterResponse],
    summary="List all recruiter accounts (admin only)",
)
async def list_recruiters(
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    result = await db.execute(
        select(User).where(User.role == "recruiter").order_by(User.id.desc())
    )
    users = result.scalars().all()
    return [
        RecruiterResponse(id=u.id, name=u.name, email=u.email, role=u.role)
        for u in users
    ]


@router.delete(
    "/recruiters/{recruiter_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a recruiter account (admin only)",
)
async def delete_recruiter(
    recruiter_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    result = await db.execute(select(User).where(User.id == recruiter_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recruiter not found.")
    if user.role != "recruiter":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The specified account is not a recruiter.")
    await db.delete(user)
    await db.commit()


# ── User endpoints ────────────────────────────────────────────────────────────

@router.get(
    "/users",
    response_model=List[RecruiterResponse],
    summary="List ALL platform users (admin only)",
)
async def list_all_users(
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    result = await db.execute(select(User).order_by(User.id.desc()))
    users = result.scalars().all()
    return [
        RecruiterResponse(id=u.id, name=u.name, email=u.email, role=u.role)
        for u in users
    ]


@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete any user account (admin only)",
)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    await db.delete(user)
    await db.commit()


# ── Sourcing admin endpoints ──────────────────────────────────────────────────

@router.get(
    "/sourcing/runs",
    response_model=list[SourcingRunItem],
    summary="List all sourcing runs across all jobs (admin only)",
)
async def get_all_runs(
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    rows = await get_all_sourcing_runs(db)
    return [
        SourcingRunItem(
            sourcing_id   = row.id,
            job_id        = row.job_id,
            role          = row.role,
            status        = row.status or "unknown",
            triggered_by  = row.triggered_by,
            total_checked = row.total_checked or 0,
            total_sourced = row.total_sourced or 0,
            created_at    = str(row.created_at),
        )
        for row in rows
    ]


@router.get(
    "/sourcing/recruiter-stats",
    response_model=list[RecruiterStat],
    summary="Per-recruiter sourcing stats (admin only)",
)
async def get_recruiter_stats(
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    rows = await get_sourcing_stats_by_recruiter(db)
    return [
        RecruiterStat(
            recruiter_id   = row["recruiter_id"],    # ← dict access, not attribute
            recruiter_name = row["recruiter_name"],
            total_runs     = row["total_runs"],
            avg_sourced    = row["avg_sourced"],
            failed_runs    = row["failed_runs"],
            last_active    = row["last_active"],
        )
        for row in rows
    ]