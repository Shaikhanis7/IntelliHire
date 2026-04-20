# src/data/models/postgres/sourcing.py
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base


class Sourcing(Base):
    __tablename__ = "sourcing"

    id            = Column(Integer, primary_key=True)
    job_id        = Column(Integer, ForeignKey("jobs.id"), nullable=True)
    role          = Column(String)
    location      = Column(String)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    # Admin monitoring columns
    triggered_by  = Column(Integer, ForeignKey("users.id"), nullable=True)
    status        = Column(String, default="running")   # running / completed / failed
    total_checked = Column(Integer, default=0)
    total_sourced = Column(Integer, default=0)

    job      = relationship("Job",  backref="sourcing_runs")
    trigger  = relationship("User", backref="sourcing_runs", foreign_keys=[triggered_by])