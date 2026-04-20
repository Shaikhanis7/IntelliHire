"""
src/control/agents/jd_generation_agent.py

JD Generation Agent  (v1)
──────────────────────────
Generates structured, professional Job Descriptions from minimal recruiter input.

Responsibilities:
  1. generate_jd()  — produce a full JD (title, summary, responsibilities,
                       requirements, nice-to-haves, benefits) from role + skills
  2. enhance_jd()   — rewrite/improve a recruiter-drafted description
  3. extract_skills_from_jd() — parse skills out of a free-text JD

Design principles:
  - Stateless: every method is async, accepts plain data, returns plain data.
  - Retry-safe: each method falls back gracefully on LLM error.
  - Observable: every decision logged with [jd_agent] prefix.
"""

from __future__ import annotations

import json

from pydantic import BaseModel, Field

from src.observability.logging.logger import setup_logger

log = setup_logger()


# ─────────────────────────────────────────────────────────────────────────────
# LLM FACTORY  (reuse same pattern as SourcingAgent)
# ─────────────────────────────────────────────────────────────────────────────

def _create_llm(temperature: float = 0.4):
    from langchain_groq import ChatGroq
    from src.config.settings import settings
    return ChatGroq(
        model="llama-3.1-8b-instant",
        temperature=temperature,
        api_key=settings.GROQ_API_KEY,
    )


def _parse_json(raw: str):
    text = raw.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text  = parts[1] if len(parts) > 1 else text
        if text.startswith("json"):
            text = text[4:].lstrip()
    return json.loads(text.strip())


# ─────────────────────────────────────────────────────────────────────────────
# RESPONSE MODELS
# ─────────────────────────────────────────────────────────────────────────────

class GeneratedJD(BaseModel):
    """
    Structured output from generate_jd().

    All fields are plain strings so they can be serialised directly to JSON
    and rendered on the frontend with no further transformation.
    """
    title:            str
    summary:          str                    # 2-3 sentence role overview
    responsibilities: list[str]              # 5-8 bullet points
    requirements:     list[str]              # must-have qualifications
    nice_to_have:     list[str]              # preferred / bonus qualifications
    benefits:         list[str]              # perks / what we offer
    suggested_skills: list[str]             # extracted/inferred skills list
    full_description: str                    # prose JD ready to paste into the form


class EnhancedJD(BaseModel):
    enhanced_description: str
    suggested_skills:     list[str]
    improvement_notes:    str


# ─────────────────────────────────────────────────────────────────────────────
# JD GENERATION AGENT
# ─────────────────────────────────────────────────────────────────────────────

class JDGenerationAgent:

    # ── 1. GENERATE FULL JD ───────────────────────────────────────────────────

    async def generate_jd(
        self,
        title: str,
        skills: list[str],
        experience_years: int = 0,
        location: str | None = None,
        extra_context: str | None = None,
    ) -> GeneratedJD:
        """
        Generate a complete, professional Job Description from minimal input.

        The agent infers:
          - A compelling role summary for the given title
          - Day-to-day responsibilities scoped to the skill set
          - Must-have requirements (experience + skills)
          - Nice-to-have additions that make strong candidates stand out
          - Generic but relevant benefits section
          - A stitched-together `full_description` ready for the form textarea

        Falls back to a minimal placeholder JD on LLM error so the pipeline
        is never blocked.

        Args:
            title:           Job title (e.g. "Senior Backend Engineer")
            skills:          Required skills list
            experience_years: Minimum years of experience
            location:        Office location or "Remote"
            extra_context:   Any additional recruiter notes / context

        Returns:
            GeneratedJD with all structured fields + full_description string.
        """
        skills_str   = ", ".join(skills) if skills else "not specified"
        loc_str      = location or "flexible / remote"
        exp_str      = f"{experience_years}+ years" if experience_years else "not specified"
        context_line = f"\nAdditional context from recruiter: {extra_context}" if extra_context else ""

        prompt = (
            f"You are a senior technical recruiter writing a compelling job description.\n"
            f"Role title: '{title}'\n"
            f"Required skills: {skills_str}\n"
            f"Minimum experience: {exp_str}\n"
            f"Location: {loc_str}{context_line}\n\n"
            "Generate a complete, professional JD. Rules:\n"
            "  - Be specific to the title and skills — no generic filler\n"
            "  - Responsibilities: 6-8 concrete day-to-day items\n"
            "  - Requirements: must-have skills, experience, and qualifications\n"
            "  - Nice-to-have: 3-5 bonus items that differentiate strong candidates\n"
            "  - Benefits: 4-6 items relevant to tech roles\n"
            "  - suggested_skills: extract or infer a clean list of skills (10-15 items)\n"
            "  - full_description: stitch everything into clean prose paragraphs "
            "(not bullet points) — this goes directly into a form textarea\n\n"
            "Respond ONLY with JSON — no markdown fences, no commentary:\n"
            "{\n"
            '  "title": "exact role title",\n'
            '  "summary": "2-3 sentence overview",\n'
            '  "responsibilities": ["item1", "item2", ...],\n'
            '  "requirements": ["item1", "item2", ...],\n'
            '  "nice_to_have": ["item1", "item2", ...],\n'
            '  "benefits": ["item1", "item2", ...],\n'
            '  "suggested_skills": ["skill1", "skill2", ...],\n'
            '  "full_description": "prose paragraphs ready for a form field"\n'
            "}"
        )

        try:
            llm      = _create_llm(temperature=0.5)
            response = await llm.ainvoke(prompt)
            data     = _parse_json(response.content)

            jd = GeneratedJD(
                title            = str(data.get("title",            title)),
                summary          = str(data.get("summary",          "")),
                responsibilities = list(data.get("responsibilities", [])),
                requirements     = list(data.get("requirements",    [])),
                nice_to_have     = list(data.get("nice_to_have",    [])),
                benefits         = list(data.get("benefits",        [])),
                suggested_skills = list(data.get("suggested_skills", skills)),
                full_description = str(data.get("full_description", "")),
            )

            log.info(
                f"[jd_agent] generate_jd | title='{title}' "
                f"skills={len(skills)} responsibilities={len(jd.responsibilities)}"
            )
            return jd

        except Exception as exc:
            log.warning(f"[jd_agent] generate_jd failed: {exc} — returning minimal JD")
            fallback_desc = (
                f"We are looking for a talented {title} to join our team. "
                f"The ideal candidate will have experience with {skills_str}. "
                f"This role requires {exp_str} of relevant experience."
            )
            return GeneratedJD(
                title            = title,
                summary          = fallback_desc,
                responsibilities = ["To be defined by the hiring team."],
                requirements     = [f"{exp_str} experience", skills_str],
                nice_to_have     = [],
                benefits         = ["Competitive salary", "Flexible working", "Health insurance"],
                suggested_skills = skills,
                full_description = fallback_desc,
            )

    # ── 2. ENHANCE EXISTING DESCRIPTION ──────────────────────────────────────

    async def enhance_jd(
        self,
        title: str,
        raw_description: str,
        skills: list[str],
    ) -> EnhancedJD:
        """
        Rewrite and improve a recruiter-drafted description.

        Keeps the recruiter's intent but fixes grammar, improves clarity,
        adds missing standard sections, and returns a polished version.

        Falls back to the original description on LLM failure.
        """
        skills_str = ", ".join(skills) if skills else "not specified"

        prompt = (
            f"You are editing a job description for '{title}'.\n"
            f"Skills: {skills_str}\n\n"
            "Improve the following draft:\n"
            "  - Fix grammar and clarity\n"
            "  - Make it more compelling and specific\n"
            "  - Ensure it covers: role overview, responsibilities, requirements\n"
            "  - Extract or infer a clean skills list\n"
            "  - Note what was improved in 1 sentence\n\n"
            "Respond ONLY with JSON:\n"
            "{\n"
            '  "enhanced_description": "improved prose",\n'
            '  "suggested_skills": ["skill1", ...],\n'
            '  "improvement_notes": "one sentence summary of changes"\n'
            "}\n\n"
            f"Draft:\n{raw_description[:3000]}"
        )

        try:
            llm      = _create_llm(temperature=0.3)
            response = await llm.ainvoke(prompt)
            data     = _parse_json(response.content)

            result = EnhancedJD(
                enhanced_description = str(data.get("enhanced_description", raw_description)),
                suggested_skills     = list(data.get("suggested_skills", skills)),
                improvement_notes    = str(data.get("improvement_notes", "")),
            )
            log.info(f"[jd_agent] enhance_jd | title='{title}' | {result.improvement_notes[:80]}")
            return result

        except Exception as exc:
            log.warning(f"[jd_agent] enhance_jd failed: {exc} — returning original")
            return EnhancedJD(
                enhanced_description = raw_description,
                suggested_skills     = skills,
                improvement_notes    = f"Enhancement failed: {exc}",
            )

    # ── 3. EXTRACT SKILLS FROM FREE-TEXT JD ──────────────────────────────────

    async def extract_skills_from_jd(self, description: str) -> list[str]:
        """
        Parse a free-text job description and return a clean, deduplicated
        list of technical and soft skills.

        Falls back to an empty list on LLM failure.
        """
        prompt = (
            "Extract all technical skills, tools, frameworks, languages, and "
            "relevant qualifications from the following job description.\n"
            "Rules:\n"
            "  - Return only the skill names, no explanations\n"
            "  - Deduplicate (e.g. 'React.js' and 'ReactJS' → 'React')\n"
            "  - 8-20 items, title-case\n"
            "  - Include both hard and soft skills if prominent\n\n"
            "Respond ONLY with a JSON array:\n"
            '["Skill1", "Skill2", ...]\n\n'
            f"Job description:\n{description[:3000]}"
        )

        try:
            llm      = _create_llm(temperature=0.1)
            response = await llm.ainvoke(prompt)
            skills: list[str] = _parse_json(response.content)
            clean = [str(s).strip() for s in skills if s and str(s).strip()]
            log.info(f"[jd_agent] extract_skills → {clean}")
            return clean
        except Exception as exc:
            log.warning(f"[jd_agent] extract_skills failed: {exc}")
            return []