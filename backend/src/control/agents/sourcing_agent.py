"""
src/control/agents/sourcing_agent.py

Intelligent Sourcing Agent
──────────────────────────
Encapsulates ALL LLM decision-making for the sourcing pipeline.
sourcing_service.py imports this agent and delegates every AI call to it.

Responsibilities
────────────────
  1. generate_query_variants()   — expand a role into diverse search queries
  2. quality_check()             — decide if scraped text is a real, useful resume
  3. fit_summary()               — write a recruiter-facing candidate summary
  4. evaluate_candidate()        — holistic multi-signal fit score + reasoning
  5. rerank()                    — re-order a pool using LLM judgment (not just vectors)
  6. suggest_search_strategy()   — given role + skills, suggest mode & pass priority
  7. background_matches_role()   — check if candidate's background broadly fits the role
                                   even when only a partial skill match was found (any-match)

Design principles
─────────────────
- Stateless: every method is async, accepts plain data, returns plain data.
- Retry-safe: each method has its own fallback so a single LLM failure never
  crashes the pipeline.
- Observable: every decision is logged with [agent] prefix.
- Swappable: the LLM is injected via _get_llm().
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

from src.observability.logging.logger import setup_logger

log = setup_logger()


# ─────────────────────────────────────────────────────────────────────────────
# LLM FACTORY
# ─────────────────────────────────────────────────────────────────────────────

def _get_llm(temperature: float = 0.0):
    """
    Central LLM factory.  Swap model or provider here — nothing else changes.
    Currently: Groq llama-3.1-8b-instant (fast, free-tier friendly).
    """
    from langchain_groq import ChatGroq
    from src.config.settings import settings

    return ChatGroq(
        model="llama-3.1-8b-instant",
        temperature=temperature,
        api_key=settings.GROQ_API_KEY,
    )


def _parse_json(raw: str) -> Any:
    """
    Strip markdown fences then parse JSON.

    Fix: use lstrip() after removing the 'json' label so that both
    '```json\\n[...]```' and '```json [...]```' (space variant) are handled
    correctly without leaving a leading whitespace character that could
    break json.loads in strict parsers.
    """
    text = raw.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1] if len(parts) > 1 else text
        if text.startswith("json"):
            text = text[4:].lstrip()   # lstrip handles \n, space, or \r\n
    return json.loads(text.strip())


# ─────────────────────────────────────────────────────────────────────────────
# DATA CLASSES  (structured agent outputs)
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class QualityDecision:
    accept: bool
    reason: str
    confidence: float = 1.0          # 0-1, how sure the agent is


@dataclass
class CandidateEvaluation:
    fit_score: float                  # 0-1  LLM holistic score
    fit_summary: str                  # 1-2 sentence recruiter summary
    strengths: list[str] = field(default_factory=list)
    gaps: list[str] = field(default_factory=list)
    recommended: bool = True


@dataclass
class SearchStrategy:
    suggested_mode: str               # "internal" | "external" | "both"
    priority_passes: list[str]        # ordered list of pass names to try first
    extra_queries: list[str]          # bonus search terms beyond role name
    reasoning: str


@dataclass
class BackgroundDecision:
    """
    Result of background_matches_role().

    matches  — True if the candidate's overall background is relevant to the role,
               even if they only matched a subset of the required skills.
    reason   — one-sentence explanation for logging / recruiter visibility.
    """
    matches: bool
    reason: str


# ─────────────────────────────────────────────────────────────────────────────
# SOURCING AGENT
# ─────────────────────────────────────────────────────────────────────────────

class SourcingAgent:
    """
    Intelligent agent for candidate sourcing decisions.

    Usage (in sourcing_service.py):
        from src.control.agents.sourcing_agent import SourcingAgent
        agent = SourcingAgent()

        queries   = await agent.generate_query_variants(role, skills)
        quality   = await agent.quality_check(text, role)
        bg        = await agent.background_matches_role(text, role, skills)
        eval_     = await agent.evaluate_candidate(text, role, skills)
        reranked  = await agent.rerank(pool, role, skills)
        strategy  = await agent.suggest_search_strategy(role, skills, min_exp)
    """

    # ── 1. QUERY VARIANT GENERATION ───────────────────────────────────────────

    async def generate_query_variants(
        self,
        role: str,
        skills: list[str],
        count: int = 5,
    ) -> list[str]:
        """
        Expand a job role into diverse search queries.

        Intelligence:
          - Generates synonyms, related titles, specializations
          - Avoids semantic duplicates
          - Always includes the raw role as first query (guaranteed baseline)

        Returns list of lowercase query strings, role first.
        """
        skills_str = ", ".join(skills[:6]) if skills else "not specified"
        prompt = (
            f"You are an expert technical recruiter building search queries to find "
            f"candidates for a '{role}' position.\n"
            f"Key skills required: {skills_str}\n\n"
            f"Generate {count} DIVERSE search queries to find relevant candidates on "
            f"job boards and resume databases.\n\n"
            "Think about:\n"
            "  - Exact job title synonyms (e.g. 'SWE' vs 'Software Engineer')\n"
            "  - Seniority variants (senior, lead, staff, principal)\n"
            "  - Tech-stack specific titles (e.g. 'Django developer' for a Python role)\n"
            "  - Domain specializations (e.g. 'ML engineer', 'data engineer')\n"
            "  - Industry-specific naming conventions\n\n"
            "Rules:\n"
            "  - Each query must be meaningfully DIFFERENT from the others\n"
            "  - Keep queries short (2-5 words) for best search recall\n"
            "  - Lowercase only\n\n"
            "Respond ONLY with a JSON array of strings, no explanation:\n"
            '["query1", "query2", ...]'
        )
        try:
            llm = _get_llm(temperature=0.6)
            response = await llm.ainvoke(prompt)
            variants: list[str] = _parse_json(response.content)
            variants = [v.lower() for v in variants if isinstance(v, str)]

            # Always lead with the exact role, deduplicate the rest
            role_lower = role.lower()
            others = [v for v in variants if v != role_lower]
            all_queries = [role_lower] + others

            log.info(f"[agent] Query variants for '{role}': {all_queries}")
            return all_queries

        except Exception as exc:
            log.warning(f"[agent] generate_query_variants failed: {exc} — using role only")
            return [role.lower()]

    # ── 2. RESUME QUALITY CHECK ───────────────────────────────────────────────

    async def quality_check(
        self,
        text: str,
        role: str,
    ) -> QualityDecision:
        """
        Decide if scraped text is a genuine, usable resume.

        Intelligence:
          - Detects job postings disguised as resumes
          - Rejects error pages, boilerplate, spam
          - Checks minimum content threshold (name/skills/experience present)
          - Returns confidence score so caller can apply thresholds

        Falls back to accept=True if LLM fails (don't block pipeline).
        """
        prompt = (
            f"You are a resume screening expert evaluating scraped web content "
            f"for a '{role}' recruitment pipeline.\n\n"
            "Analyze the following text and decide:\n"
            "  1. Is this a REAL resume/CV (not a job posting, error page, or garbage)?\n"
            "  2. Does it have enough content to be useful?\n"
            "     (Must have at least: a name OR skills OR work experience)\n\n"
            "Be strict — bad data wastes recruiter time.\n\n"
            "Respond ONLY with a JSON object:\n"
            "{\n"
            '  "accept": true | false,\n'
            '  "reason": "one sentence explanation",\n'
            '  "confidence": 0.0-1.0\n'
            "}\n\n"
            f"Text (first 1500 chars):\n{text[:1500]}"
        )
        try:
            llm = _get_llm(temperature=0.0)
            response = await llm.ainvoke(prompt)
            data = _parse_json(response.content)
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

    # ── 3. FIT SUMMARY ────────────────────────────────────────────────────────

    async def fit_summary(
        self,
        text: str,
        role: str,
        skills: list[str],
    ) -> str:
        """
        Write a concise, recruiter-facing candidate summary.

        Intelligence:
          - Uses candidate's actual name if found in the text
          - Mentions real experience years and specific technologies
          - Highlights alignment gaps honestly
          - Avoids generic filler phrases

        Returns plain text string (1-2 sentences).
        """
        skills_str = ", ".join(skills) if skills else "not specified"
        prompt = (
            f"You are a senior recruiter writing a quick candidate briefing.\n"
            f"Role: '{role}' | Required skills: {skills_str}\n\n"
            "Write a 1-2 sentence summary of this candidate's fit. Rules:\n"
            "  - Use their ACTUAL NAME from the resume if you can find it\n"
            "  - Mention their most relevant experience or tech stack concretely\n"
            "  - Note the approximate years of experience if visible\n"
            "  - If there are meaningful gaps vs the role, mention them briefly\n"
            "  - Do NOT say 'the candidate' — use name or 'This engineer', etc.\n"
            "  - Do NOT use filler like 'strong background' without specifics\n\n"
            "Return ONLY the summary sentences. No labels, no JSON.\n\n"
            f"Resume (first 2000 chars):\n{text[:2000]}"
        )
        try:
            llm = _get_llm(temperature=0.2)
            response = await llm.ainvoke(prompt)
            summary = response.content.strip()
            log.info(f"[agent] fit_summary: {summary[:100]}...")
            return summary

        except Exception as exc:
            log.warning(f"[agent] fit_summary failed: {exc}")
            return ""

    # ── 4. HOLISTIC CANDIDATE EVALUATION ─────────────────────────────────────

    async def evaluate_candidate(
        self,
        text: str,
        role: str,
        skills: list[str],
        min_exp: int = 0,
    ) -> CandidateEvaluation:
        """
        Deep evaluation of a single candidate against a role.

        Intelligence beyond rule/semantic scores:
          - Reads between the lines (career progression, project quality)
          - Identifies transferable skills not in the required list
          - Flags red flags (gaps, job-hopping, irrelevant experience)
          - Returns structured strengths/gaps for the recruiter UI

        NOTE: currently not called by sourcing_service.py — fit_summary() is
        used instead. Wire into _score_pool or remove if not planned.
        """
        skills_str = ", ".join(skills) if skills else "not specified"
        prompt = (
            f"You are an expert technical recruiter evaluating a candidate for '{role}'.\n"
            f"Required skills: {skills_str}\n"
            f"Minimum experience: {min_exp} years\n\n"
            "Read the resume text and return a structured evaluation.\n\n"
            "Respond ONLY with a JSON object:\n"
            "{\n"
            '  "fit_score": 0.0-1.0,\n'
            '  "fit_summary": "1-2 sentence recruiter briefing using their name",\n'
            '  "strengths": ["specific strength 1", "specific strength 2"],\n'
            '  "gaps": ["gap 1", "gap 2"],\n'
            '  "recommended": true | false\n'
            "}\n\n"
            "Scoring guide:\n"
            "  0.9-1.0  Exceptional match, rare profile\n"
            "  0.7-0.89 Strong match, worth interviewing\n"
            "  0.5-0.69 Partial match, transferable skills present\n"
            "  0.3-0.49 Weak match, significant gaps\n"
            "  0.0-0.29 Not a match\n\n"
            f"Resume (first 2500 chars):\n{text[:2500]}"
        )
        try:
            llm = _get_llm(temperature=0.1)
            response = await llm.ainvoke(prompt)
            data = _parse_json(response.content)
            result = CandidateEvaluation(
                fit_score=float(data.get("fit_score", 0.5)),
                fit_summary=str(data.get("fit_summary", "")),
                strengths=list(data.get("strengths", [])),
                gaps=list(data.get("gaps", [])),
                recommended=bool(data.get("recommended", True)),
            )
            log.info(
                f"[agent] evaluate_candidate score={result.fit_score:.2f} "
                f"recommended={result.recommended} | {result.fit_summary[:80]}"
            )
            return result

        except Exception as exc:
            log.warning(f"[agent] evaluate_candidate failed: {exc} — returning defaults")
            return CandidateEvaluation(
                fit_score=0.5,
                fit_summary="",
                strengths=[],
                gaps=[],
                recommended=True,
            )

    # ── 5. LLM RE-RANK ────────────────────────────────────────────────────────

    async def rerank(
        self,
        pool: list[dict],
        role: str,
        skills: list[str],
        top_n: int = 20,
    ) -> list[dict]:
        """
        Re-order the top candidates using LLM holistic judgment.

        Why: vector + rule scores miss nuance — career trajectory, project
        relevance, title inflation. This pass catches that.

        Only runs on top_n candidates (default 20) to keep latency bounded.
        Candidates below top_n are appended unchanged after the reranked block.

        Returns the full pool with 'llm_rank' field added.
        """
        if not pool:
            return pool

        candidates_to_rank = pool[:top_n]
        rest = pool[top_n:]

        summaries = []
        for i, c in enumerate(candidates_to_rank):
            summaries.append(
                f"{i}: {c.get('name', 'Unknown')} | "
                f"tag={c.get('source_tag', '?')} | "
                f"score={c.get('final_score', 0):.3f} | "
                f"summary={str(c.get('fit_summary', ''))[:120]}"
            )

        skills_str = ", ".join(skills) if skills else "not specified"
        prompt = (
            f"You are a senior recruiter re-ranking {len(candidates_to_rank)} candidates "
            f"for a '{role}' role.\n"
            f"Required skills: {skills_str}\n\n"
            "The candidates are pre-scored by a vector+rule system. "
            "Your job is to re-order them based on holistic judgment — "
            "consider career trajectory, seniority signals, and role alignment.\n\n"
            "Candidates (index: name | source | score | summary):\n"
            + "\n".join(summaries)
            + "\n\n"
            "Return ONLY a JSON array of the original indices in your preferred order "
            "(best first):\n"
            "[3, 0, 7, 1, ...]"
        )
        try:
            llm = _get_llm(temperature=0.0)
            response = await llm.ainvoke(prompt)
            order: list[int] = _parse_json(response.content)

            # Validate: deduplicate first, then fill any missing indices.
            expected = set(range(len(candidates_to_rank)))
            seen: set[int] = set()
            deduped: list[int] = []
            for i in order:
                if i in expected and i not in seen:
                    deduped.append(i)
                    seen.add(i)
            missing = [i for i in range(len(candidates_to_rank)) if i not in seen]
            order = deduped + missing

            reranked = [candidates_to_rank[i] for i in order]
            for llm_rank, c in enumerate(reranked, start=1):
                c["llm_rank"] = llm_rank

            log.info(f"[agent] rerank complete | new_order={order[:10]}...")
            return reranked + rest

        except Exception as exc:
            log.warning(f"[agent] rerank failed: {exc} — keeping original order")
            return pool

    # ── 6. SEARCH STRATEGY SUGGESTION ────────────────────────────────────────

    async def suggest_search_strategy(
        self,
        role: str,
        skills: list[str],
        min_exp: int,
        internal_pool_size: int = 0,
    ) -> SearchStrategy:
        """
        Suggest sourcing mode and pass priorities given the job context.

        Intelligence:
          - Niche roles → push external scraping harder
          - Common roles → internal pool likely sufficient first
          - High exp requirement → skip pass1 pending candidates
          - Returns extra_queries for niche tech stacks
        """
        skills_str = ", ".join(skills) if skills else "not specified"
        prompt = (
            f"You are a sourcing strategist. A recruiter needs to fill a '{role}' role.\n"
            f"Required skills: {skills_str}\n"
            f"Minimum experience: {min_exp} years\n"
            f"Current internal candidate pool size: {internal_pool_size}\n\n"
            "Recommend a sourcing strategy.\n\n"
            "Respond ONLY with a JSON object:\n"
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
            llm = _get_llm(temperature=0.1)
            response = await llm.ainvoke(prompt)
            data = _parse_json(response.content)
            strategy = SearchStrategy(
                suggested_mode=str(data.get("suggested_mode", "both")),
                priority_passes=list(data.get("priority_passes", [])),
                extra_queries=list(data.get("extra_queries", [])),
                reasoning=str(data.get("reasoning", "")),
            )
            log.info(
                f"[agent] suggest_search_strategy mode={strategy.suggested_mode} | "
                f"{strategy.reasoning}"
            )
            return strategy

        except Exception as exc:
            log.warning(f"[agent] suggest_search_strategy failed: {exc} — using defaults")
            return SearchStrategy(
                suggested_mode="both",
                priority_passes=["pass1", "pass2", "pass3", "pass4", "pass5", "pass6"],
                extra_queries=[],
                reasoning="Fallback: LLM strategy suggestion failed",
            )

    # ── 7. BACKGROUND / ROLE RELEVANCE CHECK ─────────────────────────────────

    async def background_matches_role(
        self,
        text: str,
        role: str,
        skills: list[str],
    ) -> BackgroundDecision:
        """
        Determine whether a candidate's overall background is broadly relevant
        to the target role, even when only a partial skill match was found
        (because eligibility now uses ANY-skill matching).

        This prevents noise like a graphic designer slipping through because
        they listed "Python" in a tools section when hiring for a backend role.

        Intelligence:
          - Looks at job titles, domains, and career trajectory holistically.
          - Does NOT require all skills — it checks general role alignment.
          - A backend developer with some frontend exposure matches a
            "Full Stack" role even if they only matched 1 of 5 skills.
          - A marketing manager does NOT match a "Senior Python Engineer" role
            even if they listed one Python skill.

        Falls back to matches=True on LLM failure so the pipeline never stalls.
        """
        skills_str = ", ".join(skills) if skills else "not specified"
        prompt = (
            f"You are a technical recruiter checking role alignment.\n"
            f"Target role: '{role}'\n"
            f"Skills associated with this role: {skills_str}\n\n"
            "Read the candidate's resume (first 1800 chars) and decide:\n"
            "  Does this person's OVERALL BACKGROUND broadly fit the target role?\n\n"
            "Key questions to consider:\n"
            "  - Are their past job titles or domains relevant to the role?\n"
            "  - Does their career trajectory point toward this type of work?\n"
            "  - Would a reasonable recruiter shortlist them for an interview?\n\n"
            "Be INCLUSIVE — candidates with partial skill matches should pass\n"
            "as long as their background is in the right domain.\n"
            "Only REJECT if the background is clearly in a different field\n"
            "(e.g. pure marketing, pure design, pure finance for a software role).\n\n"
            "Respond ONLY with a JSON object:\n"
            "{\n"
            '  "matches": true | false,\n'
            '  "reason": "one sentence explanation"\n'
            "}\n\n"
            f"Resume (first 1800 chars):\n{text[:1800]}"
        )
        try:
            llm = _get_llm(temperature=0.0)
            response = await llm.ainvoke(prompt)
            data = _parse_json(response.content)
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
                reason="LLM background check failed — defaulting to match",
            )