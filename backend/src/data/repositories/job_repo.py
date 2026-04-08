from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.data.models.postgres.job import Job


async def create_job(
    db: AsyncSession,
    recruiter_id: int,
    title: str,
    description: str,
    skills_required: str,
    experience_required: int = 0,
    location: str | None = None,
) -> Job:
    job = Job(
        recruiter_id=recruiter_id,
        title=title,
        description=description,
        skills_required=skills_required,
        experience_required=experience_required,
        location=location,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job


async def get_job_by_id(db: AsyncSession, job_id: int) -> Job | None:
    result = await db.execute(select(Job).where(Job.id == job_id))
    return result.scalar_one_or_none()


async def get_all_jobs(db: AsyncSession) -> list[Job]:
    result = await db.execute(select(Job))
    return result.scalars().all()


async def get_jobs_by_recruiter(db: AsyncSession, recruiter_id: int) -> list[Job]:
    result = await db.execute(
        select(Job).where(Job.recruiter_id == recruiter_id)
    )
    return result.scalars().all()


async def update_job(
    db: AsyncSession,
    job_id: int,
    recruiter_id: int,
    **kwargs,
) -> Job | None:
    result = await db.execute(
        select(Job).where(Job.id == job_id)
        # select(Job).where(Job.id == job_id, Job.recruiter_id == recruiter_id)
    )
    job = result.scalar_one_or_none()
    if not job:
        return None

    for key, value in kwargs.items():
        if key == "skills_required" and isinstance(value, list):
            value = ", ".join(value)
        setattr(job, key, value)

    await db.commit()
    await db.refresh(job)
    return job


async def delete_job(
    db: AsyncSession,
    job_id: int,
    recruiter_id: int,
) -> bool:
    result = await db.execute(
        select(Job).where(Job.id == job_id)
        # select(Job).where(Job.id == job_id, Job.recruiter_id == recruiter_id)
    )
    job = result.scalar_one_or_none()
    if not job:
        return False

    await db.delete(job)
    await db.commit()
    return True