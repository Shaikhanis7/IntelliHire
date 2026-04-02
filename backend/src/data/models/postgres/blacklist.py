from sqlalchemy import Column, Integer, String
from .base import Base

class Blacklist(Base):
    __tablename__ = "blacklist"

    id = Column(Integer, primary_key=True)
    url = Column(String, unique=True)
    reason = Column(String)