from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr

from src.core.services.auth_service import register_user
from src.core.exceptions.auth_exceptions import UserAlreadyExists
from src.data.clients.postgres_client import get_db
from src.utils.security import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])


class CreateRecruiterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


def require_admin(user=Depends(get_current_user)):
    """Dependency — rejects anyone who isn't an admin."""
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return user


@router.post(
    "/recruiters",
    status_code=status.HTTP_201_CREATED,
    summary="Create a recruiter account (admin only)",
)
async def create_recruiter(
    data: CreateRecruiterRequest,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),   # enforces admin role
):
    try:
        user = await register_user(
            db,
            email=data.email,
            password=data.password,
            role="recruiter",
            name=data.name,
        )
        return {
            "id":    user.id,
            "email": user.email,
            "role":  user.role,
            "name":  data.name,
        }
    except UserAlreadyExists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )