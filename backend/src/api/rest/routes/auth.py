
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
 
from src.core.exceptions.auth_exceptions import (
    UserAlreadyExists,
    InvalidCredentials,
    InvalidToken,
    UserNotFound,
)
from src.schemas.auth_schema import (
    CandidateRegisterRequest,
    RegisterRequest,
    LoginRequest,
    RefreshRequest,
)
from src.core.services.auth_service import (
    register_user,
    login_user,
    refresh_token_service,
    logout_user,
)
from src.data.clients.postgres_client import get_db
from src.utils.security import security, get_current_user
 
router = APIRouter(tags=["Authentication"])
 
 
# ── POST /auth/register  (recruiter / admin) ──────────────────────────────────
@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    try:
        return await register_user(db, data.email, data.password, data.role, data.name)
    except UserAlreadyExists as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=exc.message,           # "An account with this email already exists."
        )
 
 
# ── POST /auth/register/candidate ─────────────────────────────────────────────
@router.post("/register/candidate", status_code=status.HTTP_201_CREATED)
async def register_candidate(
    data: CandidateRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        user = await register_user(
            db,
            email=data.email,
            password=data.password,
            role="candidate",
            name=data.name,
        )
    except UserAlreadyExists as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=exc.message,           # contains 'already' → correct frontend branch
        )
 
    tokens = await login_user(db, data.email, data.password)
    return {
        "user": {
            "id":    user.id,
            "email": user.email,
            "role":  user.role,
            "name":  data.name,
        },
        **tokens,
    }
 
 
# ── POST /auth/login ───────────────────────────────────────────────────────────
@router.post("/login")
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    try:
        return await login_user(db, data.email, data.password)
    except UserNotFound as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=exc.message,           # contains 'not found' → correct frontend branch
        )
    except InvalidCredentials as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=exc.message,           # contains 'invalid' → correct frontend branch
        )
 
 
# ── POST /auth/refresh ─────────────────────────────────────────────────────────
@router.post("/refresh")
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    try:
        return await refresh_token_service(db, data.refresh_token)
    except InvalidToken as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=exc.message,
        )
 
 
# ── GET /auth/me ───────────────────────────────────────────────────────────────
@router.get("/me")
async def get_me(user=Depends(get_current_user)):
    return {
        "id":    user["id"],
        "email": user["sub"],
        "role":  user["role"],
    }
 
 
# ── POST /auth/logout ──────────────────────────────────────────────────────────
@router.post("/logout")
async def logout(
    token=Depends(security),
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await logout_user(db, token.credentials, user)
    except InvalidToken as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=exc.message,
        )
 