"""
src/data/repositories/application_repo.py

All DB operations for the Application model.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.data.models.postgres.application import Application


async def create_application(
    db: AsyncSession,
    candidate_id: int,
    job_id: int,
) -> Application:
    app = Application(
        candidate_id=candidate_id,
        job_id=job_id,
        status="pending",
        semantic_score=0,
        rule_score=0,
        final_score=0,
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)
    return app


async def get_application(
    db: AsyncSession, application_id: int
) -> Application | None:
    result = await db.execute(
        select(Application)
        .options(
            selectinload(Application.candidate),
            selectinload(Application.job),
        )
        .where(Application.id == application_id)
    )
    return result.scalar_one_or_none()


async def get_existing_application(
    db: AsyncSession, candidate_id: int, job_id: int
) -> Application | None:
    result = await db.execute(
        select(Application).where(
            Application.candidate_id == candidate_id,
            Application.job_id == job_id,
        )
    )
    return result.scalar_one_or_none()


async def list_applications_by_job(
    db: AsyncSession, job_id: int
) -> list[Application]:
    result = await db.execute(
        select(Application)
        .options(selectinload(Application.candidate))
        .where(Application.job_id == job_id)
        .order_by(Application.final_score.desc())
    )
    return list(result.scalars().all())


async def list_applications_by_candidate(
    db: AsyncSession, candidate_id: int
) -> list[Application]:
    result = await db.execute(
        select(Application)
        .options(selectinload(Application.job))
        .where(Application.candidate_id == candidate_id)
    )
    return list(result.scalars().all())


async def update_application_scores(
    db: AsyncSession,
    application_id: int,
    semantic_score: float,
    rule_score: float,
    final_score: float,
    status: str = "scored",
) -> Application | None:
    result = await db.execute(
        select(Application).where(Application.id == application_id)
    )
    app = result.scalar_one_or_none()
    if not app:
        return None

    app.semantic_score = round(semantic_score * 100)   # store as 0-100 int
    app.rule_score     = round(rule_score     * 100)
    app.final_score    = round(final_score    * 100)
    app.status         = status
    await db.commit()
    await db.refresh(app)
    return app


async def update_application_status(
    db: AsyncSession,
    application_id: int,
    status: str,
) -> Application | None:
    result = await db.execute(
        select(Application).where(Application.id == application_id)
    )
    app = result.scalar_one_or_none()
    if not app:
        return None
    app.status = status
    await db.commit()
    await db.refresh(app)
    return app


async def shortlist_top_n(
    db: AsyncSession, job_id: int, top_n: int = 10
) -> list[Application]:
    """Mark the top-N scored applications as shortlisted."""
    apps = await list_applications_by_job(db, job_id)
    for i, app in enumerate(apps):
        new_status = "shortlisted" if i < top_n else "rejected"
        await update_application_status(db, app.id, new_status)
    await db.commit()
    return apps[:top_n]