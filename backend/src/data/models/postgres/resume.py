# src/data/models/postgres/resume.py
from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base


class Resume(Base):
    __tablename__ = "resumes"

    id           = Column(Integer, primary_key=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"))
    s3_key       = Column(String, nullable=True)
    # REMOVED: s3_bucket — config belongs in settings
    source_url   = Column(String,  nullable=True)
    parsed_text  = Column(Text)
    version      = Column(Integer)
    embedding    = Column(Text, nullable=True)   # ADDED — was missing from model

    candidate = relationship("Candidate", back_populates="resumes")
    sections  = relationship("ResumeSection", back_populates="resume")