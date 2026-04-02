
from src.core.services.candidate_service import create_candidate
from src.data.repositories.user_repo import get_user_by_email, create_user
from src.data.repositories.token_repo import (
    store_refresh_token,
    get_refresh_token,
    revoke_refresh_token,
)
from src.utils.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token_jwt,
    decode_token,
)
from src.core.exceptions.auth_exceptions import (
    UserAlreadyExists,
    InvalidCredentials,
    InvalidToken,
    UserNotFound,
)
 
 
async def register_user(db, email: str, password: str, role: str, name: str):
    existing = await get_user_by_email(db, email)
    if existing:
        # Message contains 'already' → frontend shows
        # "An account with this email already exists. Try signing in instead."
        raise UserAlreadyExists()
 
    user = await create_user(db, email, hash_password(password), role)
    if role == "candidate":
        await create_candidate(db, user.id, name)
    return user
 
 
async def login_user(db, email: str, password: str) -> dict:
    user = await get_user_by_email(db, email)
 
    if not user:
        # Message contains 'not found' → frontend shows
        # "No account found with this email address."
        raise UserNotFound()
 
    if not verify_password(password, user.password):
        # Message contains 'invalid' → frontend shows
        # "Incorrect email or password. Please try again."
        raise InvalidCredentials()
 
    access = create_access_token({
        "sub":  user.email,
        "id":   user.id,
        "role": user.role,
    })
    refresh = create_refresh_token_jwt({
        "sub": user.email,
        "id":  user.id,
    })
    await store_refresh_token(db, refresh, user.id)
 
    return {
        "access_token":  access,
        "refresh_token": refresh,
    }
 
 
async def refresh_token_service(db, old_token: str) -> dict:
    token_obj = await get_refresh_token(db, old_token)
    if not token_obj or token_obj.is_revoked:
        raise InvalidToken()
 
    payload = decode_token(old_token)
    await revoke_refresh_token(db, old_token)
 
    new_access = create_access_token({
        "sub": payload["sub"],
        "id":  payload["id"],
    })
    new_refresh = create_refresh_token_jwt({
        "sub": payload["sub"],
        "id":  payload["id"],
    })
    await store_refresh_token(db, new_refresh, payload["id"])
 
    return {
        "access_token":  new_access,
        "refresh_token": new_refresh,
    }
 
 
async def logout_user(db, token: str, user: dict) -> dict:
    await revoke_refresh_token(db, token)
    return {"message": "Logged out"}
 