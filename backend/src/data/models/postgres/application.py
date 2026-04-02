"""
src/data/models/postgres/application.py

Fixed Application model:
  - Scores stored as Float (0.0–1.0) to match service expectations
  - created_at / updated_at timestamps included
  - Proper relationships to Candidate and Job
  - status default = "pending"
"""

from datetime import datetime

from sqlalchemy import (
    Column, Integer, Float, String, DateTime, ForeignKey, func,
)
from sqlalchemy.orm import relationship

from .base import Base   # adjust import path to match your project layout


class Application(Base):
    __tablename__ = "applications"

    # ── Primary key ────────────────────────────────────────────────────────────
    id = Column(Integer, primary_key=True, index=True)

    # ── Foreign keys ───────────────────────────────────────────────────────────
    candidate_id = Column(
        Integer, ForeignKey("candidates.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    job_id = Column(
        Integer, ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    # ── Scores (0.0 – 1.0); service multiplies by 100 before sending to client)
    semantic_score = Column(Float, nullable=True, default=0.0)
    rule_score     = Column(Float, nullable=True, default=0.0)
    final_score    = Column(Float, nullable=True, default=0.0)

    # ── Status ─────────────────────────────────────────────────────────────────
    # valid values: pending | scored | shortlisted | rejected | hired
    status = Column(String(20), nullable=False, default="pending", index=True)

    # ── Timestamps ─────────────────────────────────────────────────────────────
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # ── Optional metadata ──────────────────────────────────────────────────────
    # Source URL if the application came from an external job board
    source_url = Column(String(512), nullable=True)

    # Cover letter or notes submitted by the candidate
    cover_letter = Column(String(4000), nullable=True)

    # ── ORM relationships ──────────────────────────────────────────────────────
    candidate = relationship(
        "Candidate",
        back_populates="applications",
        lazy="select",
    )
    job = relationship(
        "Job",
        back_populates="applications",
        lazy="select",
    )

    # ── Helpers ────────────────────────────────────────────────────────────────
    def __repr__(self) -> str:
        return (
            f"<Application id={self.id} job={self.job_id} "
            f"candidate={self.candidate_id} score={self.final_score:.2f} "
            f"status={self.status!r}>"
        )

    @property
    def final_score_pct(self) -> int:
        """Return final_score as a 0-100 integer (for display)."""
        return round((self.final_score or 0.0) * 100)