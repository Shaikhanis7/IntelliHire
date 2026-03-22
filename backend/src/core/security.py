from passlib.context import CryptContext
from jose import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
from src.config.settings import settings

# 🔥 Use Argon2
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

security = HTTPBearer()

# Hash password
def hash_password(password: str):
    return pwd_context.hash(password)

# Verify password
def verify_password(password: str, hashed: str):
    return pwd_context.verify(password, hashed)

# Create JWT token
def create_token(data: dict):
    return jwt.encode(data, settings.jwt_secret, algorithm="HS256")

# Protected route dependency
def get_current_user(token=Depends(security)):
    try:
        payload = jwt.decode(token.credentials, settings.jwt_secret, algorithms=["HS256"])
        return payload["sub"]
    except:
        raise HTTPException(status_code=401, detail="Invalid token")