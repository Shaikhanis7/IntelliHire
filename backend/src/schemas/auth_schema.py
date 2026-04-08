from pydantic import BaseModel, EmailStr


class CandidateRegisterRequest(BaseModel):
    name:     str 
    email:    EmailStr
    password: str 
 

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str
class UserResponse(BaseModel):
    id: int
    email: str
    role: str

    class Config:
        from_attributes = True  # 🔥 for SQLAlchemy


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str


class MessageResponse(BaseModel):
    message: str