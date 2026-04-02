from sqlalchemy.ext.asyncio import AsyncSession
from src.data.models.postgres.sourcing import Sourcing


async def create_sourcing(
    db: AsyncSession,
    job_id: int,
    role: str,
    location: str,
) -> Sourcing:
    s = Sourcing(job_id=job_id, role=role, location=location)
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return s