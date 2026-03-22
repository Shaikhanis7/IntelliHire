from fastapi import APIRouter, HTTPException
from src.schemas.user_schema import UserRequest
from src.core.security import hash_password, verify_password, create_token

router = APIRouter()

# temp DB (replace with real DB later)
fake_db = {}

@router.post("/register")
async def register(user: UserRequest):
    if user.email in fake_db:
        raise HTTPException(status_code=400, detail="User exists")

    fake_db[user.email] = hash_password(user.password)
    return {"message": "User registered"}

@router.post("/login")
async def login(user: UserRequest):
    if user.email not in fake_db:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(user.password, fake_db[user.email]):
        raise HTTPException(status_code=401, detail="Invalid password")

    token = create_token({"sub": user.email})
    return {"access_token": token}