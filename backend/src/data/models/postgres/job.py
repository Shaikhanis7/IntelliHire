from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base


class Job(Base):
    __tablename__ = "jobs"

    id                  = Column(Integer, primary_key=True)
    recruiter_id        = Column(Integer, ForeignKey("users.id"))
    title               = Column(String)
    description         = Column(Text)
    skills_required     = Column(String)
    experience_required = Column(Integer, default=0)
    location            = Column(String, nullable=True)
    is_active           = Column(Boolean, default=True)
    embedding           = Column(Text, nullable=True)   # JSON serialised vector

    # ── Timestamps ─────────────────────────────────────────────────────────────
    # server_default=func.now() means the DB sets this on INSERT automatically.
    # onupdate=func.now() keeps updated_at fresh on every UPDATE.
    created_at  = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at  = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # relationships
    recruiter    = relationship("User", back_populates="jobs")
    applications = relationship("Application", back_populates="job")