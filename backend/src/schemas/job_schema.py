from pydantic import BaseModel


# 🔥 Create Job Request
class JobCreate(BaseModel):
    title: str
    description: str
    skills_required: str
    experience_required: int


# 🔥 Response Schema
class JobResponse(BaseModel):
    id: int
    recruiter_id: int
    title: str
    description: str
    skills_required: str
    experience_required: int

    class Config:
        from_attributes = True