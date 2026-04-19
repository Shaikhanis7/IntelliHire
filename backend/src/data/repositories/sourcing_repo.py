# src/data/repositories/sourcing_repo.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import Integer, select
from src.data.models.postgres.sourcing import Sourcing
from src.data.models.postgres.source_candidates import SourcingCandidate


async def create_sourcing(
    db: AsyncSession,
    job_id: int,
    role: str,
    location: str,
    triggered_by: int | None = None,
) -> Sourcing:
    s = Sourcing(
        job_id       = job_id,
        role         = role,
        location     = location,
        triggered_by = triggered_by,
        status       = "running",
        total_checked = 0,
        total_sourced = 0,
    )
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return s


async def complete_sourcing(
    db: AsyncSession,
    sourcing_id: int,
    total_checked: int,
    total_sourced: int,
) -> None:
    sourcing = (await db.execute(
        select(Sourcing).where(Sourcing.id == sourcing_id)
    )).scalar_one_or_none()
    if sourcing:
        sourcing.status        = "completed"
        sourcing.total_checked = total_checked
        sourcing.total_sourced = total_sourced
        await db.commit()


async def fail_sourcing(
    db: AsyncSession,
    sourcing_id: int,
    total_checked: int = 0,
) -> None:
    sourcing = (await db.execute(
        select(Sourcing).where(Sourcing.id == sourcing_id)
    )).scalar_one_or_none()
    if sourcing:
        sourcing.status        = "failed"
        sourcing.total_checked = total_checked
        await db.commit()


async def get_all_sourcing_runs(db: AsyncSession) -> list[Sourcing]:
    """Admin: get all sourcing runs across all jobs and recruiters."""
    rows = (await db.execute(
        select(Sourcing).order_by(Sourcing.id.desc())
    )).scalars().all()
    return list(rows)


async def get_sourcing_stats_by_recruiter(db: AsyncSession) -> list[dict]:
    """Admin: aggregate stats per recruiter."""
    from sqlalchemy import func
    from src.data.models.postgres.user import User

    rows = (await db.execute(
        select(
            User.id,
            User.name,
            func.count(Sourcing.id).label("total_runs"),
            func.avg(Sourcing.total_sourced).label("avg_sourced"),
            func.sum(
                (Sourcing.status == "failed").cast(Integer)
            ).label("failed_runs"),
            func.max(Sourcing.created_at).label("last_active"),
        )
        .join(Sourcing, Sourcing.triggered_by == User.id, isouter=True)
        .group_by(User.id, User.name)
        .where(User.role == "recruiter")
        .order_by(func.count(Sourcing.id).desc())
    )).all()

    return [
        {
            "recruiter_id":  row.id,
            "recruiter_name": row.name,
            "total_runs":    row.total_runs or 0,
            "avg_sourced":   round(float(row.avg_sourced or 0), 1),
            "failed_runs":   int(row.failed_runs or 0),
            "last_active":   str(row.last_active) if row.last_active else None,
        }
        for row in rows
    ]