from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base


class Sourcing(Base):
    __tablename__ = "sourcing"

    id         = Column(Integer, primary_key=True)
    job_id     = Column(Integer, ForeignKey("jobs.id"), nullable=True)  # ← added
    role       = Column(String)
    location   = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    job = relationship("Job", backref="sourcing_runs")