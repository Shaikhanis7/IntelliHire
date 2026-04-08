from sqlalchemy import Column, Integer, LargeBinary, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"))

     # ── S3 storage (replaces LargeBinary file_data) ───────────────────────────
    s3_key       = Column(String, nullable=True)   # e.g. resumes/42/v1_abc.pdf
    s3_bucket    = Column(String, nullable=True)   # snapshot of bucket name
    
    source_url = Column(String, nullable=True)       # external

    parsed_text = Column(Text)
    version = Column(Integer)

    candidate = relationship("Candidate", back_populates="resumes")
    sections = relationship("ResumeSection", back_populates="resume")