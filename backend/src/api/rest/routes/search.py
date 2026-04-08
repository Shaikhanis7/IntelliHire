


from select import select

from fastapi import APIRouter, Depends

from src.data.models.postgres.candidate import Candidate
from src.data.models.postgres.sourcing import Sourcing
from src.data.clients.postgres_client import get_db
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()
@router.get("/search")
async def search(role: str, db: AsyncSession = Depends(get_db)):

    # 🔥 Step 1: get sourcing
    result = await db.execute(
        select(Sourcing).where(Sourcing.role == role)
    )
    sourcing = result.scalar_one_or_none()

    if not sourcing:
        return []

    # 🔥 Step 2: get candidates
    result = await db.execute(
        select(Candidate).where(Candidate.sourcing_id == sourcing.id)
    )
    candidates = result.scalars().all()

    return candidates