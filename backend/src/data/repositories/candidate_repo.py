from src.data.models.postgres.candidate import Candidate

async def create_candidate(db, name, skills, sourcing_id):
    c = Candidate(name=name, skills=skills, sourcing_id=sourcing_id)
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return c


# candidate_repo.py

from sqlalchemy import select
from src.data.models.postgres.candidate import Candidate

async def get_candidate_by_user_id(db, user_id: int):
    result = await db.execute(
        select(Candidate).where(Candidate.user_id == user_id)
    )
    return result.scalar_one_or_none()