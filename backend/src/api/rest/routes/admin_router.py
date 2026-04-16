from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel, EmailStr
from typing import List

from src.core.services.auth_service import register_user
from src.core.exceptions.auth_exceptions import UserAlreadyExists
from src.data.clients.postgres_client import get_db
from src.data.models.postgres.user import User
from src.utils.security import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Request / Response schemas ───────────────────────────────────────────────

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


# ── Auth dependency ──────────────────────────────────────────────────────────

def require_admin(user=Depends(get_current_user)):
    """Dependency — rejects anyone who isn't an admin."""
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return user


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post(
    "/recruiters",
    status_code=status.HTTP_201_CREATED,
    response_model=RecruiterResponse,
    summary="Create a recruiter account (admin only)",
)
async def create_recruiter(
    data: CreateRecruiterRequest,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
):
    try:
        user = await register_user(
            db,
            email=data.email,
            password=data.password,
            role="recruiter",
            name=data.name,
        )
        return RecruiterResponse(
            id=user.id,
            email=user.email,
            role=user.role,
            name=data.name,
        )
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
    _admin=Depends(require_admin),
):
    """
    Returns all users with role='recruiter', ordered by id descending
    (most recently created first).
    """
    result = await db.execute(
        select(User)
        .where(User.role == "recruiter")
        .order_by(User.id.desc())
    )
    users = result.scalars().all()

    # User model stores the display name on the related Candidate profile.
    # We do a best-effort join here; fall back to email prefix if no profile.
    recruiters = []
    for u in users:
        # Try to get the recruiter's name from related candidate/recruiter profile
        # Adjust this if your name is stored differently (e.g. u.recruiter_profile.name)
        name = getattr(u, "name", None) or u.email.split("@")[0]
        recruiters.append(RecruiterResponse(id=u.id, name=name, email=u.email, role=u.role))

    return recruiters


@router.delete(
    "/recruiters/{recruiter_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a recruiter account (admin only)",
)
async def delete_recruiter(
    recruiter_id: int,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
):
    """
    Permanently deletes a recruiter account.
    Returns 404 if not found, 400 if the target is not a recruiter.
    """
    result = await db.execute(select(User).where(User.id == recruiter_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recruiter not found.",
        )

    if user.role != "recruiter":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The specified account is not a recruiter.",
        )

    await db.delete(user)
    await db.commit()
    # 204 No Content — no body returned