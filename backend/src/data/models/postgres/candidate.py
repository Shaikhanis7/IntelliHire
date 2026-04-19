# src/data/models/postgres/candidate.py
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base


class Candidate(Base):
    __tablename__ = "candidates"

    id      = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name    = Column(String)


    user         = relationship("User", back_populates="candidate")
    resumes      = relationship("Resume", back_populates="candidate")
    applications = relationship("Application", back_populates="candidate")