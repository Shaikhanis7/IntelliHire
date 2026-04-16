"""
src/core/services/sourcing_service.py — AGENTIC AI  (v10)

All LLM intelligence is now in:
  src/control/agents/sourcing_agent.py  ← SourcingAgent

This service handles:
  - DB queries and application pass strategy
  - Eligibility gating (rule-based, no LLM)
  - Vector scoring
  - Persisting results
  - Orchestrating the agent calls

Internal search pass order
──────────────────────────
  Pass 1  Applied to THIS job (pending / scored only)
          Tags: applied_scored | applied_pending
  Pass 2  Applied to a CLOSED OTHER job (skips shortlisted/selected)
          Tags: applied_closed_scored | applied_closed_pending | applied_closed_rejected
  Pass 3  Applied to an OPEN OTHER job (skips shortlisted/selected)
          Tag:  db_applied_other
  Pass 4  Raw DB match (skips ever_shortlisted)
          Tag:  db_match
  Pass 5  prev_sourced (previously scraped, no application anywhere)
          Tag:  prev_sourced
  Pass 6  External scraping fills remainder
          Tag:  external

eligibility changes (v10 → full-time experience only):
  - experience_years in DB now holds FULL-TIME years only.
    LLM sets ExperienceEntry.years=0 for internships/part-time/freelance.
    ResumeSectionEmbedder.total_experience_years() sums only is_fulltime=True entries.
    bulk_create_resume_sections() writes that full-time-only sum to the experience
    section row, so _fetch_resume_eligibility_data() reads full-time years directly.
  - _passes_eligibility() source label updated to "DB (full-time only)" to make
    logs clearly indicate that the experience gate is full-time filtered.
  - External scrape (_scrape_and_ingest): total_exp_years from LLM parse is now
    full-time only (via updated total_experience_years()); log line updated.

eligibility (v9 carry-over):
  - ANY required skill must match (not ALL).
  - Token-based skill matching with whole-word boundary check.
  - Internal candidates rejected if skills_section_text is None.
  - External scrape falls back to full parsed_text (no sections yet).

Other:
  - CROSS_JOB_EXCLUDE includes "shortlisted"
  - URL dedup uses per-link DB check
"""

from __future__ import annotations

import json
import re
import asyncio
from collections import defaultdict
from typing import Literal

import numpy as np
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
    LangChainResumeParser, ResumeSectionEmbedder,
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

# ── Singletons ────────────────────────────────────────────────────────────────
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

_STATUS_PREF: dict[str, int] = {
    "shortlisted": 0, "scored": 1, "pending": 2, "rejected": 3,
}


# ═══════════════════════════════════════════════════════════════════════════════
# ELIGIBILITY GATE  (pure rule-based — no LLM)
# ═══════════════════════════════════════════════════════════════════════════════

def _normalize_skills(text: str) -> set[str]:
    """
    Tokenize a skills section into a set of lowercase skill strings.

    Two-pass strategy:
      Pass 1 — split on primary delimiters (comma, newline, pipe, bullet, slash).
      Pass 2 — for any token still longer than 5 words, check if it is a flat
               space-separated skill dump (e.g. "php javascript jquery react")
               or a narrative sentence. Narrative sentences contain stop-words
               like "in", "with", "and" — those are dropped. Pure skill dumps
               do not contain stop-words — those are split on whitespace into
               individual skill tokens.

    e.g. "React, FastAPI | Python"             → {'react', 'fastapi', 'python'}
    e.g. "php javascript jquery laravel react" → {'php', 'javascript', 'jquery',
                                                    'laravel', 'react'}
    e.g. "brings expertise in React and ..."   → dropped (has stop-words)
    """
    STOP_WORDS = {"in", "with", "and", "for", "the", "of", "to", "a", "an",
                  "is", "has", "using", "as", "at", "by", "on", "or", "from"}

    raw_tokens = re.split(r"[,\n\r|•/]+", text.lower())
    result: set[str] = set()

    for t in raw_tokens:
        t = t.strip()
        if not t:
            continue

        words = t.split()

        if len(words) <= 5:
            result.add(t)
        else:
            # Long token — prose or flat skill dump?
            if set(words) & STOP_WORDS:
                # Contains stop-words → narrative sentence, drop it
                continue
            else:
                # No stop-words → flat skill dump, split into individual words
                for word in words:
                    word = word.strip(".()")
                    if word:
                        result.add(word)

    return result


def _skill_in_tokens(skill: str, tokens: set[str]) -> bool:
    """
    Returns True if the skill appears as an exact token OR as a whole-word
    match within any token.

    Examples:
      'react'   in {'react.js'}        → True
      'react'   in {'reactive native'} → False
      'fastapi' in {'fastapi'}         → True
      'python'  in {'python3'}         → True
    """
    skill = skill.lower().strip()
    if skill in tokens:
        return True
    pattern = re.compile(rf'\b{re.escape(skill)}\b')
    return any(pattern.search(token) for token in tokens)


def _passes_eligibility(
    parsed_text: str,
    skills: list[str],
    min_exp: int,
    experience_years: int | None = None,
    skills_section_text: str | None = None,
    is_internal: bool = False,
) -> tuple[bool, str]:
    """
    Relaxed eligibility gate — AT LEAST ONE required skill must be present
    as a distinct token in the skills section (ANY-match, not ALL-match).

    Experience gate uses FULL-TIME years only:
      - For internal candidates: experience_years from DB is already full-time
        only (written by bulk_create_resume_sections via total_experience_years()).
      - For external scrapes: total_exp_years from LLM parse is full-time only
        (total_experience_years() filters is_fulltime=False entries).
      - Regex fallback (_infer_experience_years) used when DB value is NULL —
        this is approximate but acceptable for external candidates without sections.

    Skill matching priority:
      1. skills_section_text (dedicated skills section) — tokenized and
         checked with whole-word boundary matching.
      2. parsed_text fallback — used ONLY for external scrapes where sections
         have not been written yet (is_internal=False and skills_section_text is None).
         Internal candidates (is_internal=True) are REJECTED outright if the
         skills section is absent.

    Returns (passed: bool, reason: str).
    """
    if not parsed_text:
        return False, "No resume text"

    # Internal candidates must have a dedicated skills section.
    if is_internal and skills_section_text is None:
        return False, "No skills section — skipping internal candidate"

    match_target = skills_section_text if skills_section_text else parsed_text
    tokens       = _normalize_skills(match_target)
    skills_lower = [s.lower().strip() for s in skills]

    # ── ANY skill must match ──────────────────────────────────────────────────
    matched = [s for s in skills_lower if _skill_in_tokens(s, tokens)]
    if not matched:
        return False, f"No required skills found. Required any of: {', '.join(skills_lower)}"

    # ── Experience check (full-time only) ─────────────────────────────────────
    if experience_years is not None:
        exp    = experience_years
        source = "DB (full-time only)"
    else:
        exp    = _infer_experience_years(parsed_text)
        source = "regex fallback (approx)"

    if exp < min_exp:
        return False, f"Full-time experience {exp}y < required {min_exp}y ({source})"

    missing = [s for s in skills_lower if not _skill_in_tokens(s, tokens)]
    return (
        True,
        f"Skill match (any): {matched} | missing (ok): {missing} | "
        f"ft_exp: {exp}y ({source})",
    )


# ═══════════════════════════════════════════════════════════════════════════════
# VECTOR HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _load_vector(raw) -> "np.ndarray | None":
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


def _section_semantic_score(sections, job_vec: np.ndarray) -> "float | None":
    section_map  = {s.section_type: s for s in sections}
    total_score  = 0.0
    total_weight = 0.0
    for section_type, weight in SECTION_WEIGHTS.items():
        section = section_map.get(section_type)
        if not section:
            continue
        sec_vec = _load_vector(getattr(section, "embedding", None))
        if sec_vec is None:
            continue
        total_score  += _cosine(sec_vec, job_vec) * weight
        total_weight += weight
    if total_weight == 0:
        return None
    return round(total_score / total_weight, 4)


# ═══════════════════════════════════════════════════════════════════════════════
# SOURCE TAG HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _tag_for_this_job(status: str) -> str:
    return "applied_scored" if status.lower() == "scored" else "applied_pending"


def _tag_for_closed_job(status: str) -> str:
    s = status.lower()
    if s == "shortlisted": return "applied_closed_shortlisted"
    if s == "scored":      return "applied_closed_scored"
    if s == "rejected":    return "applied_closed_rejected"
    return "applied_closed_pending"


# ═══════════════════════════════════════════════════════════════════════════════
# FETCH HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

async def _fetch_candidate_resume(
    db: AsyncSession,
    candidate_id: int,
) -> "tuple[Candidate | None, Resume | None]":
    cand_res  = await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    candidate = cand_res.scalar_one_or_none()
    if not candidate:
        return None, None
    resume_res = await db.execute(
        select(Resume)
        .where(Resume.candidate_id == candidate.id)
        .order_by(Resume.version.desc())
        .limit(1)
    )
    resume = resume_res.scalar_one_or_none()
    if not resume or not resume.parsed_text:
        return None, None
    return candidate, resume


async def _fetch_resume_eligibility_data(
    db: AsyncSession,
    resume_id: int,
) -> tuple[int | None, str | None]:
    """
    Fetches experience_years (full-time only) and skills section text
    in a single DB query.

    experience_years stored in the DB is FULL-TIME only because:
      - LLM sets ExperienceEntry.years=0 for non-full-time roles
      - ResumeSectionEmbedder.total_experience_years() sums only is_fulltime=True entries
      - bulk_create_resume_sections() writes that sum to the experience section row

    Returns:
      (experience_years, skills_section_text)
      Either value may be None if the section doesn't exist or column is NULL.
    """
    from src.data.models.postgres.resume_section import ResumeSection

    result = await db.execute(
        select(ResumeSection.section_type, ResumeSection.experience_years, ResumeSection.content)
        .where(
            ResumeSection.resume_id == resume_id,
            ResumeSection.section_type.in_(["experience", "skills"]),
        )
    )
    rows = result.all()

    experience_years    = None
    skills_section_text = None

    for section_type, exp_years, content in rows:
        if section_type == "experience":
            experience_years = exp_years   # full-time only (see docstring)
        elif section_type == "skills":
            skills_section_text = content

    return experience_years, skills_section_text


async def _fetch_experience_years(
    db: AsyncSession,
    resume_id: int,
) -> int | None:
    """
    Kept for backward compatibility — prefer _fetch_resume_eligibility_data.
    Returns full-time experience years only (see _fetch_resume_eligibility_data).
    """
    from src.data.models.postgres.resume_section import ResumeSection
    result = await db.execute(
        select(ResumeSection.experience_years).where(
            ResumeSection.resume_id    == resume_id,
            ResumeSection.section_type == "experience",
        ).limit(1)
    )
    return result.scalar_one_or_none()


def _make_dict(candidate: "Candidate", resume: "Resume", source_tag: str) -> dict:
    return {
        "candidate_id":   candidate.id,
        "name":           candidate.name,
        "source_tag":     source_tag,
        "source_url":     resume.source_url,
        "fit_summary":    None,
        "quality_note":   None,
        "_parsed_text":   resume.parsed_text,
        "rule_score":     0.0,
        "semantic_score": 0.0,
        "final_score":    0.0,
        "rank":           None,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# URL DEDUP HELPER
# ═══════════════════════════════════════════════════════════════════════════════

async def _is_already_scraped(db: AsyncSession, url: str) -> bool:
    result = await db.execute(
        select(Resume.id).where(Resume.source_url == url).limit(1)
    )
    return result.scalar_one_or_none() is not None


# ═══════════════════════════════════════════════════════════════════════════════
# BACKGROUND / ROLE RELEVANCE CHECK  (delegates to agent)
# ═══════════════════════════════════════════════════════════════════════════════

async def _background_matches_role(
    parsed_text: str,
    role: str,
    skills: list[str],
) -> tuple[bool, str]:
    """
    Calls the agent to check whether the candidate's background is broadly
    relevant to the role, even if only a partial skill match was found.

    Returns (matches: bool, reason: str).
    """
    result = await _agent.background_matches_role(parsed_text, role, skills)
    return result.matches, result.reason


# ═══════════════════════════════════════════════════════════════════════════════
# FIT SUMMARY ENRICHMENT  (delegates to agent)
# ═══════════════════════════════════════════════════════════════════════════════

async def _enrich_internal_summaries(
    pool: list[dict],
    role: str,
    skills: list[str],
) -> list[dict]:
    for item in pool:
        parsed_text = item.pop("_parsed_text", None)
        if item.get("fit_summary"):
            continue
        if not parsed_text:
            continue
        item["fit_summary"] = await _agent.fit_summary(parsed_text, role, skills)
        log.info(
            f"[internal] Fit summary cid={item['candidate_id']}: "
            f"{(item['fit_summary'] or '')[:80]}..."
        )
    return pool


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
    mode: Literal["internal", "external", "both"] = "both",
    sourcing_id: int | None = None,
) -> dict:
    if sourcing_id is None:
        sourcing = await create_sourcing(db, job_id, role, "India")
        sourcing_id = sourcing.id

    pool: list[dict] = []

    strategy = await _agent.suggest_search_strategy(role, skills, min_exp)
    effective_mode = mode if mode != "both" else strategy.suggested_mode
    log.info(
        f"[sourcing] mode={mode} → effective_mode={effective_mode} | "
        f"agent says: {strategy.reasoning}"
    )

    query_variants = await _agent.generate_query_variants(role, skills, count=5)
    for eq in strategy.extra_queries:
        if eq not in query_variants:
            query_variants.append(eq)

    if effective_mode == "internal":
        pool = await _search_internal(db, job_id, role, skills, min_exp, count)
        pool = await _enrich_internal_summaries(pool, role, skills)
        log.info(f"[sourcing] internal found {len(pool)}/{count}")

    elif effective_mode == "external":
        pool = await _scrape_and_ingest(
            db, role, skills, min_exp, count, sourcing_id, query_variants
        )
        log.info(f"[sourcing] external found {len(pool)}/{count}")

    else:  # both
        pool = await _search_internal(db, job_id, role, skills, min_exp, count)
        pool = await _enrich_internal_summaries(pool, role, skills)
        log.info(f"[sourcing] internal found {len(pool)}/{count}")
        still_needed = count - len(pool)
        if still_needed > 0:
            external = await _scrape_and_ingest(
                db, role, skills, min_exp, still_needed, sourcing_id, query_variants
            )
            pool.extend(external)
            log.info(f"[sourcing] external added {len(external)}, total={len(pool)}/{count}")

    # ── vector + rule scoring ─────────────────────────────────────────────────
    scored_pool = await _score_pool(db, pool, job_id)

    # ── initial sort: tag priority + final_score ──────────────────────────────
    scored_pool.sort(key=lambda c: (
        TAG_PRIORITY.get(c.get("source_tag", "external"), 99),
        -c.get("final_score", 0),
    ))

    # ── agent: intelligent re-rank ────────────────────────────────────────────
    scored_pool = await _agent.rerank(scored_pool, role, skills, top_n=min(20, len(scored_pool)))

    # ── assign final ranks ────────────────────────────────────────────────────
    for i, item in enumerate(scored_pool, start=1):
        item["rank"] = i

    await _save_sourcing_candidates(db, sourcing_id, scored_pool)
    await sync_sourcing_scores_to_applications(db, job_id, sourcing_id, scored_pool)

    log.info(
        f"[sourcing] Done | sourcing_id={sourcing_id} job_id={job_id} "
        f"ranked={len(scored_pool)} effective_mode={effective_mode}"
    )
    return {
        "job_id":         job_id,
        "sourcing_id":    sourcing_id,
        "mode":           effective_mode,
        "total_found":    len(scored_pool),
        "candidates":     scored_pool,
        "agent_strategy": strategy.reasoning,
        "note": "Candidates NOT yet applied to this job. HR must review and apply manually.",
    }


# ═══════════════════════════════════════════════════════════════════════════════
# PERSIST RANKED RESULTS
# ═══════════════════════════════════════════════════════════════════════════════

async def _save_sourcing_candidates(
    db: AsyncSession,
    sourcing_id: int,
    ranked: list[dict],
) -> None:
    await db.execute(
        delete(SourcingCandidate).where(SourcingCandidate.sourcing_id == sourcing_id)
    )
    for rank, item in enumerate(ranked, start=1):
        db.add(SourcingCandidate(
            sourcing_id    = sourcing_id,
            candidate_id   = item["candidate_id"],
            rank           = rank,
            source_tag     = item.get("source_tag", "external"),
            source_url     = item.get("source_url"),
            fit_summary    = item.get("fit_summary"),
            quality_note   = item.get("quality_note"),
            rule_score     = item.get("rule_score", 0.0),
            semantic_score = item.get("semantic_score", 0.0),
            final_score    = item.get("final_score", 0.0),
        ))
    await db.commit()
    log.info(f"[sourcing] Persisted {len(ranked)} candidates for sourcing_id={sourcing_id}")


# ═══════════════════════════════════════════════════════════════════════════════
# INTERNAL SEARCH — 5-pass strategy
# ═══════════════════════════════════════════════════════════════════════════════

async def _search_internal(
    db: AsyncSession,
    job_id: int,
    role: str,
    skills: list[str],
    min_exp: int,
    limit: int,
) -> list[dict]:
    pool: list[dict]   = []
    seen_ids: set[int] = set()

    all_jobs_res = await db.execute(select(Job))
    all_jobs: dict[int, Job] = {j.id: j for j in all_jobs_res.scalars().all()}

    this_apps_res = await db.execute(
        select(Application).where(Application.job_id == job_id)
    )
    this_apps: list[Application] = this_apps_res.scalars().all()
    this_job_status: dict[int, str] = {
        a.candidate_id: (a.status or "pending").lower() for a in this_apps
    }

    all_apps_res = await db.execute(select(Application))
    all_apps: list[Application] = all_apps_res.scalars().all()

    cand_apps: dict[int, list[tuple[int, str, bool]]] = defaultdict(list)
    for app in all_apps:
        job_obj   = all_jobs.get(app.job_id)
        is_active = bool(job_obj and job_obj.is_active)
        cand_apps[app.candidate_id].append(
            (app.job_id, (app.status or "pending").lower(), is_active)
        )

    ever_shortlisted: set[int] = {
        cid for cid, entries in cand_apps.items()
        if any(st == "shortlisted" for _, st, _ in entries)
    }

    excluded_this_job: set[int] = {
        cid for cid, st in this_job_status.items()
        if st in HARD_EXCLUDE_THIS_JOB
    }

    log.info(
        f"[internal] job_id={job_id} | this_job_apps={len(this_apps)} | "
        f"ever_shortlisted={len(ever_shortlisted)} | "
        f"excluded_this_job={len(excluded_this_job)}"
    )

    async def _eligible_and_background(
        candidate: "Candidate",
        resume: "Resume",
        pass_label: str,
    ) -> tuple[bool, str]:
        """
        Two-stage gate:
          1. Rule-based eligibility (any-skill + full-time exp).
          2. Agent background check (role relevance).
        """
        # experience_years here is full-time only (see _fetch_resume_eligibility_data)
        experience_years, skills_section_text = await _fetch_resume_eligibility_data(db, resume.id)
        passed, reason = _passes_eligibility(
            resume.parsed_text, skills, min_exp,
            experience_years=experience_years,
            skills_section_text=skills_section_text,
            is_internal=True,
        )
        if not passed:
            log.info(f"[{pass_label}] INELIGIBLE cid={candidate.id}: {reason}")
            return False, reason

        # Background / role-relevance check via agent
        bg_ok, bg_reason = await _background_matches_role(
            resume.parsed_text, role, skills
        )
        if not bg_ok:
            log.info(
                f"[{pass_label}] BACKGROUND MISMATCH cid={candidate.id}: {bg_reason}"
            )
            return False, bg_reason

        return True, f"{reason} | background: {bg_reason}"

    # ── Pass 1 — applied to THIS job (pending/scored only) ───────────────────
    for app in this_apps:
        if len(pool) >= limit: break
        status = (app.status or "pending").lower()
        if status in EXCLUDE_STATUSES or status not in INCLUDE_STATUSES:
            continue
        candidate, resume = await _fetch_candidate_resume(db, app.candidate_id)
        if not candidate or not resume: continue

        ok, reason = await _eligible_and_background(candidate, resume, "pass1")
        if not ok:
            continue
        tag = _tag_for_this_job(status)
        pool.append(_make_dict(candidate, resume, tag))
        seen_ids.add(candidate.id)
        log.info(f"[pass1] ADDED cid={candidate.id} tag={tag!r} | {reason}")
    log.info(f"[internal] After pass1: {len(pool)}/{limit}")

    # ── Pass 2 — applied to a CLOSED OTHER job ────────────────────────────────
    if len(pool) < limit:
        closed_best: dict[int, tuple[str, int]] = {}
        for cid, entries in cand_apps.items():
            if cid in seen_ids or cid in excluded_this_job: continue
            if cid in ever_shortlisted: continue
            for jid, status, is_active in entries:
                if jid == job_id or is_active or status in CROSS_JOB_EXCLUDE: continue
                if cid not in closed_best or (
                    _STATUS_PREF.get(status, 9) < _STATUS_PREF.get(closed_best[cid][0], 9)
                ):
                    closed_best[cid] = (status, jid)
        for cid, (status, src_jid) in closed_best.items():
            if len(pool) >= limit: break
            if cid in seen_ids: continue
            candidate, resume = await _fetch_candidate_resume(db, cid)
            if not candidate or not resume: continue

            ok, reason = await _eligible_and_background(candidate, resume, "pass2")
            if not ok:
                continue
            tag = _tag_for_closed_job(status)
            pool.append(_make_dict(candidate, resume, tag))
            seen_ids.add(cid)
            log.info(f"[pass2] ADDED cid={cid} tag={tag!r} | {reason}")
    log.info(f"[internal] After pass2: {len(pool)}/{limit}")

    # ── Pass 3 — applied to an OPEN OTHER job ─────────────────────────────────
    if len(pool) < limit:
        open_best: dict[int, tuple[str, int]] = {}
        for cid, entries in cand_apps.items():
            if cid in seen_ids or cid in excluded_this_job: continue
            if cid in ever_shortlisted: continue
            for jid, status, is_active in entries:
                if jid == job_id or not is_active or status in CROSS_JOB_EXCLUDE: continue
                if cid not in open_best or (
                    _STATUS_PREF.get(status, 9) < _STATUS_PREF.get(open_best[cid][0], 9)
                ):
                    open_best[cid] = (status, jid)
        for cid, (status, src_jid) in open_best.items():
            if len(pool) >= limit: break
            if cid in seen_ids: continue
            candidate, resume = await _fetch_candidate_resume(db, cid)
            if not candidate or not resume: continue

            ok, reason = await _eligible_and_background(candidate, resume, "pass3")
            if not ok:
                continue
            pool.append(_make_dict(candidate, resume, "db_applied_other"))
            seen_ids.add(cid)
            log.info(f"[pass3] ADDED cid={cid} | {reason}")
    log.info(f"[internal] After pass3: {len(pool)}/{limit}")

    # ── Pass 4 — raw DB match ─────────────────────────────────────────────────
    if len(pool) < limit:
        for cid in cand_apps:
            if len(pool) >= limit: break
            if cid in seen_ids or cid in excluded_this_job: continue
            if cid in ever_shortlisted: continue
            candidate, resume = await _fetch_candidate_resume(db, cid)
            if not candidate or not resume: continue

            ok, reason = await _eligible_and_background(candidate, resume, "pass4")
            if not ok:
                continue
            pool.append(_make_dict(candidate, resume, "db_match"))
            seen_ids.add(cid)
            log.info(f"[pass4] ADDED cid={cid} | {reason}")
    log.info(f"[internal] After pass4: {len(pool)}/{limit}")

    # ── Pass 5 — prev_sourced ─────────────────────────────────────────────────
    if len(pool) < limit:
        prev_sourced_q = (
            select(Candidate, Resume)
            .join(Resume, Resume.candidate_id == Candidate.id)
            .where(Resume.source_url.isnot(None), Resume.parsed_text.isnot(None))
            .order_by(Candidate.id, Resume.version.desc())
        )
        prev_sourced_res = await db.execute(prev_sourced_q)
        seen_prev: set[int] = set()
        for candidate, resume in prev_sourced_res.all():
            if len(pool) >= limit: break
            if candidate.id in seen_prev: continue
            seen_prev.add(candidate.id)
            if candidate.id in seen_ids or candidate.id in excluded_this_job: continue
            if candidate.id in cand_apps or candidate.id in ever_shortlisted: continue

            ok, reason = await _eligible_and_background(candidate, resume, "pass5")
            if not ok:
                continue
            pool.append(_make_dict(candidate, resume, "prev_sourced"))
            seen_ids.add(candidate.id)
            log.info(f"[pass5] ADDED cid={candidate.id} | {reason}")
    log.info(f"[internal] Total from all passes: {len(pool)}/{limit}")
    return pool


# ═══════════════════════════════════════════════════════════════════════════════
# SCORE POOL
# ═══════════════════════════════════════════════════════════════════════════════

async def _score_pool(
    db: AsyncSession,
    pool: list[dict],
    job_id: int,
) -> list[dict]:
    from src.core.services.job_service import get_job_details, load_job_vector, _job_text
    from src.data.repositories.resume_repo import get_latest_resume, get_sections_by_resume
    from src.core.services.application_service import _compute_rule_score, W_RULE, W_SEMANTIC

    job = await get_job_details(db, job_id)
    if not job:
        log.warning(f"Job {job_id} not found — returning pool unscored")
        return pool

    job_vec = load_job_vector(job)
    if job_vec is None:
        log.warning(f"Job {job_id} has no stored embedding — embedding on the fly")
        job_vec = np.array(_embedder.embed_query(_job_text(job)), dtype=np.float32)

    scored = []
    for item in pool:
        item.pop("_parsed_text", None)
        try:
            resume = await get_latest_resume(db, item["candidate_id"])
            if not resume:
                scored.append({**item, "final_score": 0.0})
                continue
            sections = await get_sections_by_resume(db, resume.id)

            rule  = _compute_rule_score(resume, sections, job)
            sem   = _section_semantic_score(sections, job_vec)
            if sem is None:
                rv  = _load_vector(getattr(resume, "embedding", None))
                sem = float(_cosine(rv, job_vec)) if rv is not None else 0.0
            final = round(W_RULE * rule + W_SEMANTIC * sem, 4)
            scored.append({
                **item,
                "rule_score":     round(rule, 4),
                "semantic_score": round(sem, 4),
                "final_score":    final,
            })
            log.info(
                f"[score] cid={item['candidate_id']} tag={item.get('source_tag')} "
                f"rule={rule:.3f} sem={sem:.3f} final={final:.4f}"
            )
        except Exception as exc:
            log.warning(f"Scoring failed cid={item['candidate_id']}: {exc}")
            scored.append({**item, "final_score": 0.0})
    return scored


# ═══════════════════════════════════════════════════════════════════════════════
# AGENTIC SCRAPE + INGEST
# ═══════════════════════════════════════════════════════════════════════════════

async def _scrape_and_ingest(
    db: AsyncSession,
    role: str,
    skills: list[str],
    min_exp: int,
    needed: int,
    sourcing_id: int,
    query_variants: list[str],
) -> list[dict]:
    from src.data.repositories.user_repo import create_user, get_user_by_email
    from src.utils.security import hash_password

    scraped_this_run: set[str] = set()

    log.info(
        f"[agent] Starting scrape | role='{role}' needed={needed} | "
        f"queries={query_variants}"
    )

    ingested: list[dict] = []
    BATCH     = max(needed, 10)
    MAX_EMPTY = 2

    for current_query in query_variants:
        if len(ingested) >= needed:
            break
        page         = 1
        empty_rounds = 0
        log.info(f"[agent] Query: '{current_query}'")

        while len(ingested) < needed:
            log.info(
                f"[agent] page={page} query='{current_query}' "
                f"ingested={len(ingested)}/{needed}"
            )
            raw_links = await get_resume_links(current_query, BATCH, page=page)
            if not raw_links:
                break

            fresh_links = [l for l in raw_links if l not in scraped_this_run]
            log.info(
                f"[agent] raw={len(raw_links)} after_run_dedup={len(fresh_links)}"
            )

            if not fresh_links:
                empty_rounds += 1
                if empty_rounds >= MAX_EMPTY:
                    break
                page += 1
                continue

            empty_rounds = 0

            for link in fresh_links:
                if len(ingested) >= needed:
                    break

                scraped_this_run.add(link)

                if await _is_already_scraped(db, link):
                    log.debug(f"[agent] Already in DB, skipping: {link}")
                    continue

                text = await scrape_resume(link)
                if not text or len(text) < 200:
                    log.debug(f"[agent] Thin content: {link}")
                    continue

                # External scrape: any-skill gate on full text (no sections yet).
                # experience_years=None → regex fallback used (full-time filter
                # not yet available; LLM parse happens below after acceptance).
                passed, reason = _passes_eligibility(
                    text, skills, min_exp,
                    experience_years=None,
                    skills_section_text=None,
                )
                if not passed:
                    log.info(f"[agent] INELIGIBLE (skill/exp) | {reason} | {link}")
                    continue

                # Background / role-relevance check via agent
                bg_ok, bg_reason = await _background_matches_role(text, role, skills)
                if not bg_ok:
                    log.info(f"[agent] BACKGROUND MISMATCH | {bg_reason} | {link}")
                    continue

                quality = await _agent.quality_check(text, current_query)
                if not quality.accept:
                    log.info(f"[agent] REJECTED | {quality.reason} | {link}")
                    continue
                log.info(f"[agent] ACCEPTED | {quality.reason} | {link}")

                try:
                    parsed  = await _parser.parse_async(text)
                    name    = parsed.contact.name or "Unknown"
                    summary = await _agent.fit_summary(text, role, skills)

                    # Full-time years only (is_fulltime=False entries excluded)
                    total_exp_years = ResumeSectionEmbedder.total_experience_years(parsed)

                    email = f"sourced_{sourcing_id}_{len(ingested)}@intellihire.internal"
                    if await get_user_by_email(db, email):
                        log.info(f"[agent] Duplicate email {email}, skipping")
                        continue

                    user      = await create_user(db, email, hash_password("sourced!"), "candidate")
                    candidate = Candidate(user_id=user.id, name=name, skills=", ".join(parsed.skills))
                    db.add(candidate)
                    await db.commit()
                    await db.refresh(candidate)

                    section_embeddings = await asyncio.to_thread(_embedder.embed_all_sections, parsed)
                    full_embedding     = _embedder.embed_full_resume(parsed)
                    version            = await get_next_version(db, candidate.id)

                    resume = await create_resume_from_url(
                        db, candidate_id=candidate.id, source_url=link,
                        parsed_text=text, version=version,
                    )
                    section_texts = ResumeSectionEmbedder.section_texts(parsed)

                    await bulk_create_resume_sections(
                        db, resume_id=resume.id,
                        sections=section_texts,
                        section_embeddings=section_embeddings,
                        experience_years=total_exp_years,  # full-time only
                    )
                    resume.embedding = json.dumps(full_embedding)
                    await db.commit()

                    ingested.append({
                        "candidate_id":   candidate.id,
                        "name":           name,
                        "source_tag":     "external",
                        "source_url":     link,
                        "fit_summary":    summary,
                        "quality_note":   quality.reason,
                        "rule_score":     0.0,
                        "semantic_score": 0.0,
                        "final_score":    0.0,
                        "rank":           None,
                    })
                    log.info(
                        f"[DB] Saved cid={candidate.id} name='{name}' "
                        f"ft_exp_years={total_exp_years} "
                        f"progress={len(ingested)}/{needed}"
                    )
                except Exception as exc:
                    log.error(f"[agent] Ingest failed | url={link} | {exc}", exc_info=True)
                    continue

            page += 1

    if len(ingested) < needed:
        log.warning(f"[agent] Shortfall: got={len(ingested)} needed={needed}")
    else:
        log.info(f"[agent] Complete: {len(ingested)}/{needed} for role='{role}'")
    return ingested


# ═══════════════════════════════════════════════════════════════════════════════
# HISTORY + CANDIDATES  (used by router)
# ═══════════════════════════════════════════════════════════════════════════════

async def get_sourcing_history(
    db: AsyncSession,
    job_id: "int | None" = None,
) -> list[dict]:
    from src.data.models.postgres.sourcing import Sourcing
    query = select(Sourcing).order_by(Sourcing.id.desc())
    if job_id:
        query = query.where(Sourcing.job_id == job_id)
    result = await db.execute(query)
    return [
        {
            "sourcing_id": r.id,
            "job_id":      r.job_id,
            "role":        r.role,
            "location":    r.location,
            "created_at":  str(r.created_at),
        }
        for r in result.scalars().all()
    ]


async def get_sourcing_candidates(
    db: AsyncSession,
    sourcing_id: int,
) -> list[dict]:
    result = await db.execute(
        select(SourcingCandidate)
        .where(SourcingCandidate.sourcing_id == sourcing_id)
        .order_by(SourcingCandidate.rank)
    )
    rows = result.scalars().all()
    if not rows:
        return []
    output = []
    for r in rows:
        cand_res  = await db.execute(select(Candidate).where(Candidate.id == r.candidate_id))
        candidate = cand_res.scalar_one_or_none()
        output.append({
            "rank":           r.rank,
            "candidate_id":   r.candidate_id,
            "name":           candidate.name if candidate else "Unknown",
            "source_tag":     r.source_tag,
            "source_url":     r.source_url,
            "fit_summary":    r.fit_summary,
            "quality_note":   r.quality_note,
            "rule_score":     r.rule_score,
            "semantic_score": r.semantic_score,
            "final_score":    r.final_score,
        })
    return output