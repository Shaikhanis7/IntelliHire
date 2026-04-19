from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from .base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True)
    password = Column(String)
    name = Column(String)

    role = Column(String)
    is_active = Column(Boolean, default=True)

    candidate = relationship("Candidate", back_populates="user", uselist=False)
    jobs = relationship("Job", back_populates="recruiter")
    tokens = relationship("RefreshToken", back_populates="user")