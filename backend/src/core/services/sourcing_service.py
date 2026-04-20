"""
src/core/services/sourcing_service.py — AGENTIC AI  (v15)

CHANGES FROM v14:
  Change 1 — generate_query_variants() no longer takes count=5.
              It now takes candidates_needed=count so the agent dynamically
              decides how many queries to generate based on role niche-ness
              and how many candidates HR asked for.
              Returns a QueryPlan (niche_level, estimated_queries_needed,
              reasoning, queries) instead of a bare list[str].

  Change 2 — strategy.extra_queries are merged into the QueryPlan query list
              (deduplicated) before passing to the scraping function, keeping
              a single source of truth for all queries.

  Change 3 — _scrape_external_candidates_and_ingest_to_db() now runs an
              ADAPTIVE loop:
                · Pulls queries one-at-a-time from a pending_queries deque.
                · When pending_queries is empty but candidates_still_needed > 0,
                  calls _agent.generate_additional_queries() to pivot strategy.
                · Caps extra rounds at MAX_EXTRA_QUERY_ROUNDS (default 3) to
                  prevent infinite loops when the market has no matching candidates.
                · Tracks tried_queries across the full run so the agent never
                  repeats an exhausted query.

  Change 4 — source_candidates() logs the QueryPlan metadata (niche_level,
              estimated_queries_needed, reasoning) for full observability.

Internal search pass order (unchanged from v14):
  Pass 1  Applied to THIS job (pending / scored only)
  Pass 2  Applied to a CLOSED OTHER job (skips shortlisted/selected)
  Pass 3  Applied to an OPEN OTHER job  (skips shortlisted/selected)
  Pass 4  Raw DB match (skips ever_shortlisted)
  Pass 5  prev_sourced (previously scraped, no application anywhere)
  Pass 6  External scraping fills remainder (adaptive query loop)
"""

from __future__ import annotations

import json
import re
import asyncio
from collections import defaultdict, deque
from typing import Literal

import numpy as np
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from src.data.models.postgres.candidate import Candidate
from src.data.models.postgres.resume import Resume
from src.data.models.postgres.application import Application
from src.data.models.postgres.source_candidates import SourcingCandidate
from src.data.models.postgres.job import Job
from src.data.repositories.sourcing_repo import create_sourcing
from src.data.repositories.resume_repo import (
    create_resume_from_url,
    bulk_create_resume_sections,
    get_next_version,
    get_sections_by_resume,
)
from src.core.services.resume_langchain_service import (
    LangChainResumeParser,
    ResumeSectionEmbedder,
)
from src.core.services.scraper_service import get_resume_links, scrape_resume
from src.core.services.application_service import (
    _infer_experience_years,
    sync_sourcing_scores_to_applications,
)
from src.control.agents.sourcing_agent import SourcingAgent
from src.config.settings import settings
from src.observability.logging.logger import setup_logger

log = setup_logger()

_parser   = LangChainResumeParser(settings.GROQ_API_KEY)
_embedder = ResumeSectionEmbedder()
_agent    = SourcingAgent()

# ── Status sets ───────────────────────────────────────────────────────────────
INCLUDE_STATUSES      = {"pending", "scored"}
EXCLUDE_STATUSES      = {"selected", "rejected"}
HARD_EXCLUDE_THIS_JOB = {"selected", "rejected", "shortlisted"}
CROSS_JOB_EXCLUDE     = {"selected", "shortlisted"}

SECTION_WEIGHTS = {
    "skills":         0.40,
    "experience":     0.35,
    "summary":        0.10,
    "education":      0.10,
    "certifications": 0.05,
}

TAG_PRIORITY: dict[str, int] = {
    "applied_shortlisted":        0,
    "applied_pending":            1,
    "applied_scored":             2,
    "applied_closed_shortlisted": 3,
    "applied_closed_scored":      4,
    "applied_closed_pending":     5,
    "applied_closed_rejected":    6,
    "db_applied_other":           7,
    "db_match":                   8,
    "prev_sourced":               9,
    "external":                   10,
}

_APPLICATION_STATUS_PREFERENCE: dict[str, int] = {
    "shortlisted": 0,
    "scored":      1,
    "pending":     2,
    "rejected":    3,
}

SKILL_MATCH_THRESHOLD = 0.33  # 33% of required skills must match

# Maximum number of times the adaptive loop may call generate_additional_queries()
# before giving up on a shortfall. Prevents infinite loops when the market has
# genuinely no matching candidates for a very niche role.
MAX_EXTRA_QUERY_ROUNDS = 3


class CandidateResult(BaseModel):
    rank:           int | None
    candidate_id:   int
    name:           str
    source_tag:     str
    source_url:     str | None
    fit_summary:    str | None
    quality_note:   str | None
    rule_score:     float
    semantic_score: float
    final_score:    float


class SourcingResult(BaseModel):
    job_id:         int
    sourcing_id:    int
    mode:           str
    total_found:    int
    candidates:     list[CandidateResult]
    agent_strategy: str
    note:           str = "Candidates NOT yet applied to this job. HR must review and apply manually."


class SourcingHistoryItem(BaseModel):
    sourcing_id: int
    job_id:      int
    role:        str
    location:    str
    created_at:  str


class SourcingCandidateDetail(BaseModel):
    rank:           int
    candidate_id:   int
    name:           str
    source_tag:     str
    source_url:     str | None
    fit_summary:    str | None
    quality_note:   str | None
    rule_score:     float
    semantic_score: float
    final_score:    float


# ═══════════════════════════════════════════════════════════════════════════════
# ELIGIBILITY GATE
# ═══════════════════════════════════════════════════════════════════════════════

def _tokenize_skills_text_to_set(raw_skills_text: str) -> set[str]:
    """
    Tokenize a skills section blob into a set of lowercase skill tokens.

    Pass 1 — split on primary delimiters (comma, newline, pipe, bullet, slash).
    Pass 2 — tokens longer than 5 words: drop if they contain stop-words
             (narrative prose), otherwise split on whitespace (flat skill dumps).
    """
    PROSE_STOP_WORDS = {
        "in", "with", "and", "for", "the", "of", "to",
        "a", "an", "is", "has", "using", "as", "at",
        "by", "on", "or", "from",
    }
    result: set[str] = set()
    for token in re.split(r"[,\n\r|•/]+", raw_skills_text.lower()):
        token = token.strip()
        if not token:
            continue
        words = token.split()
        if len(words) <= 5:
            result.add(token)
        elif not (set(words) & PROSE_STOP_WORDS):
            result.update(w.strip(".,()") for w in words if w.strip(".,()"))
    return result


def _skill_matches_any_token(skill: str, token_set: set[str]) -> bool:
    """
    Return True if the skill string matches any token in the set.
    Uses exact match first, then whole-word boundary regex for compound skills.
    """
    skill = skill.lower().strip()
    if skill in token_set:
        return True
    return any(re.search(rf'\b{re.escape(skill)}\b', token) for token in token_set)


def _candidate_passes_eligibility_gate(
    resume_parsed_text: str,
    required_skills: list[str],
    required_min_experience_years: int,
    job_description: str | None = None,
    candidate_fulltime_experience_years: int | None = None,
    candidate_skills_section_text: str | None = None,
    is_internal_candidate: bool = False,
) -> tuple[bool, str]:
    """
    Eligibility gate — at least 50% of required skills must match.

    Skill matching uses:
      1. candidate_skills_section_text if available (tokenized, whole-word boundary).
      2. resume_parsed_text + job_description fallback for external candidates.
      Internal candidates are REJECTED if candidate_skills_section_text is None.

    Experience gate uses FULL-TIME years only.

    Returns:
        (passed: bool, reason: str)
    """
    if not resume_parsed_text:
        return False, "No resume text available"

    if is_internal_candidate and candidate_skills_section_text is None:
        return False, "No skills section found — skipping internal candidate"

    skill_match_corpus = (
        candidate_skills_section_text if candidate_skills_section_text
        else resume_parsed_text
    )
    if job_description and not candidate_skills_section_text:
        skill_match_corpus = f"{skill_match_corpus}\n{job_description}"

    skill_tokens   = _tokenize_skills_text_to_set(skill_match_corpus)
    skills_lower   = [s.lower().strip() for s in required_skills]
    matched_skills = [s for s in skills_lower if _skill_matches_any_token(s, skill_tokens)]
    match_ratio    = len(matched_skills) / len(skills_lower) if skills_lower else 1.0

    if match_ratio < SKILL_MATCH_THRESHOLD:
        missing_skills = [s for s in skills_lower if not _skill_matches_any_token(s, skill_tokens)]
        return (
            False,
            f"Skill match {len(matched_skills)}/{len(skills_lower)} "
            f"({match_ratio:.0%}) < required {SKILL_MATCH_THRESHOLD:.0%}. "
            f"Missing: {', '.join(missing_skills)}",
        )

    if candidate_fulltime_experience_years is not None:
        total_years  = candidate_fulltime_experience_years
        years_source = "DB (full-time only)"
    else:
        total_years  = _infer_experience_years(resume_parsed_text)
        years_source = "regex fallback (approximate)"

    if total_years < required_min_experience_years:
        return (
            False,
            f"Full-time experience {total_years}y < required "
            f"{required_min_experience_years}y ({years_source})",
        )

    missing_skills = [s for s in skills_lower if not _skill_matches_any_token(s, skill_tokens)]
    return (
        True,
        f"Skill match {len(matched_skills)}/{len(skills_lower)} ({match_ratio:.0%}) | "
        f"missing (ok): {missing_skills} | ft_exp: {total_years}y ({years_source})",
    )


# ═══════════════════════════════════════════════════════════════════════════════
# VECTOR HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _deserialize_embedding_vector(raw_embedding) -> np.ndarray | None:
    """Deserialize a JSON-encoded or list embedding into a float32 numpy array."""
    if raw_embedding is None:
        return None
    try:
        data = json.loads(raw_embedding) if isinstance(raw_embedding, str) else raw_embedding
        return np.array(data, dtype=np.float32)
    except Exception:
        return None


def _compute_cosine_similarity(vector_a: np.ndarray, vector_b: np.ndarray) -> float:
    """Compute cosine similarity between two vectors. Returns 0.0 if either is zero."""
    denominator = np.linalg.norm(vector_a) * np.linalg.norm(vector_b)
    return float(np.dot(vector_a, vector_b) / denominator) if denominator > 0 else 0.0


def _compute_weighted_section_semantic_score(
    resume_sections: list,
    job_embedding_vector: np.ndarray,
) -> float | None:
    """
    Compute a weighted semantic similarity score across all resume sections.

    Each section type has a predefined weight (skills 40%, experience 35%, etc.).
    Returns None if no sections had embeddings to score.
    """
    section_map  = {s.section_type: s for s in resume_sections}
    total_score  = 0.0
    total_weight = 0.0

    for section_type, weight in SECTION_WEIGHTS.items():
        section = section_map.get(section_type)
        if not section:
            continue
        section_vector = _deserialize_embedding_vector(
            getattr(section, "embedding", None)
        )
        if section_vector is None:
            continue
        total_score  += _compute_cosine_similarity(section_vector, job_embedding_vector) * weight
        total_weight += weight

    if total_weight == 0:
        return None
    return round(total_score / total_weight, 4)


# ═══════════════════════════════════════════════════════════════════════════════
# SOURCE TAG HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _resolve_source_tag_for_active_job_application(application_status: str) -> str:
    """Map an application status on the active job to the correct source tag."""
    return (
        "applied_scored" if application_status.lower() == "scored"
        else "applied_pending"
    )


def _resolve_source_tag_for_closed_job_application(application_status: str) -> str:
    """Map an application status on a closed job to the correct source tag."""
    status = application_status.lower()
    if status == "shortlisted": return "applied_closed_shortlisted"
    if status == "scored":      return "applied_closed_scored"
    if status == "rejected":    return "applied_closed_rejected"
    return "applied_closed_pending"


# ═══════════════════════════════════════════════════════════════════════════════
# FETCH HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

async def _fetch_candidate_with_latest_resume(
    db: AsyncSession,
    candidate_id: int,
) -> tuple[Candidate | None, Resume | None]:
    """
    Fetch a candidate row and their most recent resume in one round-trip pair.
    Returns (None, None) if either is missing or the resume has no parsed text.
    """
    candidate = (await db.execute(
        select(Candidate).where(Candidate.id == candidate_id)
    )).scalar_one_or_none()

    if not candidate:
        return None, None

    resume = (await db.execute(
        select(Resume)
        .where(Resume.candidate_id == candidate.id)
        .order_by(Resume.version.desc())
        .limit(1)
    )).scalar_one_or_none()

    if not resume or not resume.parsed_text:
        return None, None

    return candidate, resume


async def _fetch_experience_and_skills_from_resume_sections(
    db: AsyncSession,
    resume_id: int,
) -> tuple[int | None, str | None]:
    """
    Fetch (full-time experience years, skills section text) from stored resume sections.

    experience_years is FULL-TIME only — internships/part-time are excluded by
    bulk_create_resume_sections() which writes is_fulltime-filtered totals.

    Returns:
        (experience_years, skills_section_text)
        Either can be None if the section does not exist.
    """
    from src.data.models.postgres.resume_section import ResumeSection

    rows = (await db.execute(
        select(
            ResumeSection.section_type,
            ResumeSection.experience_years,
            ResumeSection.content,
        )
        .where(
            ResumeSection.resume_id == resume_id,
            ResumeSection.section_type.in_(["experience", "skills"]),
        )
    )).all()

    experience_years    = None
    skills_section_text = None

    for section_type, exp_years, content in rows:
        if section_type == "experience":
            experience_years = exp_years
        elif section_type == "skills":
            skills_section_text = content

    return experience_years, skills_section_text


async def _resume_url_already_exists_in_db(db: AsyncSession, source_url: str) -> bool:
    """Return True if this URL has already been scraped and stored as a Resume."""
    return (await db.execute(
        select(Resume.id).where(Resume.source_url == source_url).limit(1)
    )).scalar_one_or_none() is not None


def _build_candidate_pool_entry(
    candidate: Candidate,
    resume: Resume,
    source_tag: str,
) -> dict:
    """
    Build the initial pool dict for a candidate before scoring.
    All score fields default to 0.0; filled in by _score_candidate_pool_against_job().
    """
    return {
        "candidate_id":   candidate.id,
        "name":           candidate.name,
        "source_tag":     source_tag,
        "source_url":     resume.source_url,
        "fit_summary":    None,
        "quality_note":   None,
        "_parsed_text":   resume.parsed_text,   # internal — stripped before DB persist
        "rule_score":     0.0,
        "semantic_score": 0.0,
        "final_score":    0.0,
        "rank":           None,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# PUBLIC ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

async def source_candidates(
    db: AsyncSession,
    job_id: int,
    role: str,
    skills: list[str],
    min_exp: int,
    count: int,
    job_description: str | None = None,
    mode: Literal["internal", "external", "both"] = "both",
    sourcing_id: int | None = None,
    triggered_by: int | None = None,
) -> SourcingResult:

    if sourcing_id is None:
        sourcing = await create_sourcing(
            db, job_id, role, "India",
            triggered_by=triggered_by,
        )
        sourcing_id = sourcing.id

    agent_strategy = await _agent.suggest_search_strategy(role, skills, min_exp)
    effective_mode = mode if mode != "both" else agent_strategy.suggested_mode

    log.info(
        f"[sourcing] mode={mode} → effective_mode={effective_mode} | "
        f"agent says: {agent_strategy.reasoning}"
    )

    # Change 1: agent decides query count dynamically based on candidates_needed.
    # Returns a QueryPlan instead of a bare list.
    query_plan = await _agent.generate_query_variants(
        role=role,
        required_skills=skills,
        candidates_needed=count,
    )

    # Change 4: log QueryPlan metadata for full observability
    log.info(
        f"[sourcing] QueryPlan | niche={query_plan.niche_level} "
        f"estimated_queries={query_plan.estimated_queries_needed} "
        f"actual_queries={len(query_plan.queries)} | {query_plan.reasoning}"
    )

    # Change 2: merge strategy.extra_queries into the plan (deduplicated)
    query_variants: list[str] = list(query_plan.queries)
    existing_query_set = set(query_variants)
    for extra_query in agent_strategy.extra_queries:
        if extra_query.lower() not in existing_query_set:
            query_variants.append(extra_query.lower())
            existing_query_set.add(extra_query.lower())

    log.info(
        f"[sourcing] Final query list after strategy merge: "
        f"{len(query_variants)} queries → {query_variants}"
    )

    candidate_pool: list[dict] = []
    _total_checked_count: int  = 0

    if effective_mode == "internal":
        candidate_pool, _total_checked_count = await _collect_internal_candidates_via_passes(
            db, job_id, role, skills, min_exp, count, job_description
        )

    elif effective_mode == "external":
        candidate_pool = await _scrape_external_candidates_and_ingest_to_db(
            db, role, skills, min_exp, count, sourcing_id, query_variants, job_description
        )
        _total_checked_count = len(candidate_pool)

    else:  # both
        candidate_pool, _total_checked_count = await _collect_internal_candidates_via_passes(
            db, job_id, role, skills, min_exp, count, job_description
        )
        log.info(f"[sourcing] internal found {len(candidate_pool)}/{count}")

        still_needed = count - len(candidate_pool)
        if still_needed > 0:
            external_candidates = await _scrape_external_candidates_and_ingest_to_db(
                db, role, skills, min_exp, still_needed,
                sourcing_id, query_variants, job_description,
            )
            candidate_pool.extend(external_candidates)
            _total_checked_count += len(external_candidates)

    log.info(f"[sourcing] pool size before scoring: {len(candidate_pool)}")

    scored_pool = await _score_candidate_pool_against_job(
        db, candidate_pool, job_id, job_description
    )

    # Sort: higher-priority tags first, then highest score within each tag
    scored_pool.sort(key=lambda entry: (
        TAG_PRIORITY.get(entry.get("source_tag", "external"), 99),
        -entry.get("final_score", 0),
    ))

    for rank_position, entry in enumerate(scored_pool, start=1):
        entry["rank"] = rank_position

    await _persist_ranked_candidates_to_db(db, sourcing_id, scored_pool)
    await sync_sourcing_scores_to_applications(db, job_id, sourcing_id, scored_pool)

    from src.data.repositories.sourcing_repo import complete_sourcing
    await complete_sourcing(
        db,
        sourcing_id   = sourcing_id,
        total_checked = _total_checked_count,
        total_sourced = len(scored_pool),
    )

    log.info(
        f"[sourcing] Done | sourcing_id={sourcing_id} job_id={job_id} "
        f"ranked={len(scored_pool)} effective_mode={effective_mode}"
    )

    return SourcingResult(
        job_id=job_id,
        sourcing_id=sourcing_id,
        mode=effective_mode,
        total_found=len(scored_pool),
        candidates=[
            CandidateResult(**{k: v for k, v in c.items() if k != "_parsed_text"})
            for c in scored_pool
        ],
        agent_strategy=agent_strategy.reasoning,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# PERSIST RANKED RESULTS
# ═══════════════════════════════════════════════════════════════════════════════

async def _persist_ranked_candidates_to_db(
    db: AsyncSession,
    sourcing_id: int,
    ranked_candidates: list[dict],
) -> None:
    """
    Replace all SourcingCandidate rows for this sourcing run with the new ranked list.
    Deletes previous results first to ensure idempotency on re-runs.
    """
    await db.execute(
        delete(SourcingCandidate).where(SourcingCandidate.sourcing_id == sourcing_id)
    )
    for rank_position, entry in enumerate(ranked_candidates, start=1):
        db.add(SourcingCandidate(
            sourcing_id    = sourcing_id,
            candidate_id   = entry["candidate_id"],
            rank           = rank_position,
            source_tag     = entry.get("source_tag", "external"),
            source_url     = entry.get("source_url"),
            fit_summary    = entry.get("fit_summary"),
            quality_note   = entry.get("quality_note"),
            rule_score     = entry.get("rule_score", 0.0),
            semantic_score = entry.get("semantic_score", 0.0),
            final_score    = entry.get("final_score", 0.0),
        ))
    await db.commit()
    log.info(
        f"[sourcing] Persisted {len(ranked_candidates)} candidates "
        f"for sourcing_id={sourcing_id}"
    )


# ═══════════════════════════════════════════════════════════════════════════════
# INTERNAL SEARCH — 5-pass strategy
# ═══════════════════════════════════════════════════════════════════════════════

async def _collect_internal_candidates_via_passes(
    db: AsyncSession,
    job_id: int,
    role: str,
    required_skills: list[str],
    required_min_experience_years: int,
    candidate_limit: int,
    job_description: str | None = None,
) -> tuple[list[dict], int]:
    """
    Collect internal candidates across 5 priority passes.

    Pass 1 — applied to THIS job (pending/scored only)
    Pass 2 — applied to a CLOSED other job
    Pass 3 — applied to an OPEN other job
    Pass 4 — raw DB match (never applied anywhere)
    Pass 5 — previously sourced (scraped but never applied)

    Each pass applies a two-stage gate:
      Stage 1: 50% skill match + experience years check
      Stage 2: LLM background relevance check

    Returns:
        (candidate_pool, total_checked)
        total_checked counts every candidate that entered the eligibility gate
        across all 5 passes, regardless of outcome.
    """
    candidate_pool: list[dict]            = []
    already_added_candidate_ids: set[int] = set()
    total_checked: int                    = 0

    all_jobs_by_id: dict[int, Job] = {
        j.id: j
        for j in (await db.execute(select(Job))).scalars().all()
    }

    this_job_applications: list[Application] = (
        await db.execute(select(Application).where(Application.job_id == job_id))
    ).scalars().all()

    this_job_status_by_candidate: dict[int, str] = {
        app.candidate_id: (app.status or "pending").lower()
        for app in this_job_applications
    }

    all_applications: list[Application] = (
        await db.execute(select(Application))
    ).scalars().all()

    # Build per-candidate application history: {candidate_id: [(job_id, status, is_active)]}
    candidate_application_history: dict[int, list[tuple[int, str, bool]]] = defaultdict(list)
    for app in all_applications:
        job_obj   = all_jobs_by_id.get(app.job_id)
        is_active = bool(job_obj and job_obj.is_active)
        candidate_application_history[app.candidate_id].append(
            (app.job_id, (app.status or "pending").lower(), is_active)
        )

    ever_shortlisted_candidate_ids: set[int] = {
        cid
        for cid, entries in candidate_application_history.items()
        if any(status == "shortlisted" for _, status, _ in entries)
    }

    excluded_from_this_job_ids: set[int] = {
        cid
        for cid, status in this_job_status_by_candidate.items()
        if status in HARD_EXCLUDE_THIS_JOB
    }

    log.info(
        f"[internal] job_id={job_id} this_job_apps={len(this_job_applications)} "
        f"ever_shortlisted={len(ever_shortlisted_candidate_ids)} "
        f"excluded={len(excluded_from_this_job_ids)}"
    )

    async def _check_candidate_eligibility_and_background(
        candidate: Candidate,
        resume: Resume,
        pass_label: str,
    ) -> tuple[bool, str]:
        """
        Two-stage gate:
          Stage 1 — 50% skill rule + experience years (fast, no LLM)
          Stage 2 — LLM background relevance check (only if stage 1 passes)
        """
        experience_years, skills_section_text = (
            await _fetch_experience_and_skills_from_resume_sections(db, resume.id)
        )
        stage1_passed, stage1_reason = _candidate_passes_eligibility_gate(
            resume_parsed_text=resume.parsed_text,
            required_skills=required_skills,
            required_min_experience_years=required_min_experience_years,
            job_description=job_description,
            candidate_fulltime_experience_years=experience_years,
            candidate_skills_section_text=skills_section_text,
            is_internal_candidate=True,
        )
        if not stage1_passed:
            log.info(f"[{pass_label}] INELIGIBLE cid={candidate.id}: {stage1_reason}")
            return False, stage1_reason

        background_decision = await _agent.background_matches_role(
            resume.parsed_text, role, required_skills
        )
        if not background_decision.matches:
            log.info(
                f"[{pass_label}] BACKGROUND MISMATCH cid={candidate.id}: "
                f"{background_decision.reason}"
            )
            return False, background_decision.reason

        return True, f"{stage1_reason} | background: {background_decision.reason}"

    # ── Pass 1: applied to THIS job (pending/scored) ──────────────────────────
    for app in this_job_applications:
        if len(candidate_pool) >= candidate_limit:
            break
        status = (app.status or "pending").lower()
        if status not in INCLUDE_STATUSES:
            continue
        candidate, resume = await _fetch_candidate_with_latest_resume(db, app.candidate_id)
        if not candidate or not resume:
            continue
        total_checked += 1
        passed, reason = await _check_candidate_eligibility_and_background(
            candidate, resume, "pass1"
        )
        if not passed:
            continue
        source_tag = _resolve_source_tag_for_active_job_application(status)
        entry = _build_candidate_pool_entry(candidate, resume, source_tag)
        entry["fit_summary"] = await _agent.fit_summary(resume.parsed_text, role, required_skills)
        candidate_pool.append(entry)
        already_added_candidate_ids.add(candidate.id)
        log.info(f"[pass1] ADDED cid={candidate.id} tag={source_tag!r} | {reason}")
    log.info(f"[internal] After pass1: {len(candidate_pool)}/{candidate_limit}")

    # ── Pass 2: applied to a CLOSED OTHER job ─────────────────────────────────
    if len(candidate_pool) < candidate_limit:
        best_closed_job_application_by_candidate: dict[int, tuple[str, int]] = {}

        for cid, entries in candidate_application_history.items():
            if (
                cid in already_added_candidate_ids
                or cid in excluded_from_this_job_ids
                or cid in ever_shortlisted_candidate_ids
            ):
                continue
            for jid, status, is_active in entries:
                if jid == job_id or is_active or status in CROSS_JOB_EXCLUDE:
                    continue
                current_best = best_closed_job_application_by_candidate.get(cid)
                if current_best is None or (
                    _APPLICATION_STATUS_PREFERENCE.get(status, 9)
                    < _APPLICATION_STATUS_PREFERENCE.get(current_best[0], 9)
                ):
                    best_closed_job_application_by_candidate[cid] = (status, jid)

        for cid, (status, _) in best_closed_job_application_by_candidate.items():
            if len(candidate_pool) >= candidate_limit:
                break
            if cid in already_added_candidate_ids:
                continue
            candidate, resume = await _fetch_candidate_with_latest_resume(db, cid)
            if not candidate or not resume:
                continue
            total_checked += 1
            passed, reason = await _check_candidate_eligibility_and_background(
                candidate, resume, "pass2"
            )
            if not passed:
                continue
            source_tag = _resolve_source_tag_for_closed_job_application(status)
            entry = _build_candidate_pool_entry(candidate, resume, source_tag)
            entry["fit_summary"] = await _agent.fit_summary(
                resume.parsed_text, role, required_skills
            )
            candidate_pool.append(entry)
            already_added_candidate_ids.add(cid)
            log.info(f"[pass2] ADDED cid={cid} tag={source_tag!r} | {reason}")
    log.info(f"[internal] After pass2: {len(candidate_pool)}/{candidate_limit}")

    # ── Pass 3: applied to an OPEN OTHER job ──────────────────────────────────
    if len(candidate_pool) < candidate_limit:
        best_open_job_application_by_candidate: dict[int, tuple[str, int]] = {}

        for cid, entries in candidate_application_history.items():
            if (
                cid in already_added_candidate_ids
                or cid in excluded_from_this_job_ids
                or cid in ever_shortlisted_candidate_ids
            ):
                continue
            for jid, status, is_active in entries:
                if jid == job_id or not is_active or status in CROSS_JOB_EXCLUDE:
                    continue
                current_best = best_open_job_application_by_candidate.get(cid)
                if current_best is None or (
                    _APPLICATION_STATUS_PREFERENCE.get(status, 9)
                    < _APPLICATION_STATUS_PREFERENCE.get(current_best[0], 9)
                ):
                    best_open_job_application_by_candidate[cid] = (status, jid)

        for cid, (status, _) in best_open_job_application_by_candidate.items():
            if len(candidate_pool) >= candidate_limit:
                break
            if cid in already_added_candidate_ids:
                continue
            candidate, resume = await _fetch_candidate_with_latest_resume(db, cid)
            if not candidate or not resume:
                continue
            total_checked += 1
            passed, reason = await _check_candidate_eligibility_and_background(
                candidate, resume, "pass3"
            )
            if not passed:
                continue
            entry = _build_candidate_pool_entry(candidate, resume, "db_applied_other")
            entry["fit_summary"] = await _agent.fit_summary(
                resume.parsed_text, role, required_skills
            )
            candidate_pool.append(entry)
            already_added_candidate_ids.add(cid)
            log.info(f"[pass3] ADDED cid={cid} | {reason}")
    log.info(f"[internal] After pass3: {len(candidate_pool)}/{candidate_limit}")

    # ── Pass 4: raw DB match (never applied anywhere) ─────────────────────────
    if len(candidate_pool) < candidate_limit:
        for cid in candidate_application_history:
            if len(candidate_pool) >= candidate_limit:
                break
            if (
                cid in already_added_candidate_ids
                or cid in excluded_from_this_job_ids
                or cid in ever_shortlisted_candidate_ids
            ):
                continue
            candidate, resume = await _fetch_candidate_with_latest_resume(db, cid)
            if not candidate or not resume:
                continue
            total_checked += 1
            passed, reason = await _check_candidate_eligibility_and_background(
                candidate, resume, "pass4"
            )
            if not passed:
                continue
            entry = _build_candidate_pool_entry(candidate, resume, "db_match")
            entry["fit_summary"] = await _agent.fit_summary(
                resume.parsed_text, role, required_skills
            )
            candidate_pool.append(entry)
            already_added_candidate_ids.add(cid)
            log.info(f"[pass4] ADDED cid={cid} | {reason}")
    log.info(f"[internal] After pass4: {len(candidate_pool)}/{candidate_limit}")

    # ── Pass 5: prev_sourced (scraped externally, never applied) ──────────────
    if len(candidate_pool) < candidate_limit:
        scraped_candidates_with_resumes = (await db.execute(
            select(Candidate, Resume)
            .join(Resume, Resume.candidate_id == Candidate.id)
            .where(Resume.source_url.isnot(None), Resume.parsed_text.isnot(None))
            .order_by(Candidate.id, Resume.version.desc())
        )).all()

        seen_in_pass5: set[int] = set()
        for candidate, resume in scraped_candidates_with_resumes:
            if len(candidate_pool) >= candidate_limit:
                break
            if candidate.id in seen_in_pass5:
                continue
            seen_in_pass5.add(candidate.id)
            if (
                candidate.id in already_added_candidate_ids
                or candidate.id in excluded_from_this_job_ids
                or candidate.id in candidate_application_history
                or candidate.id in ever_shortlisted_candidate_ids
            ):
                continue
            total_checked += 1
            passed, reason = await _check_candidate_eligibility_and_background(
                candidate, resume, "pass5"
            )
            if not passed:
                continue
            entry = _build_candidate_pool_entry(candidate, resume, "prev_sourced")
            entry["fit_summary"] = await _agent.fit_summary(
                resume.parsed_text, role, required_skills
            )
            candidate_pool.append(entry)
            already_added_candidate_ids.add(candidate.id)
            log.info(f"[pass5] ADDED cid={candidate.id} | {reason}")

    log.info(
        f"[internal] Total from all passes: "
        f"{len(candidate_pool)}/{candidate_limit} | total_checked={total_checked}"
    )
    return candidate_pool, total_checked


# ═══════════════════════════════════════════════════════════════════════════════
# SCORE POOL
# ═══════════════════════════════════════════════════════════════════════════════

async def _score_candidate_pool_against_job(
    db: AsyncSession,
    candidate_pool: list[dict],
    job_id: int,
    job_description: str | None = None,
) -> list[dict]:
    """
    Score every candidate in the pool against the job using:
      - Rule-based score  (skills, experience, education match)
      - Semantic score    (weighted cosine similarity across resume sections)
      - Final score       = W_RULE * rule + W_SEMANTIC * semantic

    Optionally enriches the job embedding with the job description text.
    Returns the pool with rule_score, semantic_score, and final_score populated.
    """
    from src.core.services.job_service import get_job_details, load_job_vector, _job_text
    from src.data.repositories.resume_repo import get_latest_resume
    from src.core.services.application_service import _compute_rule_score, W_RULE, W_SEMANTIC

    job = await get_job_details(db, job_id)
    if not job:
        log.warning(f"Job {job_id} not found — returning pool unscored")
        return candidate_pool

    job_text = _job_text(job)
    if job_description:
        job_text = f"{job_text}\n\nJob Description:\n{job_description}"

    job_embedding_vector = load_job_vector(job)
    if job_embedding_vector is None:
        log.warning(f"Job {job_id} has no stored embedding — embedding on the fly")
        job_embedding_vector = np.array(
            _embedder.embed_query(job_text), dtype=np.float32
        )

    scored_results = []
    for entry in candidate_pool:
        entry.pop("_parsed_text", None)
        try:
            resume = await get_latest_resume(db, entry["candidate_id"])
            if not resume:
                scored_results.append({**entry, "final_score": 0.0})
                continue

            resume_sections = await get_sections_by_resume(db, resume.id)
            rule_score      = _compute_rule_score(resume, resume_sections, job)
            semantic_score  = _compute_weighted_section_semantic_score(
                resume_sections, job_embedding_vector
            )

            if semantic_score is None:
                full_resume_vector = _deserialize_embedding_vector(
                    getattr(resume, "embedding", None)
                )
                semantic_score = (
                    _compute_cosine_similarity(full_resume_vector, job_embedding_vector)
                    if full_resume_vector is not None
                    else 0.0
                )

            final_score = round(W_RULE * rule_score + W_SEMANTIC * semantic_score, 4)
            scored_results.append({
                **entry,
                "rule_score":     round(rule_score, 4),
                "semantic_score": round(semantic_score, 4),
                "final_score":    final_score,
            })
            log.info(
                f"[score] cid={entry['candidate_id']} tag={entry.get('source_tag')} "
                f"rule={rule_score:.3f} sem={semantic_score:.3f} final={final_score:.4f}"
            )
        except Exception as exc:
            log.warning(f"Scoring failed for cid={entry['candidate_id']}: {exc}")
            scored_results.append({**entry, "final_score": 0.0})

    return scored_results


# ═══════════════════════════════════════════════════════════════════════════════
# AGENTIC SCRAPE + INGEST  (adaptive query loop)
# ═══════════════════════════════════════════════════════════════════════════════

async def _scrape_external_candidates_and_ingest_to_db(
    db: AsyncSession,
    role: str,
    required_skills: list[str],
    required_min_experience_years: int,
    candidates_needed: int,
    sourcing_id: int,
    search_query_variants: list[str],
    job_description: str | None = None,
) -> list[dict]:
    """
    Scrape external resume URLs using an ADAPTIVE query loop, run eligibility
    + quality checks, then ingest accepted candidates into the DB as new
    Candidate + Resume rows.

    Change 3 — Adaptive loop replaces the old static for-loop over queries:
      · pending_queries deque is populated from search_query_variants.
      · On each iteration, one query is popped and run until it is exhausted
        (no new links) or candidates_needed is met.
      · When pending_queries empties but candidates_still_needed > 0, the agent
        is asked for additional queries via generate_additional_queries().
      · Extra query rounds are capped at MAX_EXTRA_QUERY_ROUNDS to prevent
        infinite loops when the market has no matching candidates.
      · tried_queries tracks EVERY query that was actually executed so the
        agent never repeats an exhausted query in any extra round.

    Three-stage per-URL gate (unchanged):
      Stage 1 — 50% skill match + experience years
      Stage 2 — LLM background relevance check
      Stage 3 — LLM quality check (is this actually a resume?)
    """
    from src.data.repositories.user_repo import create_user, get_user_by_email
    from src.utils.security import hash_password

    scraped_urls_this_run: set[str]  = set()
    ingested_candidates:   list[dict] = []
    tried_queries:         list[str]  = []      # ALL queries executed this run
    LINKS_PER_PAGE                    = max(candidates_needed, 10)
    MAX_EMPTY_PAGES_BEFORE_NEXT_QUERY = 2
    extra_rounds_used:     int        = 0

    # Change 3: deque for O(1) popleft — initial queries from the QueryPlan
    pending_queries: deque[str] = deque(search_query_variants)

    log.info(
        f"[agent] Starting adaptive external scrape | "
        f"role='{role}' needed={candidates_needed} "
        f"initial_queries={len(pending_queries)} "
        f"max_extra_rounds={MAX_EXTRA_QUERY_ROUNDS}"
    )

    # ── Outer adaptive loop — runs until candidates_needed met or queries exhausted ──
    while len(ingested_candidates) < candidates_needed:

        # ── Refill pending_queries when exhausted ─────────────────────────────
        if not pending_queries:
            if extra_rounds_used >= MAX_EXTRA_QUERY_ROUNDS:
                log.warning(
                    f"[agent] Reached max extra query rounds ({MAX_EXTRA_QUERY_ROUNDS}). "
                    f"Stopping with shortfall: "
                    f"got={len(ingested_candidates)} needed={candidates_needed}"
                )
                break

            still_needed = candidates_needed - len(ingested_candidates)
            log.info(
                f"[agent] All queries exhausted. Requesting additional queries | "
                f"still_needed={still_needed} "
                f"tried_so_far={tried_queries} "
                f"extra_round={extra_rounds_used + 1}/{MAX_EXTRA_QUERY_ROUNDS}"
            )

            additional = await _agent.generate_additional_queries(
                role=role,
                required_skills=required_skills,
                already_tried_queries=tried_queries,
                candidates_still_needed=still_needed,
            )

            if not additional:
                log.warning(
                    "[agent] generate_additional_queries returned nothing — "
                    "stopping scrape."
                )
                break

            pending_queries.extend(additional)
            extra_rounds_used += 1
            log.info(
                f"[agent] Extra round {extra_rounds_used}: "
                f"added {len(additional)} new queries → {additional}"
            )

        # ── Pop next query and run it ─────────────────────────────────────────
        current_search_query = pending_queries.popleft()
        tried_queries.append(current_search_query)

        current_page     = 1
        empty_page_count = 0

        log.info(
            f"[agent] Running query '{current_search_query}' | "
            f"page=1 ingested={len(ingested_candidates)}/{candidates_needed} "
            f"queries_remaining={len(pending_queries)}"
        )

        # ── Inner page loop for this query ────────────────────────────────────
        while len(ingested_candidates) < candidates_needed:
            log.info(
                f"[agent] page={current_page} query='{current_search_query}' "
                f"ingested={len(ingested_candidates)}/{candidates_needed}"
            )

            raw_resume_links = await get_resume_links(
                current_search_query, LINKS_PER_PAGE, page=current_page
            )
            if not raw_resume_links:
                log.info(
                    f"[agent] No links returned for "
                    f"query='{current_search_query}' page={current_page} — moving on"
                )
                break

            new_resume_links = [
                link for link in raw_resume_links
                if link not in scraped_urls_this_run
            ]
            log.info(
                f"[agent] raw={len(raw_resume_links)} "
                f"after_run_dedup={len(new_resume_links)}"
            )

            if not new_resume_links:
                empty_page_count += 1
                if empty_page_count >= MAX_EMPTY_PAGES_BEFORE_NEXT_QUERY:
                    log.info(
                        f"[agent] {empty_page_count} consecutive empty pages for "
                        f"query='{current_search_query}' — advancing to next query"
                    )
                    break
                current_page += 1
                continue
            empty_page_count = 0

            # ── Per-URL processing ────────────────────────────────────────────
            for resume_url in new_resume_links:
                if len(ingested_candidates) >= candidates_needed:
                    break
                scraped_urls_this_run.add(resume_url)

                if await _resume_url_already_exists_in_db(db, resume_url):
                    log.debug(f"[agent] Already in DB: {resume_url}")
                    continue

                scraped_text = await scrape_resume(resume_url)
                if not scraped_text or len(scraped_text) < 200:
                    log.debug(f"[agent] Thin or empty content at: {resume_url}")
                    continue

                # Stage 1: eligibility gate (50% skills + experience)
                stage1_passed, stage1_reason = _candidate_passes_eligibility_gate(
                    resume_parsed_text=scraped_text,
                    required_skills=required_skills,
                    required_min_experience_years=required_min_experience_years,
                    job_description=job_description,
                    candidate_fulltime_experience_years=None,
                    candidate_skills_section_text=None,
                )
                if not stage1_passed:
                    log.info(f"[agent] INELIGIBLE | {stage1_reason} | {resume_url}")
                    continue

                # Stage 2: LLM background relevance check
                background_decision = await _agent.background_matches_role(
                    scraped_text, role, required_skills
                )
                if not background_decision.matches:
                    log.info(
                        f"[agent] BACKGROUND MISMATCH | "
                        f"{background_decision.reason} | {resume_url}"
                    )
                    continue

                # Stage 3: LLM quality check (is this actually a resume?)
                quality_decision = await _agent.quality_check(
                    scraped_text, current_search_query
                )
                if not quality_decision.accept:
                    log.info(
                        f"[agent] QUALITY REJECTED | "
                        f"{quality_decision.reason} | {resume_url}"
                    )
                    continue
                log.info(
                    f"[agent] ACCEPTED | {quality_decision.reason} | {resume_url}"
                )

                # Ingest: parse → embed → persist DB rows
                try:
                    parsed_resume = await _parser.parse_async(scraped_text)
                    if not parsed_resume.contact.name and not parsed_resume.skills:
                        log.error("Parse returned empty data, skipping candidate")
                        continue
                    fit_summary          = await _agent.fit_summary(
                        scraped_text, role, required_skills
                    )
                    total_fulltime_years = ResumeSectionEmbedder.total_experience_years(
                        parsed_resume
                    )

                    internal_email = (
                        f"sourced_{sourcing_id}_{len(ingested_candidates)}"
                        f"@intellihire.internal"
                    )
                    if await get_user_by_email(db, internal_email):
                        log.info(
                            f"[agent] Duplicate internal email {internal_email}, skipping"
                        )
                        continue

                    new_user = await create_user(
                        db,
                        internal_email,
                        hash_password("sourced!"),
                        "candidate",
                        name=parsed_resume.contact.name,
                    )
                    new_candidate = Candidate(
                        user_id = new_user.id,
                        name    = parsed_resume.contact.name,
                    )
                    db.add(new_candidate)
                    await db.commit()
                    await db.refresh(new_candidate)

                    section_embeddings    = await asyncio.to_thread(
                        _embedder.embed_all_sections, parsed_resume
                    )
                    full_resume_embedding = _embedder.embed_full_resume(parsed_resume)
                    resume_version        = await get_next_version(db, new_candidate.id)

                    new_resume = await create_resume_from_url(
                        db,
                        candidate_id=new_candidate.id,
                        source_url=resume_url,
                        parsed_text=scraped_text,
                        version=resume_version,
                    )
                    await bulk_create_resume_sections(
                        db,
                        resume_id=new_resume.id,
                        sections=ResumeSectionEmbedder.section_texts(parsed_resume),
                        section_embeddings=section_embeddings,
                        experience_years=total_fulltime_years,
                    )
                    new_resume.embedding = json.dumps(full_resume_embedding)
                    await db.commit()

                    ingested_candidates.append({
                        "candidate_id":   new_candidate.id,
                        "name":           parsed_resume.contact.name,
                        "source_tag":     "external",
                        "source_url":     resume_url,
                        "fit_summary":    fit_summary,
                        "quality_note":   quality_decision.reason,
                        "rule_score":     0.0,
                        "semantic_score": 0.0,
                        "final_score":    0.0,
                        "rank":           None,
                    })
                    log.info(
                        f"[DB] Saved cid={new_candidate.id} "
                        f"name='{parsed_resume.contact.name}' "
                        f"ft_exp_years={total_fulltime_years} "
                        f"progress={len(ingested_candidates)}/{candidates_needed}"
                    )

                except Exception as exc:
                    log.error(
                        f"[agent] Ingest failed | url={resume_url} | {exc}",
                        exc_info=True,
                    )

            current_page += 1

    # ── Final summary log ─────────────────────────────────────────────────────
    if len(ingested_candidates) < candidates_needed:
        log.warning(
            f"[agent] Scrape complete with SHORTFALL | "
            f"got={len(ingested_candidates)} needed={candidates_needed} "
            f"total_queries_run={len(tried_queries)} "
            f"extra_rounds_used={extra_rounds_used} "
            f"tried_queries={tried_queries}"
        )
    else:
        log.info(
            f"[agent] Scrape complete | "
            f"{len(ingested_candidates)}/{candidates_needed} candidates ingested | "
            f"total_queries_run={len(tried_queries)} "
            f"extra_rounds_used={extra_rounds_used}"
        )

    return ingested_candidates


# ═══════════════════════════════════════════════════════════════════════════════
# HISTORY + CANDIDATES  (used by router)
# ═══════════════════════════════════════════════════════════════════════════════

async def get_sourcing_history(
    db: AsyncSession,
    job_id: int | None = None,
) -> list[SourcingHistoryItem]:
    """Return a list of past sourcing runs, optionally filtered by job_id."""
    from src.data.models.postgres.sourcing import Sourcing
    query = select(Sourcing).order_by(Sourcing.id.desc())
    if job_id:
        query = query.where(Sourcing.job_id == job_id)
    rows = (await db.execute(query)).scalars().all()
    return [
        SourcingHistoryItem(
            sourcing_id=row.id,
            job_id=row.job_id,
            role=row.role,
            location=row.location,
            created_at=str(row.created_at),
        )
        for row in rows
    ]


async def get_sourcing_candidates(
    db: AsyncSession,
    sourcing_id: int,
) -> list[SourcingCandidateDetail]:
    """Return the ranked candidates for a specific sourcing run."""
    rows = (await db.execute(
        select(SourcingCandidate)
        .where(SourcingCandidate.sourcing_id == sourcing_id)
        .order_by(SourcingCandidate.rank)
    )).scalars().all()

    if not rows:
        return []

    output = []
    for row in rows:
        candidate = (await db.execute(
            select(Candidate).where(Candidate.id == row.candidate_id)
        )).scalar_one_or_none()

        output.append(SourcingCandidateDetail(
            rank=row.rank,
            candidate_id=row.candidate_id,
            name=candidate.name if candidate else "Unknown",
            source_tag=row.source_tag,
            source_url=row.source_url,
            fit_summary=row.fit_summary,
            quality_note=row.quality_note,
            rule_score=row.rule_score,
            semantic_score=row.semantic_score,
            final_score=row.final_score,
        ))
    return output