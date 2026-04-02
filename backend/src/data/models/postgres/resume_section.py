"""
src/data/models/postgres/resume_section.py

ResumeSection model.

Changes:
  - Added `experience_years` (Integer, nullable) — populated only for
    section_type == "experience". Stores the LLM-extracted total years of
    experience as a strict integer. NULL means not yet computed (legacy rows
    or external-scrape candidates before their sections are processed).

Migration:
    ALTER TABLE resume_sections ADD COLUMN experience_years INTEGER;
"""

from sqlalchemy import Column, ForeignKey, Integer, String, Text
from .base import Base
from sqlalchemy.orm import relationship


class ResumeSection(Base):
    __tablename__ = "resume_sections"

    id           = Column(Integer, primary_key=True)
    resume_id    = Column(Integer, ForeignKey("resumes.id"))

    section_type = Column(String)
    content      = Column(Text)
    embedding    = Column(Text)

    # Strict integer years of experience — only set for section_type == "experience".
    # LLM-extracted via ExperienceEntry.years; summed across all roles.
    # NULL  → not yet computed; callers fall back to regex on parsed_text.
    # 0     → LLM found experience entries but couldn't determine duration.
    experience_years = Column(Integer, nullable=True)

    resume = relationship("Resume", back_populates="sections")