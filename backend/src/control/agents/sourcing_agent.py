"""
src/control/agents/sourcing_agent.py

Intelligent Sourcing Agent  (v14)
──────────────────────────────────
All LLM decision-making for the sourcing pipeline.

CHANGES FROM v13:
  generate_query_variants() — `count` parameter removed entirely.
    The agent now decides how many queries to generate dynamically based on:
      - How niche the role is
      - How many candidates are needed
    Returns a structured QueryPlan (niche_level, estimated_queries_needed,
    reasoning, queries) instead of a bare list, so the caller has full
    visibility into the agent's reasoning.

  generate_additional_queries() — NEW method.
    Called when the initial query batch is exhausted but candidates_needed
    is not yet met. Receives the full list of already-tried queries and
    generates deliberately different ones that pivot strategy.

Responsibilities
────────────────
  1. generate_query_variants()      — dynamic query count + diverse queries
  2. generate_additional_queries()  — pivot queries when initial batch runs dry
  3. quality_check()                — decide if scraped text is a real resume
  4. fit_summary()                  — write a recruiter-facing candidate summary
  5. suggest_search_strategy()      — suggest sourcing mode & pass priority
  6. background_matches_role()      — check candidate background relevance to role

Design principles
─────────────────
  - Stateless: every method is async, accepts plain data, returns plain data.
  - Retry-safe: each method falls back gracefully on LLM error.
  - Observable: every decision logged with [agent] prefix.
"""

from __future__ import annotations

import json

from pydantic import BaseModel, Field

from src.observability.logging.logger import setup_logger

log = setup_logger()


# ─────────────────────────────────────────────────────────────────────────────
# LLM FACTORY
# ─────────────────────────────────────────────────────────────────────────────

def _create_llm_with_temperature(temperature: float = 0.0):
    """
    Instantiate a Groq ChatGroq LLM at the given temperature.

    Low temperature (0.0) for deterministic structured outputs (quality checks,
    eligibility decisions). Higher temperature (0.6+) for diverse query generation.
    """
    from langchain_groq import ChatGroq
    from src.config.settings import settings
    return ChatGroq(
        model="llama-3.1-8b-instant",
        temperature=temperature,
        api_key=settings.GROQ_API_KEY,
    )


def _parse_llm_json_response(raw_llm_output: str):
    """
    Parse the raw string output from the LLM into a Python object.

    Strips markdown fences (```json ... ```) that some LLMs include
    even when explicitly told not to, then parses as JSON.

    Raises:
        json.JSONDecodeError: if the output is not valid JSON after stripping.
    """
    text = raw_llm_output.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text  = parts[1] if len(parts) > 1 else text
        if text.startswith("json"):
            text = text[4:].lstrip()
    return json.loads(text.strip())


# ─────────────────────────────────────────────────────────────────────────────
# RESPONSE MODELS
# ─────────────────────────────────────────────────────────────────────────────

class QualityDecision(BaseModel):
    accept:     bool
    reason:     str
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)


class SearchStrategy(BaseModel):
    suggested_mode:  str          # "internal" | "external" | "both"
    priority_passes: list[str]
    extra_queries:   list[str]
    reasoning:       str


class BackgroundDecision(BaseModel):
    matches: bool
    reason:  str


class QueryPlan(BaseModel):
    """
    Structured output from generate_query_variants().

    Carries the agent's full reasoning alongside the actual queries so that
    sourcing_service.py can log and observe the decision, not just consume
    the raw list.

    Attributes:
        niche_level:               Agent's classification of role scarcity.
        estimated_queries_needed:  How many queries the agent predicted it needed.
        reasoning:                 One-sentence explanation of the decision.
        queries:                   Deduplicated list of search queries to run,
                                   canonical role name always first.
    """
    niche_level:               str        # "common" | "moderate" | "niche" | "very niche"
    estimated_queries_needed:  int
    reasoning:                 str
    queries:                   list[str]  # deduplicated, role-name-first


# ─────────────────────────────────────────────────────────────────────────────
# SOURCING AGENT
# ─────────────────────────────────────────────────────────────────────────────

class SourcingAgent:

    # ── 1. DYNAMIC QUERY VARIANT GENERATION ───────────────────────────────────

    async def generate_query_variants(
        self,
        role: str,
        required_skills: list[str],
        candidates_needed: int,
    ) -> QueryPlan:
        """
        Dynamically decide how many search query variants are needed AND
        generate them, in a single LLM call.

        The agent estimates role niche-ness from the title and skills, then
        maps that estimate + candidates_needed to a query count:
          - Common role  + few candidates  →  3-5 queries
          - Niche role   + many candidates → 10-15 queries

        The query count is self-bounded between 3 and 15 by the prompt.
        The canonical role name is always prepended as the first query after
        deduplication so the baseline search is never skipped.

        Falls back to a minimal QueryPlan([role.lower()]) on LLM error so
        the pipeline is never blocked by an agent failure.

        Args:
            role:              Target job title (e.g. "Senior Backend Engineer").
            required_skills:   Key skills to inform title variants.
            candidates_needed: The count of candidates HR asked for — used by
                               the agent to scale query breadth accordingly.

        Returns:
            QueryPlan with niche_level, estimated_queries_needed, reasoning,
            and the deduplicated list of queries.
        """
        skills_str = ", ".join(required_skills[:8]) if required_skills else "not specified"

        prompt = (
            f"You are an expert technical recruiter building search queries.\n"
            f"Role: '{role}'\n"
            f"Required skills: {skills_str}\n"
            f"Candidates needed: {candidates_needed}\n\n"
            "Your job:\n"
            "  1. Estimate how niche this role is in the job market:\n"
            "       'common'    → very available (e.g. Python developer, React engineer)\n"
            "       'moderate'  → some competition (e.g. ML engineer, DevOps lead)\n"
            "       'niche'     → hard to find (e.g. Rust engineer, FPGA developer)\n"
            "       'very niche'→ rare specialists (e.g. embedded Rust, quantum computing)\n\n"
            "  2. Based on niche-ness AND candidates needed, decide how many DIVERSE "
            "search queries are needed to likely surface enough matching resumes.\n"
            "     Guidelines:\n"
            "       common   + candidates <= 5  → 3-4 queries\n"
            "       common   + candidates > 5   → 5-7 queries\n"
            "       moderate + candidates <= 5  → 5-6 queries\n"
            "       moderate + candidates > 5   → 7-9 queries\n"
            "       niche    + any             → 8-12 queries\n"
            "       very niche + any           → 12-15 queries\n\n"
            "  3. Generate exactly that many queries. Make them maximally diverse:\n"
            "       - Exact title synonyms (e.g. 'SWE' vs 'Software Engineer')\n"
            "       - Seniority variants (senior, lead, staff, principal)\n"
            "       - Tech-stack specific titles (e.g. 'Django developer')\n"
            "       - Domain specializations (e.g. 'ML platform engineer')\n"
            "       - Adjacent roles that would have the required skills\n\n"
            "Rules:\n"
            "  - Each query must be MEANINGFULLY different from the others\n"
            "  - Keep queries short: 2-5 words, lowercase only\n"
            "  - The count of 'queries' MUST equal 'estimated_queries_needed'\n\n"
            "Respond ONLY with JSON — no markdown fences, no commentary:\n"
            "{\n"
            '  "niche_level": "common" | "moderate" | "niche" | "very niche",\n'
            '  "estimated_queries_needed": <integer between 3 and 15>,\n'
            '  "reasoning": "one sentence explaining the count decision",\n'
            '  "queries": ["query1", "query2", ...]\n'
            "}"
        )
        try:
            llm      = _create_llm_with_temperature(temperature=0.6)
            response = await llm.ainvoke(prompt)
            data     = _parse_llm_json_response(response.content)

            raw_queries: list[str] = [
                v.lower() for v in data.get("queries", [])
                if isinstance(v, str) and v.strip()
            ]

            # Always prepend canonical role name, deduplicate the rest
            role_lower = role.lower()
            seen: set[str] = {role_lower}
            deduplicated = [role_lower] + [
                v for v in raw_queries
                if v not in seen and not seen.add(v)   # type: ignore[func-returns-value]
            ]

            plan = QueryPlan(
                niche_level              = str(data.get("niche_level", "moderate")),
                estimated_queries_needed = int(data.get("estimated_queries_needed", len(deduplicated))),
                reasoning                = str(data.get("reasoning", "")),
                queries                  = deduplicated,
            )

            log.info(
                f"[agent] generate_query_variants | role='{role}' "
                f"candidates_needed={candidates_needed} "
                f"niche={plan.niche_level} "
                f"estimated={plan.estimated_queries_needed} "
                f"actual={len(plan.queries)} | {plan.reasoning}"
            )
            log.debug(f"[agent] queries={plan.queries}")
            return plan

        except Exception as exc:
            log.warning(
                f"[agent] generate_query_variants failed: {exc} — using role name only"
            )
            return QueryPlan(
                niche_level              = "unknown",
                estimated_queries_needed = 1,
                reasoning                = f"LLM call failed ({exc}) — falling back to role name",
                queries                  = [role.lower()],
            )

    # ── 2. ADAPTIVE ADDITIONAL QUERY GENERATION ───────────────────────────────

    async def generate_additional_queries(
        self,
        role: str,
        required_skills: list[str],
        already_tried_queries: list[str],
        candidates_still_needed: int,
    ) -> list[str]:
        """
        Generate a fresh batch of queries that are explicitly different from
        queries already tried in this sourcing run.

        Called when the initial QueryPlan batch is exhausted but
        candidates_still_needed > 0. The agent sees what already failed and
        deliberately pivots its strategy — different framing, adjacent roles,
        broader or narrower scope, geography-neutral phrasing, etc.

        Falls back to an empty list on LLM error. The caller (scraping loop)
        treats an empty return as a signal to stop rather than error.

        Args:
            role:                    Target job title.
            required_skills:         Skills the role requires.
            already_tried_queries:   ALL queries run so far in this sourcing run
                                     (including both initial and any prior extra rounds).
            candidates_still_needed: How many more candidates are still required.

        Returns:
            List of new lowercase query strings, filtered to exclude anything
            already in already_tried_queries.
        """
        skills_str = ", ".join(required_skills[:8]) if required_skills else "not specified"
        tried_str  = "\n".join(f"  - {q}" for q in already_tried_queries)

        prompt = (
            f"You are a recruiter who has been searching for '{role}' candidates "
            f"without finding enough matches.\n"
            f"Required skills: {skills_str}\n"
            f"Still need: {candidates_still_needed} more candidates.\n\n"
            "Search queries already tried (ALL have been exhausted — do NOT repeat "
            "these or any close variants):\n"
            f"{tried_str}\n\n"
            "Generate 3-5 NEW search queries that take a completely different angle:\n"
            "  - Try adjacent or broader role titles that would still have the skills\n"
            "  - Try different seniority framing (e.g. 'lead', 'principal', 'architect')\n"
            "  - Try company-type specific titles (e.g. 'startup backend engineer')\n"
            "  - Try skill-first titles (e.g. 'kubernetes engineer' for a DevOps role)\n"
            "  - Try geography-neutral or remote-specific phrasing\n\n"
            "Rules:\n"
            "  - Each query must be MEANINGFULLY different from tried queries above\n"
            "  - Short: 2-5 words, lowercase only\n"
            "  - Prioritise angles NOT covered by the tried queries\n\n"
            "Respond ONLY with a JSON array of strings:\n"
            '["query1", "query2", ...]'
        )
        try:
            llm      = _create_llm_with_temperature(temperature=0.7)  # higher → more creative pivots
            response = await llm.ainvoke(prompt)
            variants: list[str] = _parse_llm_json_response(response.content)

            tried_set    = set(already_tried_queries)
            new_variants = [
                v.lower() for v in variants
                if isinstance(v, str)
                and v.strip()
                and v.lower() not in tried_set
            ]

            log.info(
                f"[agent] generate_additional_queries | role='{role}' "
                f"still_needed={candidates_still_needed} "
                f"new_queries={new_variants} "
                f"(from {len(already_tried_queries)} already tried)"
            )
            return new_variants

        except Exception as exc:
            log.warning(
                f"[agent] generate_additional_queries failed: {exc} — returning empty"
            )
            return []

    # ── 3. RESUME QUALITY CHECK ───────────────────────────────────────────────

    async def quality_check(
        self,
        scraped_text: str,
        role_context: str,
    ) -> QualityDecision:
        """
        Decide if scraped web content is a genuine, usable resume.

        Rejects job postings, error pages, boilerplate, and thin content.
        Falls back to accept=True on LLM failure to avoid blocking the pipeline.

        Args:
            scraped_text:  Raw text from a scraped URL.
            role_context:  Job role for context (used in the prompt).
        """
        prompt = (
            f"You are a resume screening expert evaluating scraped web content "
            f"for a '{role_context}' recruitment pipeline.\n\n"
            "Decide:\n"
            "  1. Is this a REAL resume/CV (not a job posting, error page, or garbage)?\n"
            "  2. Does it contain at least: a name OR skills OR work experience?\n\n"
            "Respond ONLY with JSON:\n"
            "{\n"
            '  "accept": true | false,\n'
            '  "reason": "one sentence",\n'
            '  "confidence": 0.0-1.0\n'
            "}\n\n"
            f"Text (first 1500 chars):\n{scraped_text[:1500]}"
        )
        try:
            llm      = _create_llm_with_temperature(temperature=0.0)
            response = await llm.ainvoke(prompt)
            data     = _parse_llm_json_response(response.content)
            decision = QualityDecision(
                accept=bool(data.get("accept", True)),
                reason=str(data.get("reason", "")),
                confidence=float(data.get("confidence", 1.0)),
            )
            log.info(
                f"[agent] quality_check accept={decision.accept} "
                f"conf={decision.confidence:.2f} | {decision.reason[:80]}"
            )
            return decision

        except Exception as exc:
            log.warning(f"[agent] quality_check failed: {exc} — defaulting to accept")
            return QualityDecision(
                accept=True,
                reason="LLM check failed — defaulting to accept",
                confidence=0.5,
            )

    # ── 4. FIT SUMMARY ────────────────────────────────────────────────────────

    async def fit_summary(
        self,
        resume_text: str,
        role: str,
        required_skills: list[str],
        job_description: str | None = None,
    ) -> str:
        """
        Write a 1-2 sentence recruiter-facing summary of a candidate's fit.

        Uses the candidate's real name, concrete experience, and highlights gaps.
        Optionally uses the full job description for richer alignment context.
        Falls back to an empty string on LLM failure.

        Args:
            resume_text:      Full parsed resume text.
            role:             Target job title.
            required_skills:  Required skills for the role.
            job_description:  Optional full JD text for richer context.
        """
        skills_str = ", ".join(required_skills) if required_skills else "not specified"
        jd_context = (
            f"\nJob description context:\n{job_description[:800]}"
            if job_description else ""
        )
        prompt = (
            f"You are a senior recruiter writing a quick candidate briefing.\n"
            f"Role: '{role}' | Required skills: {skills_str}{jd_context}\n\n"
            "Write a 1-2 sentence summary of this candidate's fit. Rules:\n"
            "  - Use their ACTUAL NAME from the resume if you can find it\n"
            "  - Mention their most relevant experience or tech stack concretely\n"
            "  - Note approximate years of experience if visible\n"
            "  - Briefly mention meaningful gaps vs the role\n"
            "  - Do NOT say 'the candidate' — use name or 'This engineer', etc.\n"
            "  - No filler like 'strong background' without specifics\n\n"
            "Return ONLY the summary sentences. No labels, no JSON.\n\n"
            f"Resume (first 2000 chars):\n{resume_text}"
        )
        try:
            llm      = _create_llm_with_temperature(temperature=0.2)
            response = await llm.ainvoke(prompt)
            summary  = response.content.strip()
            log.info(f"[agent] fit_summary: {summary[:100]}...")
            return summary
        except Exception as exc:
            log.warning(f"[agent] fit_summary failed: {exc}")
            return ""

    # ── 5. SEARCH STRATEGY SUGGESTION ─────────────────────────────────────────

    async def suggest_search_strategy(
        self,
        role: str,
        required_skills: list[str],
        required_min_experience_years: int,
        current_internal_pool_size: int = 0,
    ) -> SearchStrategy:
        """
        Suggest a sourcing mode (internal / external / both) and pass priorities.

        Niche or senior roles push toward external sourcing harder.
        Common roles with a healthy internal pool prefer internal-first.
        Falls back to "both" with all passes enabled on LLM failure.

        Args:
            role:                          Target job title.
            required_skills:               Skills the role requires.
            required_min_experience_years: Minimum full-time years required.
            current_internal_pool_size:    How many internal candidates already exist.
        """
        skills_str = ", ".join(required_skills) if required_skills else "not specified"
        prompt = (
            f"You are a sourcing strategist. A recruiter needs to fill a '{role}' role.\n"
            f"Required skills: {skills_str}\n"
            f"Minimum experience: {required_min_experience_years} years\n"
            f"Current internal candidate pool size: {current_internal_pool_size}\n\n"
            "Recommend a sourcing strategy.\n\n"
            "Respond ONLY with JSON:\n"
            "{\n"
            '  "suggested_mode": "internal" | "external" | "both",\n'
            '  "priority_passes": ["pass1", "pass2", ...],\n'
            '  "extra_queries": ["query1", "query2"],\n'
            '  "reasoning": "one sentence"\n'
            "}\n\n"
            "Pass names: pass1 (this job applied), pass2 (closed jobs), "
            "pass3 (open jobs), pass4 (db_match), pass5 (prev_sourced), pass6 (external)"
        )
        try:
            llm      = _create_llm_with_temperature(temperature=0.1)
            response = await llm.ainvoke(prompt)
            data     = _parse_llm_json_response(response.content)
            strategy = SearchStrategy(
                suggested_mode  = str(data.get("suggested_mode", "both")),
                priority_passes = list(data.get("priority_passes", [])),
                extra_queries   = list(data.get("extra_queries", [])),
                reasoning       = str(data.get("reasoning", "")),
            )
            log.info(
                f"[agent] strategy mode={strategy.suggested_mode} | {strategy.reasoning}"
            )
            return strategy

        except Exception as exc:
            log.warning(
                f"[agent] suggest_search_strategy failed: {exc} — using defaults"
            )
            return SearchStrategy(
                suggested_mode  = "both",
                priority_passes = ["pass1", "pass2", "pass3", "pass4", "pass5", "pass6"],
                extra_queries   = [],
                reasoning       = "Fallback: LLM strategy suggestion failed",
            )

    # ── 6. BACKGROUND / ROLE RELEVANCE CHECK ──────────────────────────────────

    async def background_matches_role(
        self,
        resume_text: str,
        role: str,
        required_skills: list[str],
    ) -> BackgroundDecision:
        """
        Check whether a candidate's overall career background fits the role.

        Used as a second gate after the 50%-skill match to prevent noise:
        e.g. a graphic designer with "Python" listed won't pass for a backend role.

        Intentionally INCLUSIVE — only rejects if the background is clearly in
        a completely different field (pure marketing, pure design, pure finance
        for a software role). Falls back to matches=True on LLM failure.

        Args:
            resume_text:      Full parsed resume text.
            role:             Target job title.
            required_skills:  Skills associated with the role.
        """
        skills_str = ", ".join(required_skills) if required_skills else "not specified"
        prompt = (
            f"You are a technical recruiter checking role alignment.\n"
            f"Target role: '{role}'\n"
            f"Skills associated with this role: {skills_str}\n\n"
            "Read the candidate's resume and decide:\n"
            "  Does their OVERALL BACKGROUND broadly fit the target role?\n\n"
            "Be INCLUSIVE — reject only if the background is clearly in a different field\n"
            "(e.g. pure marketing, pure design, pure finance for a software role).\n\n"
            "Respond ONLY with JSON:\n"
            "{\n"
            '  "matches": true | false,\n'
            '  "reason": "one sentence"\n'
            "}\n\n"
            f"Resume (first 1800 chars):\n{resume_text}"
        )
        try:
            llm      = _create_llm_with_temperature(temperature=0.0)
            response = await llm.ainvoke(prompt)
            data     = _parse_llm_json_response(response.content)
            decision = BackgroundDecision(
                matches=bool(data.get("matches", True)),
                reason=str(data.get("reason", "")),
            )
            log.info(
                f"[agent] background_matches_role matches={decision.matches} | "
                f"{decision.reason[:100]}"
            )
            return decision

        except Exception as exc:
            log.warning(
                f"[agent] background_matches_role failed: {exc} — defaulting to match"
            )
            return BackgroundDecision(
                matches=True,
                reason="LLM check failed — defaulting to match",
            )