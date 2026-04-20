"""
src/core/services/resume_langchain_service.py

LangChain-powered resume section extraction and embedding generation.
Uses Groq as the LLM backend (ultra-fast inference via Groq API) and
Google gemini-embedding-001 for 768-dimensional vector embeddings.

Architecture
────────────
  LangChainResumeParser     — LLM-based structured extraction from raw resume text
  ResumeSectionEmbedder     — per-section and full-resume embedding generation
  ResumeFileExtractor       — binary file → plain text (PDF / DOCX / TXT)

Full-time experience handling
─────────────────────────────
  ExperienceEntry.is_fulltime: bool
    The LLM classifies each role as full-time (True) or not (False).
    Internships, part-time, freelance, volunteer, contract-part-time → False.

  ExperienceEntry.years: int
    Total years for THIS role. Set to 0 when is_fulltime=False.
    The LLM derives this from the duration string (e.g. "Jan 2019 – Mar 2023" → 4).

  ResumeSectionEmbedder.total_experience_years(parsed)
    Sums ONLY full-time entries. Returns None when no reliable data exists
    (callers fall back to regex on parsed_text in that case).

  ResumeSectionEmbedder.section_texts(parsed) — experience ordering:
    1. Full-time roles first (bullets included) → higher embedding weight
    2. Non-full-time roles appended (title + company only) → lower weight
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
# PYDANTIC SCHEMA  — defines the JSON the LLM must return
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
# PROMPT TEMPLATE
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
# LANGCHAIN RESUME PARSER
# ═══════════════════════════════════════════════════════════════════════════════

class LangChainResumeParser:
    """
    Extracts structured resume data from raw text using Groq + LangChain.

    Uses llama-3.3-70b-versatile via Groq for near-instant inference.
    Returns a ParsedResumeSchema Pydantic model on success, or an empty
    ParsedResumeSchema on LLM failure (fail-safe, never raises).

    Usage:
        parser = LangChainResumeParser(groq_api_key)
        parsed = await parser.parse_async(raw_text)    # inside FastAPI
        parsed = parser.parse_sync(raw_text)           # from CLI / workers
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
        self._output_parser = JsonOutputParser(pydantic_object=ParsedResumeSchema)
        self._chain         = self._build_extraction_chain()

    def _build_extraction_chain(self):
        """Assemble the LangChain prompt → LLM → JSON parser chain."""
        prompt = ChatPromptTemplate.from_messages([
            ("system", _SYSTEM_PROMPT),
            ("human",  _HUMAN_PROMPT),
        ]).partial(format_instructions=self._output_parser.get_format_instructions())
        return prompt | self._llm | self._output_parser
    
    from tenacity import retry, stop_after_attempt, wait_exponential

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=60, max=300),
        retry_error_callback=lambda retry_state: ParsedResumeSchema()
    )
    async def parse_async(self, resume_text: str) -> ParsedResumeSchema:
        """
        Async parse — use inside FastAPI route handlers and background tasks.
        Truncates input to 6000 chars to stay within token limits.
        Returns an empty ParsedResumeSchema on any LLM or parsing error.
        """
        try:
            raw: dict = await self._chain.ainvoke({"resume_text": resume_text[:6000]})
            return ParsedResumeSchema(**raw)
        except Exception as exc:
            log.error(f"LangChainResumeParser.parse_async failed: {exc}")
            return ParsedResumeSchema()

    def parse_sync(self, resume_text: str) -> ParsedResumeSchema:
        """
        Sync parse — use from background workers, CLI scripts, or Celery tasks.
        Truncates input to 6000 chars to stay within token limits.
        Returns an empty ParsedResumeSchema on any LLM or parsing error.
        """
        try:
            raw: dict = self._chain.invoke({"resume_text": resume_text[:6000]})
            return ParsedResumeSchema(**raw)
        except Exception as exc:
            log.error(f"LangChainResumeParser.parse_sync failed: {exc}")
            return ParsedResumeSchema()


# ═══════════════════════════════════════════════════════════════════════════════
# RESUME SECTION EMBEDDER  (Google gemini-embedding-001, 768-dim)
# ═══════════════════════════════════════════════════════════════════════════════

class ResumeSectionEmbedder:
    """
    Generates 768-dimensional embeddings via Google's gemini-embedding-001 model.

    Two task types are used:
      RETRIEVAL_DOCUMENT — for resume content being indexed
      RETRIEVAL_QUERY    — for recruiter search queries being matched

    Full-time experience entries are placed first in the experience section
    text so the resulting embedding gives them naturally higher weight.

    Usage:
        embedder = ResumeSectionEmbedder()

        # All sections at once (batched, most efficient)
        section_vectors = embedder.embed_all_sections(parsed)

        # Full-resume single vector
        full_vector = embedder.embed_full_resume(parsed)

        # Query embedding for semantic search
        query_vector = embedder.embed_query("senior python backend engineer")
    """

    MODEL_NAME = "gemini-embedding-001"
    VECTOR_DIM = 768

    def __init__(
        self,
        google_api_key: str = settings.GOOGLE_API_KEY,
        task_type: str = "RETRIEVAL_DOCUMENT",
    ):
        from langchain_google_genai import GoogleGenerativeAIEmbeddings
        self._document_embeddings = GoogleGenerativeAIEmbeddings(
            model=self.MODEL_NAME,
            task_type="RETRIEVAL_DOCUMENT",
            google_api_key=google_api_key,
        )
        self._query_embeddings = GoogleGenerativeAIEmbeddings(
            model=self.MODEL_NAME,
            task_type="RETRIEVAL_QUERY",
            google_api_key=google_api_key,
        )
        log.info("ResumeSectionEmbedder: Google gemini-embedding-001 ready ✓")

    # ── Experience year helpers ───────────────────────────────────────────────

    @staticmethod
    def total_experience_years(parsed: ParsedResumeSchema) -> int | None:
        """
        Sum LLM-extracted years across FULL-TIME experience entries only.

        Internships, part-time, freelance etc. (is_fulltime=False) are excluded.

        Returns:
            int  — total full-time years when at least one entry has years > 0
            None — no reliable full-time duration data from the LLM;
                   callers should fall back to regex on parsed_text.
        """
        fulltime_years = [
            entry.years
            for entry in parsed.experience
            if entry.is_fulltime and entry.years > 0
        ]
        if not fulltime_years:
            return None
        return sum(fulltime_years)

    @staticmethod
    def fulltime_experience_entries(parsed: ParsedResumeSchema) -> list[ExperienceEntry]:
        """Return only the full-time experience entries (newest-first order preserved)."""
        return [entry for entry in parsed.experience if entry.is_fulltime]

    @staticmethod
    def non_fulltime_experience_entries(parsed: ParsedResumeSchema) -> list[ExperienceEntry]:
        """Return internships, part-time, freelance, and other non-full-time entries."""
        return [entry for entry in parsed.experience if not entry.is_fulltime]

    # ── Section text builders ─────────────────────────────────────────────────

    @staticmethod
    def section_texts(parsed: ParsedResumeSchema) -> dict[str, str]:
        """
        Build plain-text representations of each resume section for embedding.

        Experience section ordering (ensures full-time roles dominate the vector):
          1. Full-time roles — title + company + all bullets
          2. Non-full-time roles — title + company only (no bullets)

        Returns a dict of {section_name: text_content}.
        Sections with no content are still included (empty string) so callers
        can iterate consistently.
        """
        fulltime_entries     = ResumeSectionEmbedder.fulltime_experience_entries(parsed)
        non_fulltime_entries = ResumeSectionEmbedder.non_fulltime_experience_entries(parsed)

        fulltime_text = " ".join(
            f"{e.title} {e.company} {' '.join(e.bullets)}"
            for e in fulltime_entries
        )
        non_fulltime_text = " ".join(
            f"{e.title} {e.company}"
            for e in non_fulltime_entries
        )
        experience_text = " ".join(filter(None, [fulltime_text, non_fulltime_text]))

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

    # ── Single text embedding ─────────────────────────────────────────────────

    def embed_text(self, text: str, is_query: bool = False) -> list[float]:
        """
        Embed a single text string.

        Args:
            text:     Text to embed.
            is_query: True → use RETRIEVAL_QUERY task type (for search queries).
                      False → use RETRIEVAL_DOCUMENT task type (for resume content).

        Returns a zero vector of VECTOR_DIM if the text is empty or embedding fails.
        """
        if not text or not text.strip():
            return self._zero_vector()
        try:
            client = self._query_embeddings if is_query else self._document_embeddings
            return client.embed_query(text)
        except Exception as exc:
            log.error(f"ResumeSectionEmbedder.embed_text failed: {exc}")
            return self._zero_vector()

    # ── Batch section embedding ───────────────────────────────────────────────

    def embed_all_sections(
        self,
        parsed: ParsedResumeSchema,
    ) -> dict[str, list[float]]:
        """
        Embed all non-empty resume sections in a single batched API call.

        Returns {section_name: embedding_vector}.
        Empty sections are excluded from the batch. On error, returns zero
        vectors for all sections that were attempted.
        """
        non_empty_sections = {
            section_name: section_text
            for section_name, section_text in self.section_texts(parsed).items()
            if section_text.strip()
        }
        if not non_empty_sections:
            return {}
        try:
            section_names   = list(non_empty_sections.keys())
            section_texts   = list(non_empty_sections.values())
            embedding_vectors = self._document_embeddings.embed_documents(section_texts)
            return dict(zip(section_names, embedding_vectors))
        except Exception as exc:
            log.error(f"ResumeSectionEmbedder.embed_all_sections failed: {exc}")
            return {name: self._zero_vector() for name in non_empty_sections}

    def embed_full_resume(self, parsed: ParsedResumeSchema) -> list[float]:
        """
        Produce a single embedding vector representing the entire resume.

        Concatenates all section texts and embeds as one document.
        Used as a fallback when per-section embeddings are unavailable.
        """
        all_section_text = " ".join(
            text for text in self.section_texts(parsed).values() if text.strip()
        )
        return self.embed_text(all_section_text)

    def embed_query(self, query_text: str) -> list[float]:
        """
        Embed a recruiter search query using the RETRIEVAL_QUERY task type.

        This produces vectors optimised for matching against document vectors
        (asymmetric retrieval), which is more accurate than using the same
        task type for both queries and documents.
        """
        return self.embed_text(query_text, is_query=True)

    @staticmethod
    def _zero_vector() -> list[float]:
        """Return a zero vector of the model's output dimensionality."""
        return [0.0] * ResumeSectionEmbedder.VECTOR_DIM


# ═══════════════════════════════════════════════════════════════════════════════
# RESUME FILE TEXT EXTRACTOR  (PDF / DOCX / plain text)
# ═══════════════════════════════════════════════════════════════════════════════

class ResumeFileExtractor:
    """
    Convert uploaded resume files to plain text strings.

    Supported formats:
      .pdf  — extracted via PyPDF2 (page-by-page text)
      .docx — extracted via python-docx (paragraph-by-paragraph)
      other — decoded as UTF-8 (plain text files, .txt, etc.)

    All methods are static — no instantiation required.

    Usage:
        raw_text = ResumeFileExtractor.extract(file_bytes, "resume.pdf")
    """

    @staticmethod
    def extract(file_bytes: bytes, filename: str) -> str:
        """
        Dispatch to the correct extractor based on the file extension.

        Args:
            file_bytes: Raw bytes from the uploaded file.
            filename:   Original filename including extension.

        Returns:
            Extracted plain text, or an empty string on failure.
        """
        lowered = filename.lower()
        if lowered.endswith(".pdf"):
            return ResumeFileExtractor._extract_pdf_text(file_bytes)
        if lowered.endswith(".docx"):
            return ResumeFileExtractor._extract_docx_text(file_bytes)
        return file_bytes.decode("utf-8", errors="ignore")

    @staticmethod
    def _extract_pdf_text(pdf_bytes: bytes) -> str:
        """Extract text from a PDF file using PyPDF2, joining all pages."""
        try:
            import PyPDF2
            reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception as exc:
            log.error(f"ResumeFileExtractor._extract_pdf_text failed: {exc}")
            return ""

    @staticmethod
    def _extract_docx_text(docx_bytes: bytes) -> str:
        """Extract text from a DOCX file using python-docx, joining all paragraphs."""
        try:
            from docx import Document
            document = Document(io.BytesIO(docx_bytes))
            return "\n".join(paragraph.text for paragraph in document.paragraphs)
        except Exception as exc:
            log.error(f"ResumeFileExtractor._extract_docx_text failed: {exc}")
            return ""