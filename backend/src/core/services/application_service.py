"""
src/core/services/application_service.py

Changes in this version:
  - Celery removed: process_resume_upload_task.delay() replaced with
    background_tasks.add_task(process_resume_upload, ...) using FastAPI
    BackgroundTasks.  apply_for_job_with_resume() now accepts a
    ``background_tasks: BackgroundTasks`` parameter which the router must
    supply (it is available for free on every FastAPI endpoint).
  - get_job_applications() returns sourcing_rank, sourcing_score, sourcing_id,
    fit_summary, source_tag on every application row (all via getattr so they
    are safe even before the migration runs)
  - sync_sourcing_scores_to_applications() unchanged
  - _serialize_application() (candidate view) unchanged
  - All scores stored as 0.0-1.0 in DB; multiplied ×100 once at the boundary

  experience_years:
  - _compute_rule_score() reads experience_years from the ResumeSection column
    (LLM int) when available; falls back to _infer_experience_years() regex
    when NULL (legacy rows or unprocessed external candidates).
"""

from __future__ import annotations

import json
import logging
import re
from typing import Optional

import numpy as np
from fastapi import BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.data.repositories.candidate_repo import get_candidate_by_user_id
from src.data.repositories.application_repo import (
    create_application,
    get_application,
    get_existing_application,
    list_applications_by_job,
    list_applications_by_candidate,
    update_application_scores,
    shortlist_top_n,
)
from src.core.services.job_service import get_job_details, load_job_vector, _job_text
from src.data.repositories.resume_repo import get_latest_resume, get_sections_by_resume
from src.core.exceptions.application_exceptions import (
    AlreadyApplied,
    JobNotFound,
    NoResumeFound,
    ApplicationNotFound,
    NotAuthorized,
)

from src.observability.logging.logger import setup_logger
log = setup_logger()

from src.core.services.resume_langchain_service import ResumeSectionEmbedder
_embedder = ResumeSectionEmbedder()

W_SEMANTIC = 0.55
W_RULE     = 0.45


# ═══════════════════════════════════════════════════════════════════════════════
# 1.  GET JOB APPLICATIONS  (recruiter view, ranked)
# ═══════════════════════════════════════════════════════════════════════════════

async def get_job_applications(
    db: AsyncSession,
    job_id: int,
    recruiter_id: int,
) -> list[dict]:
    from src.data.models.postgres.candidate import Candidate
    from src.data.models.postgres.user import User

    job = await get_job_details(db, job_id)
    if not job:
        raise JobNotFound()

    apps = await list_applications_by_job(db, job_id)

    result = []
    for app in apps:
        cand_res  = await db.execute(select(Candidate).where(Candidate.id == app.candidate_id))
        candidate = cand_res.scalar_one_or_none()

        user_email = None
        if candidate:
            user_res   = await db.execute(select(User).where(User.id == candidate.user_id))
            user       = user_res.scalar_one_or_none()
            user_email = user.email if user else None

        # Scores: DB stores 0.0-1.0, send 0-100 to frontend — multiply ONCE here
        semantic_pct = round((app.semantic_score or 0.0) * 100, 1)
        rule_pct     = round((app.rule_score     or 0.0) * 100, 1)
        final_pct    = round((app.final_score    or 0.0) * 100, 1)

        created_str = app.created_at.isoformat() if app.created_at else None

        result.append({
            "id":             app.id,
            "candidate_id":   app.candidate_id,
            "job_id":         app.job_id,
            "semantic_score": semantic_pct,
            "rule_score":     rule_pct,
            "final_score":    final_pct,
            "status":         app.status or "pending",
            "created_at":     created_str,

            # ── sourcing fields — safe with getattr before migration ──────────
            "sourcing_rank":  getattr(app, "sourcing_rank",  None),
            "sourcing_score": getattr(app, "sourcing_score", None),
            "sourcing_id":    getattr(app, "sourcing_id",    None),
            "fit_summary":    getattr(app, "fit_summary",    None),
            "source_tag":     getattr(app, "source_tag",     None),
            "source_url":     getattr(app, "source_url",     None),

            "candidate": {
                "id":       candidate.id        if candidate else None,
                "name":     (candidate.name or "Unknown") if candidate else "Unknown",
                "email":    user_email or "",
                "skills":   candidate.skills   if candidate else "",
                "location": getattr(candidate, "location", "") or "",
                "user_id":  candidate.user_id  if candidate else None,
            } if candidate else None,
        })

    # Pre-sort: sourcing_rank asc (ranked candidates first), then final_score desc
    def _sort_key(x):
        rank  = x.get("sourcing_rank")
        score = x.get("final_score") or 0
        if rank is not None:
            return (0, rank, -score)
        return (1, 0, -score)

    result.sort(key=_sort_key)
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# 2.  SYNC SOURCING SCORES → APPLICATIONS  (called by sourcing_service)
# ═══════════════════════════════════════════════════════════════════════════════

async def sync_sourcing_scores_to_applications(
    db: AsyncSession,
    job_id: int,
    sourcing_id: int,
    ranked: list[dict],
) -> None:
    """
    After sourcing ranks candidates, write their scores + rank back into the
    Application rows so the recruiter dashboard reflects the results immediately.

    Only updates rows that already exist (candidates who applied).
    External candidates who haven't applied yet are skipped.
    """
    from src.data.models.postgres.application import Application

    updated = 0
    for item in ranked:
        result = await db.execute(
            select(Application).where(
                Application.candidate_id == item["candidate_id"],
                Application.job_id == job_id,
            )
        )
        app = result.scalar_one_or_none()
        if not app:
            continue

        app.rule_score     = item.get("rule_score",     0.0)
        app.semantic_score = item.get("semantic_score", 0.0)
        app.final_score    = item.get("final_score",    0.0)
        app.sourcing_rank  = item.get("rank")
        app.sourcing_score = item.get("final_score",    0.0)
        app.sourcing_id    = sourcing_id
        app.fit_summary    = item.get("fit_summary")
        app.source_tag     = item.get("source_tag")
        if app.status in ("pending", "applied"):
            app.status = "scored"

        updated += 1
        log.info(
            f"[sync] candidate_id={item['candidate_id']} job_id={job_id} "
            f"rank={item.get('rank')} final={item.get('final_score')} "
            f"status→scored"
        )

    await db.commit()
    log.info(
        f"[sync] Done — {updated}/{len(ranked)} application rows updated "
        f"for job_id={job_id} sourcing_id={sourcing_id}"
    )


# ═══════════════════════════════════════════════════════════════════════════════
# 3.  APPLY FOR JOB
# ═══════════════════════════════════════════════════════════════════════════════

async def apply_for_job_with_resume(
    db: AsyncSession,
    candidate_id: int,
    job_id: int,
    background_tasks: BackgroundTasks,   # ← replaces Celery; injected by router
    file=None,
) -> dict:
    """
    Applies a candidate for a job, optionally uploading a new resume.

    Fast path
    ---------
    If a file is supplied:
      1. upload_resume_fast() — S3 upload + bare Resume row (synchronous,
         completes before the HTTP response is sent).
      2. background_tasks.add_task(process_resume_upload, ...) — parse,
         embed, and persist ResumeSection rows after the response is sent.
         This replaces the old ``process_resume_upload_task.delay()`` Celery call.

    The router must obtain a BackgroundTasks instance from FastAPI dependency
    injection and pass it here:

        @router.post("/apply")
        async def apply_endpoint(
            ...,
            background_tasks: BackgroundTasks,   # FastAPI injects this
            db: AsyncSession = Depends(get_db),
        ):
            return await apply_for_job_with_resume(
                db, candidate_id, job_id, background_tasks, file
            )
    """
    from src.core.services.resume_service import (
        upload_resume_fast,
        process_resume_upload,
    )

    job = await get_job_details(db, job_id)
    if not job:
        raise JobNotFound()

    existing = await get_existing_application(db, candidate_id, job_id)
    if existing:
        raise AlreadyApplied()

    # ── 1. fast resume intake (S3 + bare Resume row only) ────────────────────
    resume_info: dict | None = None
    if file and getattr(file, "filename", None):
        resume_info = await upload_resume_fast(db, candidate_id=candidate_id, file=file)

        # ── 2. enqueue heavy work as a FastAPI background task ────────────────
        # process_resume_upload() calls parse_async → total_experience_years()
        # and persists experience_years on the ResumeSection row, exactly as
        # the old Celery task did — but without a broker/worker dependency.
        background_tasks.add_task(
            process_resume_upload,
            resume_id=resume_info["resume_id"],
            candidate_id=candidate_id,
            raw_text=resume_info["raw_text"],
        )
        log.info(
            f"[apply] BackgroundTask queued — resume_id={resume_info['resume_id']} "
            f"candidate_id={candidate_id}"
        )

    # Ensure there's at least one resume on file (could be from a prior upload)
    resume = await get_latest_resume(db, candidate_id)
    if not resume:
        raise NoResumeFound()

    # ── 3. create application row ─────────────────────────────────────────────
    application = await create_application(db, candidate_id, job_id)
    application.status = "applied"
    await db.commit()

    log.info(
        f"[apply] candidate_id={candidate_id} job_id={job_id} "
        f"application_id={application.id} — status=applied (scoring deferred)"
    )

    return {
        "application_id":  application.id,
        "job_id":          job_id,
        "status":          "applied",
        "resume_uploaded": resume_info is not None,
        "processing":      resume_info is not None,
        **(
            {
                "resume": {
                    "resume_id": resume_info["resume_id"],
                    "version":   resume_info["version"],
                    "s3_key":    resume_info["s3_key"],
                }
            }
            if resume_info
            else {}
        ),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 4.  SCORE APPLICATION
# ═══════════════════════════════════════════════════════════════════════════════

async def score_application(db: AsyncSession, application_id: int) -> dict:
    app = await get_application(db, application_id)
    if not app:
        raise ApplicationNotFound()

    job    = app.job
    resume = await get_latest_resume(db, app.candidate_id)
    if not resume:
        raise NoResumeFound()

    sections = await get_sections_by_resume(db, resume.id)

    rule_score     = _compute_rule_score(resume, sections, job)
    semantic_score = _compute_semantic_score(resume, sections, job)
    final_score    = W_RULE * rule_score + W_SEMANTIC * semantic_score

    updated = await update_application_scores(
        db,
        application_id=application_id,
        semantic_score=semantic_score,
        rule_score=rule_score,
        final_score=final_score,
        status="scored",
    )

    log.info(
        f"Application {application_id} scored: "
        f"rule={rule_score:.3f} sem={semantic_score:.3f} final={final_score:.3f}"
    )

    return {
        "application_id": application_id,
        "rule_score":     round(rule_score * 100, 1),
        "semantic_score": round(semantic_score * 100, 1),
        "final_score":    round(final_score * 100, 1),
        "status":         updated.status if updated else "scored",
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 5.  SHORTLIST JOB
# ═══════════════════════════════════════════════════════════════════════════════

async def shortlist_job(db: AsyncSession, job_id: int, top_n: int = 10) -> dict:
    job = await get_job_details(db, job_id)
    if not job:
        raise JobNotFound()

    apps = await list_applications_by_job(db, job_id)
    if not apps:
        return {"job_id": job_id, "top_n": top_n, "shortlisted_count": 0, "candidates": []}

    for app in apps:
        if app.status in ("pending", "applied"):
            await score_application(db, app.id)

    shortlisted = await shortlist_top_n(db, job_id, top_n)

    return {
        "job_id":            job_id,
        "top_n":             top_n,
        "shortlisted_count": len(shortlisted),
        "candidates": [
            {
                "application_id": a.id,
                "candidate_id":   a.candidate_id,
                "final_score":    round((a.final_score    or 0.0) * 100, 1),
                "rule_score":     round((a.rule_score     or 0.0) * 100, 1),
                "semantic_score": round((a.semantic_score or 0.0) * 100, 1),
                "sourcing_rank":  getattr(a, "sourcing_rank", None),
                "status":         a.status,
            }
            for a in shortlisted
        ],
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 6.  MY APPLICATIONS  (candidate view)
# ═══════════════════════════════════════════════════════════════════════════════

async def get_my_applications(db: AsyncSession, candidate_id: int) -> list[dict]:
    candidate = await get_candidate_by_user_id(db, candidate_id)
    apps = await list_applications_by_candidate(db, candidate.id)
    return [_serialize_application(a) for a in apps]


# ═══════════════════════════════════════════════════════════════════════════════
# 7.  UPDATE STATUS
# ═══════════════════════════════════════════════════════════════════════════════

async def update_application_status(
    db: AsyncSession,
    application_id: int,
    status: str,
) -> dict:
    VALID = {"pending", "scored", "shortlisted", "rejected", "hired"}
    if status not in VALID:
        raise ValueError(f"Invalid status. Must be one of: {VALID}")

    app = await get_application(db, application_id)
    if not app:
        raise ApplicationNotFound()

    app.status = status
    await db.commit()

    log.info(f"Application {application_id} status → {status}")
    return {"application_id": application_id, "status": status}


# ═══════════════════════════════════════════════════════════════════════════════
# 8.  SCORING LOGIC
# ═══════════════════════════════════════════════════════════════════════════════

def _compute_rule_score(resume, sections, job) -> float:
    """
    Rule-based score (0.0 – 1.0).

    Experience years resolution order (highest priority first):
      1. ResumeSection.experience_years — strict integer from LLM parser.
         Set by process_resume_upload() via bulk_create_resume_sections().
      2. _infer_experience_years() — regex fallback on raw parsed_text.
         Used for legacy rows (column NULL) and any resume not yet
         processed by the new pipeline.

    Weight breakdown:
      0.40 — skill match (required skills present in candidate skills section)
      0.30 — experience match (candidate years vs job.experience_required)
      0.15 — certifications bonus
      0.15 — baseline (everyone starts with this)
    """
    score = 0.0

    # ── skills ────────────────────────────────────────────────────────────────
    skills_section = next((s for s in sections if s.section_type == "skills"), None)
    candidate_skills: set[str] = set()
    if skills_section and skills_section.content:
        candidate_skills = {w.lower() for w in skills_section.content.split()}

    # ── experience years: DB column > regex fallback ──────────────────────────
    exp_section = next((s for s in sections if s.section_type == "experience"), None)
    if exp_section is not None and exp_section.experience_years is not None:
        exp_years = exp_section.experience_years
        log.debug(
            f"[rule_score] Using DB experience_years={exp_years} "
            f"for resume_id={getattr(resume, 'id', '?')}"
        )
    else:
        exp_years = _infer_experience_years(resume.parsed_text or "")
        log.debug(
            f"[rule_score] experience_years column NULL — "
            f"regex fallback={exp_years} for resume_id={getattr(resume, 'id', '?')}"
        )

    # ── certifications ────────────────────────────────────────────────────────
    cert_section = next((s for s in sections if s.section_type == "certifications"), None)
    has_certs    = bool(cert_section and cert_section.content.strip())

    # ── required skills from job ──────────────────────────────────────────────
    required_skills: list[str] = []
    if job.skills_required:
        if isinstance(job.skills_required, str):
            required_skills = [s.strip().lower() for s in job.skills_required.split(",")]
        elif isinstance(job.skills_required, list):
            required_skills = [s.lower() for s in job.skills_required]

    # ── compute sub-scores ────────────────────────────────────────────────────
    if required_skills:
        matched = sum(1 for s in required_skills if s in candidate_skills)
        score  += 0.40 * (matched / len(required_skills))
    else:
        score  += 0.40

    req_exp = job.experience_required or 0
    if req_exp > 0:
        score += 0.30 * min(exp_years / req_exp, 1.0)
    else:
        score += 0.30

    if has_certs:
        score += 0.15

    score += 0.15   # baseline

    return round(min(score, 1.0), 4)


def _compute_semantic_score(resume, sections, job) -> float:
    resume_vec = _load_vector(getattr(resume, "embedding", None))
    if resume_vec is None:
        skills_sec = next((s for s in sections if s.section_type == "skills"), None)
        if skills_sec:
            resume_vec = _load_vector(getattr(skills_sec, "embedding", None))
    if resume_vec is None:
        return 0.0

    job_vec = load_job_vector(job)
    if job_vec is None:
        log.warning(f"Job {job.id} has no stored embedding — embedding on the fly")
        job_vec = np.array(_embedder.embed_query(_job_text(job)), dtype=np.float32)

    return float(_cosine(resume_vec, job_vec))


# ═══════════════════════════════════════════════════════════════════════════════
# 9.  UTILITIES
# ═══════════════════════════════════════════════════════════════════════════════

def _load_vector(raw) -> Optional[np.ndarray]:
    if raw is None:
        return None
    try:
        data = json.loads(raw) if isinstance(raw, str) else raw
        return np.array(data, dtype=np.float32)
    except Exception:
        return None


def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    return float(np.dot(a, b) / denom) if denom > 0 else 0.0


def _infer_experience_years(text: str) -> int:
    """
    Regex fallback — extracts 4-digit years from raw text and returns the span.
    Used when ResumeSection.experience_years is NULL.
    """
    years = re.findall(r"(20\d{2}|19\d{2})", text)
    if len(years) >= 2:
        nums = sorted(set(int(y) for y in years))
        return nums[-1] - nums[0]
    return 0


def _serialize_application(app) -> dict:
    """Candidate's own applications view. Scores ×100 once here."""
    created_str = (
        app.created_at.isoformat() if getattr(app, "created_at", None) else None
    )
    return {
        "id":             app.id,
        "candidate_id":   app.candidate_id,
        "job_id":         app.job_id,
        "semantic_score": round((app.semantic_score or 0.0) * 100, 1),
        "rule_score":     round((app.rule_score     or 0.0) * 100, 1),
        "final_score":    round((app.final_score    or 0.0) * 100, 1),
        "status":         app.status or "pending",
        "created_at":     created_str,
        "sourcing_rank":  getattr(app, "sourcing_rank",  None),
        "sourcing_score": getattr(app, "sourcing_score", None),
        "fit_summary":    getattr(app, "fit_summary",    None),
        "source_tag":     getattr(app, "source_tag",     None),
        "source_url":     getattr(app, "source_url",     None),
    }