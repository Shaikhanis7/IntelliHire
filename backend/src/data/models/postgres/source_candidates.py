"""
src/data/models/postgres/sourcing_candidate.py

Stores ranked candidates per sourcing run.
One row per candidate per sourcing run — rank is job-specific.
The same candidate can be rank=1 for Job A and rank=5 for Job B.
"""
from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from .base import Base


class SourcingCandidate(Base):
    __tablename__ = "sourcing_candidates"

    id             = Column(Integer, primary_key=True)
    sourcing_id    = Column(Integer, ForeignKey("sourcing.id"),    nullable=False)
    candidate_id   = Column(Integer, ForeignKey("candidates.id"), nullable=False)

    rank           = Column(Integer)        # 1 = best for THIS job
    source_tag     = Column(String)         # applied_shortlisted / applied_pending / db_match / prev_sourced / external
    source_url     = Column(String,  nullable=True)
    fit_summary    = Column(Text,    nullable=True)
    quality_note   = Column(Text,    nullable=True)

    rule_score     = Column(Float, default=0.0)
    semantic_score = Column(Float, default=0.0)
    final_score    = Column(Float, default=0.0)

    sourcing  = relationship("Sourcing",  backref="sourcing_candidates")
    candidate = relationship("Candidate", backref="sourcing_candidates")