

from src.data.models.postgres.candidate import Candidate


async def create_candidate(db, user_id, name):

    candidate = Candidate(
        user_id=user_id,
        name=name,
        skills=""
    )

    db.add(candidate)
    await db.commit()
    await db.refresh(candidate)

    return candidate