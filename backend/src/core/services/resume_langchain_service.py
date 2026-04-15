"""
src/core/services/resume_langchain_service.py

LangChain-powered resume section extraction + embedding generation.
Uses Groq as the LLM backend (ultra-fast inference via groq API).

Changes (full-time experience update):
  - ExperienceEntry: added `is_fulltime: bool = True` — LLM classifies each
    role as full-time or not (intern, freelance, contract, part-time, etc.).
  - _SYSTEM_PROMPT: instructs LLM to populate is_fulltime and years ONLY for
    full-time roles (internships/part-time/freelance → years=0, is_fulltime=False).
  - ResumeSectionEmbedder.total_experience_years(): sums ONLY full-time entries.
  - section_texts(): experience section text prioritises full-time roles,
    placing them first so embeddings give them higher weight.
"""

from __future__ import annotations

from src.config.settings import settings

import io
import json
import logging
from typing import Optional

from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from pydantic import BaseModel, Field
from src.observability.logging.logger import setup_logger

log = setup_logger()


# ═══════════════════════════════════════════════════════════════════════════════
# 1.  PYDANTIC SCHEMA  — defines the JSON the LLM must return
# ═══════════════════════════════════════════════════════════════════════════════

class ContactInfo(BaseModel):
    name:     str = ""
    email:    str = ""
    phone:    str = ""
    location: str = ""
    linkedin: str = ""
    github:   str = ""


class EducationEntry(BaseModel):
    degree:      str = ""
    institution: str = ""
    year:        str = ""
    gpa:         str = ""


class ExperienceEntry(BaseModel):
    title:    str = ""
    company:  str = ""
    duration: str = ""
    location: str = ""
    bullets:  list[str] = Field(default_factory=list)

    # Total years spent in THIS role, as a strict non-negative integer.
    # Derive from duration string (e.g. "Jan 2019 – Mar 2023" → 4).
    # Return 0 if the duration cannot be determined OR if is_fulltime=False.
    years: int = 0

    # True  → full-time permanent/contract employment
    # False → internship, part-time, freelance, volunteer, apprenticeship,
    #         co-op, or any role explicitly marked as non-full-time
    is_fulltime: bool = True


class ProjectEntry(BaseModel):
    title:       str = ""
    description: str = ""
    tech:        list[str] = Field(default_factory=list)
    url:         str = ""


class ParsedResumeSchema(BaseModel):
    contact:        ContactInfo            = Field(default_factory=ContactInfo)
    summary:        str                    = ""
    skills:         list[str]              = Field(default_factory=list)
    education:      list[EducationEntry]   = Field(default_factory=list)
    experience:     list[ExperienceEntry]  = Field(default_factory=list)
    certifications: list[str]              = Field(default_factory=list)
    projects:       list[ProjectEntry]     = Field(default_factory=list)
    languages:      list[str]              = Field(default_factory=list)
    awards:         list[str]              = Field(default_factory=list)


# ═══════════════════════════════════════════════════════════════════════════════
# 2.  PROMPT TEMPLATE
# ═══════════════════════════════════════════════════════════════════════════════

_SYSTEM_PROMPT = """You are a precise resume parser.
Extract all structured information from the resume text below and return
ONLY a valid JSON object that matches this exact schema (no markdown fences,
no commentary — raw JSON only):

{format_instructions}

Rules:
- skills: flat list of individual skill strings, no duplicates, lowercase

- experience.is_fulltime:
    Set to true ONLY for full-time permanent or full-time contract roles.
    Set to false for: internships, part-time jobs, freelance, volunteer work,
    apprenticeships, co-ops, or any role with explicit non-full-time indicators
    (words like "intern", "internship", "part-time", "freelance", "contract
    (part-time)", "volunteer", "trainee").
    When in doubt, default to true.

- experience.years:
    Integer total years for FULL-TIME roles only.
    Compute from the duration field (e.g. "Jan 2019 – Mar 2023" → 4,
    "2020 – Present" → years from 2020 to current year).
    Return 0 if: (a) the duration cannot be reliably determined, OR
    (b) is_fulltime is false (internships, part-time, etc. do NOT count).
    Do NOT sum across roles — each entry holds its own role duration.

- experience.bullets: key achievements / responsibilities only, max 5 per role

- certifications: full certificate name as a string per item
- If a field has no data, return its zero-value (empty string or empty list)
"""

_HUMAN_PROMPT = """Resume text:
---
{resume_text}
---
"""


# ═══════════════════════════════════════════════════════════════════════════════
# 3.  LANGCHAIN RESUME PARSER SERVICE
# ═══════════════════════════════════════════════════════════════════════════════

class LangChainResumeParser:
    """
    Uses Groq via LangChain to extract structured resume sections.
    Groq provides near-instant inference — ideal for resume pipelines.
    """

    DEFAULT_MODEL = "llama-3.3-70b-versatile"

    def __init__(
        self,
        groq_api_key: str,
        model_name: str = DEFAULT_MODEL,
        temperature: float = 0.0,
    ):
        self._llm = ChatGroq(
            model=model_name,
            temperature=temperature,
            api_key=groq_api_key,
        )
        self._parser = JsonOutputParser(pydantic_object=ParsedResumeSchema)
        self._chain  = self._build_chain()

    def _build_chain(self):
        prompt = ChatPromptTemplate.from_messages([
            ("system", _SYSTEM_PROMPT),
            ("human",  _HUMAN_PROMPT),
        ]).partial(format_instructions=self._parser.get_format_instructions())
        return prompt | self._llm | self._parser

    async def parse_async(self, resume_text: str) -> ParsedResumeSchema:
        """Async parse — use inside FastAPI route handlers."""
        try:
            raw: dict = await self._chain.ainvoke({"resume_text": resume_text[:6000]})
            return ParsedResumeSchema(**raw)
        except Exception as e:
            log.error(f"LangChain parse failed: {e}")
            return ParsedResumeSchema()

    def parse_sync(self, resume_text: str) -> ParsedResumeSchema:
        """Sync parse — use from background workers / CLI."""
        try:
            raw: dict = self._chain.invoke({"resume_text": resume_text[:6000]})
            return ParsedResumeSchema(**raw)
        except Exception as e:
            log.error(f"LangChain parse failed: {e}")
            return ParsedResumeSchema()


# ═══════════════════════════════════════════════════════════════════════════════
# 4.  EMBEDDING SERVICE  (Google gemini-embedding-001, 768-dim)
# ═══════════════════════════════════════════════════════════════════════════════

class ResumeSectionEmbedder:
    """
    Generates embeddings via Google's gemini-embedding-001 model.
    Full-time experience entries are placed first in the experience section
    text so the resulting embedding gives them naturally higher weight.
    """

    MODEL_NAME = "gemini-embedding-001"
    VECTOR_DIM = 768

    def __init__(
        self,
        google_api_key: str = settings.GOOGLE_API_KEY,
        task_type: str = "RETRIEVAL_DOCUMENT",
    ):
        from langchain_google_genai import GoogleGenerativeAIEmbeddings
        self._embeddings = GoogleGenerativeAIEmbeddings(
            model=self.MODEL_NAME,
            task_type=task_type,
            google_api_key=google_api_key,
        )
        self._query_embeddings = GoogleGenerativeAIEmbeddings(
            model=self.MODEL_NAME,
            task_type="RETRIEVAL_QUERY",
            google_api_key=google_api_key,
        )
        log.info("ResumeSectionEmbedder: Google gemini-embedding-001 ready ✓")

    # ── experience years (full-time only) ─────────────────────────────────────

    @staticmethod
    def total_experience_years(parsed: ParsedResumeSchema) -> int | None:
        """
        Sums LLM-extracted years across FULL-TIME experience entries only.
        Internships, part-time, freelance, etc. (is_fulltime=False) are excluded.

        Returns:
          int  — total full-time years when at least one entry has years > 0
          None — no reliable full-time duration data from LLM;
                 callers should fall back to regex on parsed_text.
        """
        fulltime_years = [
            e.years
            for e in parsed.experience
            if e.is_fulltime and e.years > 0
        ]
        if not fulltime_years:
            return None
        return sum(fulltime_years)

    @staticmethod
    def fulltime_entries(parsed: ParsedResumeSchema) -> list[ExperienceEntry]:
        """Returns only the full-time experience entries, sorted newest-first."""
        return [e for e in parsed.experience if e.is_fulltime]

    @staticmethod
    def non_fulltime_entries(parsed: ParsedResumeSchema) -> list[ExperienceEntry]:
        """Returns internships, part-time, freelance etc."""
        return [e for e in parsed.experience if not e.is_fulltime]

    # ── section text helpers ──────────────────────────────────────────────────

    @staticmethod
    def section_texts(parsed: ParsedResumeSchema) -> dict[str, str]:
        """
        Builds plain-text representations of each resume section for embedding.

        Experience section ordering:
          1. Full-time roles first (higher embedding weight)
          2. Non-full-time roles appended after (still present, lower weight)
        """
        fulltime     = ResumeSectionEmbedder.fulltime_entries(parsed)
        non_fulltime = ResumeSectionEmbedder.non_fulltime_entries(parsed)

        # Full-time entries get their bullets included; non-full-time get title+company only
        fulltime_text = " ".join(
            f"{e.title} {e.company} {' '.join(e.bullets)}"
            for e in fulltime
        )
        non_fulltime_text = " ".join(
            f"{e.title} {e.company}"
            for e in non_fulltime
        )
        experience_text = " ".join(
            filter(None, [fulltime_text, non_fulltime_text])
        )

        return {
            "summary": parsed.summary,
            "skills":  " ".join(parsed.skills),
            "education": " ".join(
                f"{e.degree} {e.institution} {e.year}" for e in parsed.education
            ),
            "experience": experience_text,
            "certifications": " ".join(parsed.certifications),
            "projects": " ".join(
                f"{p.title} {p.description} {' '.join(p.tech)}"
                for p in parsed.projects
            ),
        }

    # ── single text embedding ─────────────────────────────────────────────────

    def embed(self, text: str, is_query: bool = False) -> list[float]:
        if not text or not text.strip():
            return self._zeros()
        try:
            client = self._query_embeddings if is_query else self._embeddings
            return client.embed_query(text)
        except Exception as e:
            log.error(f"Google embedding failed: {e}")
            return self._zeros()

    # ── batch embedding for all sections ─────────────────────────────────────

    def embed_all_sections(
        self, parsed: ParsedResumeSchema
    ) -> dict[str, list[float]]:
        sections = {
            sec: txt
            for sec, txt in self.section_texts(parsed).items()
            if txt.strip()
        }
        if not sections:
            return {}
        try:
            texts   = list(sections.values())
            keys    = list(sections.keys())
            vectors = self._embeddings.embed_documents(texts)
            return dict(zip(keys, vectors))
        except Exception as e:
            log.error(f"Google batch embedding failed: {e}")
            return {sec: self._zeros() for sec in sections}

    def embed_full_resume(self, parsed: ParsedResumeSchema) -> list[float]:
        all_text = " ".join(
            t for t in self.section_texts(parsed).values() if t.strip()
        )
        return self.embed(all_text)

    def embed_query(self, query: str) -> list[float]:
        """Embed a recruiter search query with RETRIEVAL_QUERY task type."""
        return self.embed(query, is_query=True)

    @staticmethod
    def _zeros() -> list[float]:
        return [0.0] * ResumeSectionEmbedder.VECTOR_DIM


# ═══════════════════════════════════════════════════════════════════════════════
# 5.  FILE TEXT EXTRACTOR  (PDF / DOCX / TXT)
# ═══════════════════════════════════════════════════════════════════════════════

class ResumeFileExtractor:

    @staticmethod
    def extract(file_bytes: bytes, filename: str) -> str:
        name = filename.lower()
        if name.endswith(".pdf"):
            return ResumeFileExtractor._from_pdf(file_bytes)
        if name.endswith(".docx"):
            return ResumeFileExtractor._from_docx(file_bytes)
        return file_bytes.decode("utf-8", errors="ignore")

    @staticmethod
    def _from_pdf(data: bytes) -> str:
        try:
            import PyPDF2
            reader = PyPDF2.PdfReader(io.BytesIO(data))
            return "\n".join(p.extract_text() or "" for p in reader.pages)
        except Exception as e:
            log.error(f"PDF extract failed: {e}")
            return ""

    @staticmethod
    def _from_docx(data: bytes) -> str:
        try:
            from docx import Document
            doc = Document(io.BytesIO(data))
            return "\n".join(p.text for p in doc.paragraphs)
        except Exception as e:
            log.error(f"DOCX extract failed: {e}")
            return ""