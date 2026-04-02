from __future__ import annotations

import hashlib
import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.data.models.postgres.resume import Resume
from src.data.models.postgres.resume_section import ResumeSection


# ── helpers ────────────────────────────────────────────────────────────────────

def _hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


# ── resume CRUD ────────────────────────────────────────────────────────────────

async def exists(db, url):
    result = await db.execute(
        select(Resume).where(Resume.file_url == url)
    )
    return result.scalar_one_or_none()


async def create_resume(
    db: AsyncSession,
    candidate_id: int,
    file_bytes: bytes | None = None,
    source_url: str | None = None,
    parsed_text: str = "",
    version: int = 1,
) -> Resume:
    resume = Resume(
        candidate_id=candidate_id,
        file_data=file_bytes,
        source_url=source_url,
        parsed_text=parsed_text,
        version=version,
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    return resume


async def create_resume_from_upload(
    db: AsyncSession,
    candidate_id: int,
    s3_key: str,
    parsed_text: str = "",
    version: int = 1,
) -> Resume:
    resume = Resume(
        candidate_id=candidate_id,
        s3_key=s3_key,
        parsed_text=parsed_text,
        version=version,
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    return resume


async def create_resume_from_url(
    db: AsyncSession,
    candidate_id: int,
    source_url: str,
    parsed_text: str = "",
    version: int = 1,
) -> Resume:
    resume = Resume(
        candidate_id=candidate_id,
        source_url=source_url,
        parsed_text=parsed_text,
        version=version,
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    return resume


async def get_resume(db: AsyncSession, resume_id: int) -> Resume | None:
    result = await db.execute(
        select(Resume)
        .options(selectinload(Resume.sections))
        .where(Resume.id == resume_id)
    )
    return result.scalar_one_or_none()


async def get_resumes_by_candidate(
    db: AsyncSession, candidate_id: int
) -> list[Resume]:
    result = await db.execute(
        select(Resume)
        .options(selectinload(Resume.sections))
        .where(Resume.candidate_id == candidate_id)
        .order_by(Resume.version.desc())
    )
    return list(result.scalars().all())


async def get_latest_resume(
    db: AsyncSession, candidate_id: int
) -> Resume | None:
    result = await db.execute(
        select(Resume)
        .options(selectinload(Resume.sections))
        .where(Resume.candidate_id == candidate_id)
        .order_by(Resume.version.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_next_version(db: AsyncSession, candidate_id: int) -> int:
    result = await db.execute(
        select(Resume.version)
        .where(Resume.candidate_id == candidate_id)
        .order_by(Resume.version.desc())
        .limit(1)
    )
    row = result.scalar_one_or_none()
    return (row or 0) + 1


# ── resume-section CRUD ────────────────────────────────────────────────────────

async def create_resume_section(
    db: AsyncSession,
    resume_id: int,
    section_type: str,
    content: str,
    embedding: list[float] | None = None,
    experience_years: int | None = None,   # ← added
) -> ResumeSection:
    section = ResumeSection(
        resume_id=resume_id,
        section_type=section_type,
        content=content,
        embedding=json.dumps(embedding) if embedding else None,
    )
    # Only write experience_years on the experience section
    if section_type == "experience" and experience_years is not None:
        section.experience_years = experience_years
    db.add(section)
    await db.flush()   # keep inside the caller's transaction
    return section


async def bulk_create_resume_sections(
    db: AsyncSession,
    resume_id: int,
    sections: dict[str, str],                    # {section_type: content}
    section_embeddings: dict[str, list[float]],   # {section_type: vector}
    experience_years: int | None = None,           # ← added
) -> list[ResumeSection]:
    created = []
    for section_type, content in sections.items():
        if not content.strip():
            continue
        embedding = section_embeddings.get(section_type)
        sec = await create_resume_section(
            db,
            resume_id,
            section_type,
            content,
            embedding,
            experience_years=experience_years,   # ← passed through
        )
        created.append(sec)
    await db.commit()
    return created


async def get_sections_by_resume(
    db: AsyncSession, resume_id: int
) -> list[ResumeSection]:
    result = await db.execute(
        select(ResumeSection).where(ResumeSection.resume_id == resume_id)
    )
    return list(result.scalars().all())


async def update_section_embedding(
    db: AsyncSession, section_id: int, embedding: list[float]
) -> None:
    result = await db.execute(
        select(ResumeSection).where(ResumeSection.id == section_id)
    )
    section = result.scalar_one_or_none()
    if section:
        section.embedding = json.dumps(embedding)
        await db.commit()