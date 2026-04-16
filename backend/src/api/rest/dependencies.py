"""
src/api/rest/dependencies.py

Reusable FastAPI dependencies for role-based access control.
Inject these instead of writing inline `if user["role"] != ...` checks.
"""
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.data.clients.postgres_client import get_db
from src.utils.security import get_current_user


# ── Role guard dependencies ───────────────────────────────────────────────────

def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """Allow only admin users through."""
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return user


def require_recruiter(user: dict = Depends(get_current_user)) -> dict:
    """Allow only recruiter users through."""
    if user.get("role") != "recruiter":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Recruiter access required.",
        )
    return user


def require_candidate(user: dict = Depends(get_current_user)) -> dict:
    """Allow only candidate users through."""
    if user.get("role") != "candidate":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Candidate access required.",
        )
    return user


# ── Multi-role guards ─────────────────────────────────────────────────────────

def require_admin_or_recruiter(user: dict = Depends(get_current_user)) -> dict:
    """Allow admin or recruiter users through."""
    if user.get("role") not in {"admin", "recruiter"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or recruiter access required.",
        )
    return user