"""
src/api/routes/sourcing_router.py
"""
from typing import Literal, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.data.clients.postgres_client import get_db
from src.utils.security import get_current_user

router = APIRouter(prefix="/sourcing", tags=["Sourcing"])


class SourcingRequest(BaseModel):
    job_id: int
    count:  int = 10
    mode:   Literal["internal", "external", "both"] = "both"


# ── GET /sourcing/history?job_id={job_id} ────────────────────────────────────
# Returns all past sourcing runs for a job, newest first.
# If no runs exist for job_id, returns: { "runs": [], "sourced": false }
@router.get("/history")
async def sourcing_history(
    job_id: Optional[int] = Query(None, description="Filter runs by job ID"),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user["role"] != "recruiter":
        raise HTTPException(403, "Recruiters only.")

    from src.core.services.sourcing_service import get_sourcing_history
    runs = await get_sourcing_history(db, job_id=job_id)

    return {
        "job_id":  job_id,
        "sourced": len(runs) > 0,
        "runs":    runs,
    }


# ── GET /sourcing/{sourcing_id}/candidates?job_id={job_id} ───────────────────
# Returns ranked candidates for a sourcing run.
# job_id is used for validation — ensures the sourcing run belongs to the job.
# Returns [] if the background task hasn't finished writing candidates yet.
@router.get("/{sourcing_id}/candidates")
async def sourcing_candidates(
    sourcing_id: int,
    job_id: Optional[int] = Query(None, description="Job ID for validation"),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user["role"] != "recruiter":
        raise HTTPException(403, "Recruiters only.")

    # Optional validation: ensure this sourcing run belongs to job_id
    if job_id is not None:
        from src.data.models.postgres.sourcing import Sourcing
        from sqlalchemy import select
        result = await db.execute(
            select(Sourcing).where(
                Sourcing.id == sourcing_id,
                Sourcing.job_id == job_id,
            )
        )
        run = result.scalar_one_or_none()
        if not run:
            raise HTTPException(
                404,
                f"Sourcing run #{sourcing_id} not found for job_id={job_id}."
            )

    from src.core.services.sourcing_service import get_sourcing_candidates
    candidates = await get_sourcing_candidates(db, sourcing_id)

    return {
        "sourcing_id": sourcing_id,
        "job_id":      job_id,
        "ready":       len(candidates) > 0,
        "total":       len(candidates),
        "candidates":  candidates,
    }


# ── POST /sourcing/apply ──────────────────────────────────────────────────────
# Manually applies a sourced candidate to a job (HR action).
class ApplyRequest(BaseModel):
    candidate_id: int
    job_id:       int

@router.post("/apply")
async def apply_sourced_candidate(
    data: ApplyRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user["role"] != "recruiter":
        raise HTTPException(403, "Recruiters only.")

    from src.core.services.application_service import apply_for_job_with_resume
    try:
        result = await apply_for_job_with_resume(
            db,
            candidate_id=data.candidate_id,
            job_id=data.job_id,
            file=None,
        )
        return {"status": "applied", "application": result}
    except Exception as e:
        raise HTTPException(400, str(e))


# ── GET /sourcing/by-job/{job_id} ─────────────────────────────────────────────
@router.get("/by-job/{job_id}")
async def sourcing_runs_for_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Returns all sourcing runs for a specific job, newest first.
    Each item contains sourcing_id, role, location, created_at.

    Response shape:
    {
        "job_id": 42,
        "sourced": true,
        "total_runs": 3,
        "runs": [
            {
                "sourcing_id": 7,
                "job_id": 42,
                "role": "Senior Python Developer",
                "location": "India",
                "created_at": "2024-01-15T10:30:00"
            },
            ...
        ]
    }
    """
    if user["role"] != "recruiter":
        raise HTTPException(403, "Recruiters only.")

    from src.data.models.postgres.sourcing import Sourcing
    from sqlalchemy import select

    result = await db.execute(
        select(Sourcing)
        .where(Sourcing.job_id == job_id)
        .order_by(Sourcing.id.desc())
    )
    runs = result.scalars().all()

    return {
        "job_id":     job_id,
        "sourced":    len(runs) > 0,
        "total_runs": len(runs),
        "runs": [
            {
                "sourcing_id": r.id,
                "job_id":      r.job_id,
                "role":        r.role,
                "location":    r.location,
                "created_at":  str(r.created_at),
            }
            for r in runs
        ],
    }


# ── POST /sourcing/source ─────────────────────────────────────────────────────
# Kicks off background task. Returns sourcing_id immediately.
# Frontend polls GET /sourcing/{sourcing_id}/candidates until data appears.
@router.post("/source")
async def source(
    data: SourcingRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user["role"] != "recruiter":
        raise HTTPException(403, "Recruiters only.")

    from src.core.services.job_service import get_job_details
    job = await get_job_details(db, data.job_id)
    if not job:
        raise HTTPException(404, f"Job {data.job_id} not found.")
    if not job.is_active:
        raise HTTPException(400, f"Job {data.job_id} is not active.")

    role    = job.title or ""
    skills  = [s.strip() for s in (job.skills_required or "").split(",") if s.strip()]
    min_exp = job.experience_required or 0

    if not role:
        raise HTTPException(400, "Job has no title — cannot source.")
    if not skills:
        raise HTTPException(400, "Job has no skills_required — cannot source.")

    from src.data.repositories.sourcing_repo import create_sourcing
    sourcing = await create_sourcing(db, data.job_id, role, job.location or "India")

    from src.core.tasks.sourcing_tasks import source_candidates_task
    background_tasks.add_task(
        source_candidates_task,
        data.job_id,
        role,
        skills,
        min_exp,
        data.count,
        data.mode,
        sourcing.id,
    )

    return {
        "sourcing_id": sourcing.id,
        "job_id":      data.job_id,
        "role":        role,
        "skills":      skills,
        "min_exp":     min_exp,
        "mode":        data.mode,
        "status":      "sourcing_in_progress",
        "note":        "Poll GET /sourcing/{sourcing_id}/candidates to check results.",
    }


# ── POST /sourcing/shortlist ──────────────────────────────────────────────────
class ShortlistRequest(BaseModel):
    candidate_id: int
    job_id:       int


@router.post("/shortlist")
async def shortlist_sourced_candidate(
    data: ShortlistRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user["role"] != "recruiter":
        raise HTTPException(403, "Recruiters only.")

    from src.data.models.postgres.application import Application
    from src.data.models.postgres.source_candidates import SourcingCandidate
    from sqlalchemy import select, update

    # 1. Upsert Application row
    result = await db.execute(
        select(Application).where(
            Application.candidate_id == data.candidate_id,
            Application.job_id == data.job_id,
        )
    )
    app = result.scalar_one_or_none()

    sc_result = await db.execute(
        select(SourcingCandidate)
        .where(SourcingCandidate.candidate_id == data.candidate_id)
        .order_by(SourcingCandidate.id.desc())
        .limit(1)
    )
    sourcing_candidate = sc_result.scalar_one_or_none()

    if app:
        app.status = "shortlisted"
    else:
        app = Application(
            candidate_id=data.candidate_id,
            job_id=data.job_id,
            status="shortlisted",
        )
        db.add(app)
        await db.flush()

    if sourcing_candidate:
        app.rule_score     = sourcing_candidate.rule_score
        app.semantic_score = sourcing_candidate.semantic_score
        app.final_score    = sourcing_candidate.final_score
        app.sourcing_rank  = sourcing_candidate.rank
        app.sourcing_score = sourcing_candidate.final_score
        app.sourcing_id    = sourcing_candidate.sourcing_id
        app.fit_summary    = sourcing_candidate.fit_summary
        app.source_tag     = "applied_shortlisted"
        app.source_url     = sourcing_candidate.source_url

    # 2. Update ALL SourcingCandidate rows for this candidate so every
    #    sourcing run's data reflects the shortlisted state on re-fetch.
    await db.execute(
        update(SourcingCandidate)
        .where(SourcingCandidate.candidate_id == data.candidate_id)
        .values(source_tag="applied_shortlisted")
    )

    await db.commit()
    return {
        "status":        "shortlisted",
        "candidate_id":  data.candidate_id,
        "job_id":        data.job_id,
        "scores_synced": sourcing_candidate is not None,
    }