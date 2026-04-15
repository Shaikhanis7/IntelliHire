// features/landing/components/ArchitectureSection.tsx
// Fully responsive — stacks nodes vertically on mobile, wraps gracefully on tablet

import React, { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Cpu, ChevronDown } from 'lucide-react';
import { C, FONTS } from '../tokens/tokens';
import { SectionHeader, Pill, MeshBg } from './Primitives';

/* ─── Color palette ──────────────────────────────────────────────────────────── */
const COLORS = {
  teal:   { bg: '#E1F5EE', border: '#0F6E56', title: '#085041', sub: '#0F6E56' },
  purple: { bg: '#EEEDFE', border: '#534AB7', title: '#3C3489', sub: '#534AB7' },
  blue:   { bg: '#E6F1FB', border: '#185FA5', title: '#0C447C', sub: '#185FA5' },
  amber:  { bg: '#FAEEDA', border: '#854F0B', title: '#633806', sub: '#854F0B' },
  gray:   { bg: '#F1EFE8', border: '#5F5E5A', title: '#444441', sub: '#5F5E5A' },
  coral:  { bg: '#FAECE7', border: '#993C1D', title: '#711B0C', sub: '#712B13' },
} as const;

type ColorKey = keyof typeof COLORS;

interface BulletItem { text: string; code?: boolean; }

interface NodeData {
  id: string;
  title: string;
  sub?: string | string[];
  color: ColorKey;
  wide?: boolean;
  detail?: {
    heading: string;
    body?: string;
    bullets: BulletItem[];
  };
}

/* ─── Node definitions (unchanged) ──────────────────────────────────────────── */
const NODE_DATA: Record<string, NodeData> = {
  candidate:       { id: 'candidate',       color: 'teal',   title: 'Candidate',              sub: 'Register / apply / track',               detail: { heading: 'Candidate user flow', body: 'Candidates register, browse active jobs, upload resumes, and track application status.', bullets: [{ text: 'POST /auth/register → auth_service', code: true }, { text: 'JWT access + refresh tokens issued on login' }, { text: 'Apply via apply_for_job_with_resume()', code: true }] } },
  recruiter:       { id: 'recruiter',       color: 'purple', title: 'Recruiter',              sub: 'Post jobs / source / rank',              detail: { heading: 'Recruiter user flow', body: 'Recruiters create job postings (auto-embedded on creation), trigger sourcing runs, and review ranked shortlists.', bullets: [{ text: 'create_job_posting() → embeds job via gemini-embedding-001 immediately', code: true }, { text: 'Dashboard: get_job_applications() returns sourcing_rank + fit_summary', code: true }] } },
  auth:            { id: 'auth',            color: 'gray',   title: 'auth_service',           sub: 'Register / login / refresh',             detail: { heading: 'JWT authentication', body: 'All API routes are protected. The auth service issues access + refresh token pairs.', bullets: [{ text: 'Access token: short-lived, sent in Authorization: Bearer', code: true }, { text: 'Refresh token: long-lived, used to issue new access tokens' }, { text: 'Roles: candidate | recruiter — enforced per route', code: true }] } },
  upload_internal: { id: 'upload_internal', color: 'teal',   title: 'upload_resume_internal', sub: 'Full sync pipeline',                     detail: { heading: 'Internal full pipeline (profile page upload)', body: 'Runs the complete pipeline synchronously — parse, embed, persist all sections.', bullets: [{ text: 'Extract text → LangChain parse → compute experience_years', code: true }, { text: 'Embed all sections + full resume via gemini-embedding-001', code: true }, { text: 'bulk_create_resume_sections() with experience_years persisted', code: true }] } },
  celery:          { id: 'celery',          color: 'amber',  title: 'Celery task',            sub: 'process_resume_upload_task',             detail: { heading: 'Celery async worker', body: "Heavy resume processing deferred from the fast path so the candidate isn't blocked.", bullets: [{ text: 'process_resume_upload_task.delay(resume_id, candidate_id, raw_text)', code: true }, { text: 'Calls parse_async() → LangChain → Groq llama-3.3-70b', code: true }, { text: 'Writes experience_years to ResumeSection after parse', code: true }] } },
  extractor:       { id: 'extractor',       color: 'gray',   title: 'ResumeFileExtractor',    sub: 'PDF / DOCX / TXT → raw text',   wide: true, detail: { heading: 'File text extraction', body: 'Supports PDF (PyPDF2), DOCX (python-docx), and plain TXT.', bullets: [{ text: 'ResumeFileExtractor.extract(file_bytes, filename)', code: true }, { text: 'PDF: PyPDF2 page-by-page text concatenation', code: true }, { text: 'DOCX: python-docx paragraph extraction', code: true }] } },
  langchain:       { id: 'langchain',       color: 'purple', title: 'LangChainResumeParser',  sub: 'Groq llama-3.3-70b → JSON schema', wide: true, detail: { heading: 'LLM-powered structured parse', body: 'LangChain chain: ChatPromptTemplate | ChatGroq | JsonOutputParser', bullets: [{ text: 'Model: llama-3.3-70b-versatile via Groq API (near-instant inference)', code: true }, { text: 'Outputs: contact, summary, skills[], education[], experience[], certifications[], projects[]' }, { text: 'ExperienceEntry.years: LLM extracts integer years per role', code: true }, { text: 'Fallback: regex _infer_experience_years() when column is NULL', code: true }] } },
  embedder:        { id: 'embedder',        color: 'purple', title: 'ResumeSectionEmbedder',  sub: 'gemini-embedding-001 · 768-dim', wide: true, detail: { heading: 'Google embedding service', body: 'Per-section + full-resume embeddings via gemini-embedding-001.', bullets: [{ text: 'RETRIEVAL_DOCUMENT task_type for storage; RETRIEVAL_QUERY for search', code: true }, { text: 'embed_all_sections(): single batch API call for all sections', code: true }, { text: '768-dim vectors stored as JSON in PostgreSQL' }, { text: 'total_experience_years(parsed): sums LLM years across entries', code: true }] } },
  apply:           { id: 'apply',           color: 'teal',   title: 'apply_for_job',          sub: 'application_service',                    detail: { heading: 'Job application flow', body: 'apply_for_job_with_resume(db, candidate_id, job_id, file)', bullets: [{ text: '1. upload_resume_fast() → S3 + bare Resume row', code: true }, { text: '2. Dispatch process_resume_upload_task.delay() (non-blocking)', code: true }, { text: '3. Create Application row with status="applied"', code: true }, { text: 'Raises: AlreadyApplied | JobNotFound | NoResumeFound', code: true }] } },
  score_app:       { id: 'score_app',       color: 'blue',   title: 'score_application',      sub: 'rule + semantic scores',                 detail: { heading: 'Dual scoring engine', body: 'final = 0.45 × rule_score + 0.55 × semantic_score', bullets: [{ text: 'Rule score: skills 40% · experience 30% · certs 15% · baseline 15%' }, { text: 'Semantic score: cosine(resume_vec, job_vec) using section embeddings', code: true }, { text: 'Experience years: DB column (LLM int) → regex fallback if NULL' }, { text: 'Scores stored 0.0–1.0 in DB; multiplied ×100 at API boundary' }] } },
  rule_score:      { id: 'rule_score',      color: 'blue',   title: '_compute_rule_score',    sub: ['skills 40% · exp 30%', 'certs 15% · base 15%'], detail: { heading: 'Rule-based sub-scorer', body: 'Weights: skills 40% | experience 30% | certifications 15% | baseline 15%', bullets: [{ text: 'Skill match: required job skills checked against candidate skills section tokens' }, { text: 'Exp: min(candidate_years / required_years, 1.0) × 0.30', code: true }, { text: 'Certs: +0.15 if certifications section is non-empty' }, { text: 'Baseline: everyone starts with +0.15' }] } },
  sem_score:       { id: 'sem_score',       color: 'blue',   title: '_compute_semantic',      sub: ['cosine(resume_vec, job_vec)', 'W_RULE=0.45 · W_SEM=0.55'], detail: { heading: 'Semantic similarity scorer', body: 'Compares resume embedding to job embedding via cosine similarity.', bullets: [{ text: 'Primary: section-weighted cosine across skills/exp/summary/education/certs' }, { text: 'Fallback: full resume embedding cosine if sections unavailable' }, { text: 'Job embedding created on create/update; fallback to on-the-fly', code: true }, { text: 'W_SEMANTIC=0.55 · W_RULE=0.45', code: true }] } },
  shortlist:       { id: 'shortlist',       color: 'blue',   title: 'shortlist_job',          sub: 'final_score → top N shortlisted', wide: true, detail: { heading: 'Shortlisting', body: 'shortlist_job(db, job_id, top_n=10)', bullets: [{ text: 'Scores any pending/applied applications first' }, { text: 'Calls shortlist_top_n(db, job_id, top_n) repo fn', code: true }, { text: 'Returns ranked list with final/rule/semantic scores + sourcing_rank' }] } },
  get_apps:        { id: 'get_apps',        color: 'purple', title: 'get_job_applications',   sub: 'recruiter dashboard view',       wide: true, detail: { heading: 'Recruiter dashboard response', body: 'Merges application scores with sourcing data into one ranked list.', bullets: [{ text: 'Sort key: sourcing_rank asc (ranked first), then final_score desc', code: true }, { text: 'Fields: sourcing_rank, sourcing_score, sourcing_id, fit_summary', code: true }, { text: 'Sourcing fields use getattr() — safe before DB migration', code: true }] } },
  source_entry:    { id: 'source_entry',    color: 'coral',  title: 'source_candidates',      sub: 'sourcing_service entry point',   wide: true, detail: { heading: 'Agentic sourcing entry point', body: 'source_candidates(db, job_id, role, skills, min_exp, count, mode)', bullets: [{ text: 'Modes: internal | external | both (agent decides effective mode)', code: true }, { text: 'Agent suggests strategy: SourcingAgent.suggest_search_strategy()', code: true }, { text: 'After ranking: _save_sourcing_candidates() → sync_sourcing_scores_to_applications()', code: true }] } },
  agent_strategy:  { id: 'agent_strategy',  color: 'purple', title: 'SourcingAgent',          sub: 'suggest_search_strategy',                detail: { heading: 'Strategy suggestion', body: 'LLM agent evaluates job context and selects the most effective sourcing mode.', bullets: [{ text: 'Analyses role, skills, min_exp to suggest internal vs external vs both' }, { text: 'Returns structured strategy object consumed by source_candidates()', code: true }, { text: 'Uses llama-3.1-8b-instant for low-latency strategy decisions', code: true }] } },
  internal_search: { id: 'internal_search', color: 'teal',   title: '_search_internal',       sub: ['Pass 1–3: this/other jobs', 'Pass 4–5: DB / prev sourced'], detail: { heading: 'Internal 5-pass candidate search', body: 'Tries progressively broader pools in order:', bullets: [{ text: 'Pass 1: Applied to THIS job (pending/scored only)' }, { text: 'Pass 2: Applied to a CLOSED other job' }, { text: 'Pass 3: Applied to an OPEN other job' }, { text: 'Pass 4: Raw DB match (skips ever_shortlisted)', code: true }, { text: 'Pass 5: Previously scraped (prev_sourced, no application)', code: true }, { text: 'Each pass: rule eligibility gate → agent background check' }] } },
  agent_query:     { id: 'agent_query',     color: 'purple', title: 'SourcingAgent',          sub: 'generate_query_variants',                detail: { heading: 'Query variant generation', body: 'Agent generates diverse query strings to maximise scraper recall.', bullets: [{ text: 'generate_query_variants(role, skills) → list of query strings', code: true }, { text: 'Rotates variants across scraper requests to avoid result clustering' }, { text: 'Uses llama-3.1-8b-instant for fast, diverse query generation', code: true }] } },
  scrape:          { id: 'scrape',          color: 'amber',  title: '_scrape_and_ingest',     sub: ['postjobfree.com scraper', 'parse → embed → create user'], detail: { heading: 'External scrape + ingest', body: 'Scrapes postjobfree.com using agent-generated query variants.', bullets: [{ text: 'Agent generates query variants: generate_query_variants(role, skills)', code: true }, { text: 'Scraper fetches resume links page by page (pagination driven by service)' }, { text: 'Each link: URL dedup → text quality check → eligibility gate', code: true }, { text: 'If accepted: parse → embed → create user + candidate + resume + sections' }] } },
  eligibility:     { id: 'eligibility',     color: 'gray',   title: '_passes_eligibility',    sub: 'any-skill match + min exp gate', wide: true, detail: { heading: 'Eligibility gate (rule-based, no LLM)', body: 'ANY required skill must match as a distinct token in the skills section.', bullets: [{ text: '_normalize_skills(): splits on comma/pipe/newline, filters narrative sentences', code: true }, { text: 'Whole-word boundary check: "react" matches "react.js" but NOT "reactive"', code: true }, { text: 'Internal candidates: REJECTED if skills section is None', code: true }, { text: 'External scrape: falls back to full parsed_text (sections not written yet)', code: true }, { text: 'Experience: DB experience_years column → regex fallback if NULL', code: true }] } },
  rerank:          { id: 'rerank',          color: 'purple', title: 'SourcingAgent',          sub: 'rerank (LLM)',                            detail: { heading: 'LLM reranking', body: 'Agent reranks the eligible pool using semantic reasoning beyond embeddings.', bullets: [{ text: 'Scores candidates holistically: project relevance, career trajectory, skill depth' }, { text: 'Returns ordered list with sourcing_rank assigned', code: true }, { text: 'Uses llama-3.3-70b-versatile for highest-quality rerank decisions', code: true }] } },
  score_pool:      { id: 'score_pool',      color: 'blue',   title: '_score_pool',            sub: 'rule + section semantic scoring',        detail: { heading: 'Pool scoring', body: 'Applies the dual scoring engine to all sourced candidates.', bullets: [{ text: 'Same rule + semantic pipeline as score_application()', code: true }, { text: 'Section-level embeddings used for higher-fidelity semantic score' }, { text: 'Writes sourcing_score alongside sourcing_rank to SourcingCandidate', code: true }] } },
  fit_summary:     { id: 'fit_summary',     color: 'purple', title: 'SourcingAgent',          sub: 'fit_summary',                            detail: { heading: 'Fit summary generation', body: 'Agent writes a human-readable 2–3 sentence summary for each ranked candidate.', bullets: [{ text: 'Highlights strongest matching skills, experience alignment, and gaps' }, { text: 'Stored in Application.fit_summary — shown in recruiter dashboard', code: true }, { text: 'Uses llama-3.1-8b-instant for cost-effective bulk generation', code: true }] } },
  save_sourcing:   { id: 'save_sourcing',   color: 'gray',   title: '_save_sourcing_candidates', sub: 'SourcingCandidate rows',              detail: { heading: 'Persist sourcing results', body: 'Writes each ranked candidate to the SourcingCandidate table.', bullets: [{ text: 'Creates SourcingCandidate row per candidate per sourcing run', code: true }, { text: 'Stores sourcing_rank, sourcing_score, fit_summary, source_tag, source_url' }, { text: 'Deduplicates by (sourcing_id, candidate_id) — safe to re-run', code: true }] } },
  sync_scores:     { id: 'sync_scores',     color: 'gray',   title: 'sync_sourcing_scores',   sub: 'writes rank/score to Application',       detail: { heading: 'Sync sourcing → applications', body: 'sync_sourcing_scores_to_applications(db, job_id, sourcing_id, ranked)', bullets: [{ text: 'Only updates candidates who have already applied to this job' }, { text: 'Writes: rule_score, semantic_score, final_score, sourcing_rank, fit_summary' }, { text: 'Sets status → "scored" if was pending/applied', code: true }] } },
  postgres:        { id: 'postgres',        color: 'gray',   title: 'PostgreSQL',             sub: 'User · Candidate · Resume · Application · SourcingCandidate', wide: true, detail: { heading: 'Primary database', body: 'All persistent state lives in PostgreSQL (async via SQLAlchemy + asyncpg).', bullets: [{ text: 'User · Candidate · Resume · ResumeSection (with embeddings)', code: true }, { text: 'Application (scores, status, sourcing_rank, fit_summary)', code: true }, { text: 'Job (with embedding) · Sourcing · SourcingCandidate', code: true }, { text: 'Scores stored 0.0–1.0; ×100 only at API response boundary' }] } },
  s3:              { id: 's3',              color: 'amber',  title: 'AWS S3',                 sub: 'Resume file storage',                    detail: { heading: 'Object storage', body: 'Raw resume file bytes uploaded to S3 for all resumes (fast and internal paths).', bullets: [{ text: 'upload_resume_to_s3(file_bytes, filename, candidate_id, version)', code: true }, { text: 'Key includes candidate_id + version for deduplication' }] } },
  groq:            { id: 'groq',            color: 'purple', title: 'Groq API',               sub: 'llama-3.3-70b / 3.1-8b',                 detail: { heading: 'LLM inference', body: 'Groq provides ultra-fast inference for all LangChain calls.', bullets: [{ text: 'Default: llama-3.3-70b-versatile (best quality)', code: true }, { text: 'Fast: llama-3.1-8b-instant for lower-cost paths', code: true }, { text: 'Used by: LangChainResumeParser + SourcingAgent', code: true }] } },
  google_ai:       { id: 'google_ai',       color: 'blue',   title: 'Google AI',              sub: 'gemini-embedding-001',                   detail: { heading: 'Embedding service', body: '768-dim embeddings outperforming sentence-transformers on MTEB benchmarks.', bullets: [{ text: 'RETRIEVAL_DOCUMENT: for resume/job storage (default)', code: true }, { text: 'RETRIEVAL_QUERY: for search/scoring queries', code: true }, { text: 'No local model download — API-only, zero GPU overhead' }] } },
  postjobfree:     { id: 'postjobfree',     color: 'coral',  title: 'postjobfree.com',        sub: 'scraper_service',                        detail: { heading: 'External resume scraper', body: 'scraper_service.py — BeautifulSoup-based scraper for external candidates.', bullets: [{ text: 'get_resume_links(role, count, page): fetches one page of resume links', code: true }, { text: 'scrape_resume(url): extracts cleaned body text from a resume page', code: true }, { text: 'URL dedup: checked against Resume.source_url before scraping', code: true }] } },
};

/* ─── Connectors ─────────────────────────────────────────────────────────────── */
const ArrowDown: React.FC<{ dashed?: boolean; label?: string }> = ({ dashed, label }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, margin: '1px 0' }}>
    {label && (
      <span style={{ fontSize: 10, color: dashed ? '#854F0B' : C.textMuted, fontFamily: FONTS.body, opacity: 0.85, letterSpacing: '0.3px' }}>
        {label}
      </span>
    )}
    <div style={{ position: 'relative', width: 2, height: 24 }}>
      <div style={{ position: 'absolute', inset: 0, borderLeft: dashed ? '1.5px dashed #BA7517' : `1.5px solid ${C.borderMid}`, opacity: 0.5 }} />
      <div style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: `5px solid ${dashed ? '#BA7517' : C.borderMid}`, opacity: 0.55 }} />
    </div>
  </div>
);

const ArrowRight: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', alignSelf: 'center', padding: '0 2px' }}>
    <div style={{ width: 22, height: 1.5, background: C.borderMid, opacity: 0.45 }} />
    <div style={{ width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: `5px solid ${C.borderMid}`, opacity: 0.55 }} />
  </div>
);

const MergeArrows: React.FC<{ spread?: number }> = ({ spread = 140 }) => (
  <div style={{ display: 'flex', justifyContent: 'center', height: 32 }}>
    <svg width={spread + 20} height="32" style={{ overflow: 'visible' }}>
      <line x1={10} y1="0" x2={spread / 2 + 10} y2="28" stroke={C.borderMid} strokeWidth="1.5" strokeOpacity="0.45" />
      <line x1={spread + 10} y1="0" x2={spread / 2 + 10} y2="28" stroke={C.borderMid} strokeWidth="1.5" strokeOpacity="0.45" />
      <polygon points={`${spread / 2 + 6},26 ${spread / 2 + 14},26 ${spread / 2 + 10},32`} fill={C.borderMid} opacity="0.5" />
    </svg>
  </div>
);

const ForkArrows: React.FC<{ spread?: number }> = ({ spread = 220 }) => (
  <div style={{ display: 'flex', justifyContent: 'center', height: 32 }}>
    <svg width={spread + 20} height="32" style={{ overflow: 'visible' }}>
      <line x1={spread / 2 + 10} y1="0" x2={10} y2="28" stroke={C.borderMid} strokeWidth="1.5" strokeOpacity="0.45" />
      <line x1={spread / 2 + 10} y1="0" x2={spread + 10} y2="28" stroke={C.borderMid} strokeWidth="1.5" strokeOpacity="0.45" />
      <polygon points="6,26 14,26 10,32" fill={C.borderMid} opacity="0.5" />
      <polygon points={`${spread + 6},26 ${spread + 14},26 ${spread + 10},32`} fill={C.borderMid} opacity="0.5" />
    </svg>
  </div>
);

/* ─── Section label ──────────────────────────────────────────────────────────── */
const SectionLabel: React.FC<{ label: string; index?: number }> = ({ label, index = 0 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
      transition={{ duration: 0.4, delay: index * 0.04 }}
      style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 'clamp(20px, 3vw, 28px) 0 clamp(12px, 2vw, 16px)' }}
    >
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${C.borderMid})`, opacity: 0.5 }} />
      <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '1.8px', color: C.textMuted, textTransform: 'uppercase', fontFamily: FONTS.body }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${C.borderMid}, transparent)`, opacity: 0.5 }} />
    </motion.div>
  );
};

/* ─── Node card ──────────────────────────────────────────────────────────────── */
const Node: React.FC<{ id: string; activeId: string | null; onToggle: (id: string) => void; index?: number }> = ({ id, activeId, onToggle, index = 0 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const n = NODE_DATA[id];
  const c = COLORS[n.color];
  const active = activeId === id;
  const lines = n.sub ? (Array.isArray(n.sub) ? n.sub : [n.sub]) : [];

  return (
    <div
      data-wide={n.wide ? 'true' : 'false'}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'stretch',
        /* Responsive sizing: wide nodes get more min-width on desktop, full-width on mobile */
        minWidth: 'min(100%, ' + (n.wide ? '240px' : '140px') + ')',
        maxWidth: n.wide ? '100%' : 220,
        flex: n.wide ? '1 1 240px' : '0 0 auto',
        width: n.wide ? '100%' : 'auto',
      }}
    >
      <motion.button
        ref={ref}
        onClick={() => onToggle(id)}
        initial={{ opacity: 0, y: 14 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ y: active ? 0 : -3 }}
        style={{
          background: active ? c.bg : 'rgba(255,255,255,0.85)',
          border: `1px solid ${active ? c.border : C.border}`,
          borderBottom: active ? '1px solid transparent' : `1px solid ${active ? c.border : C.border}`,
          borderRadius: active ? '12px 12px 0 0' : 12,
          padding: lines.length > 1 ? '11px 14px 13px' : '10px 14px 11px',
          boxShadow: active ? `0 2px 16px ${c.border}25` : C.shadow,
          cursor: 'pointer', textAlign: 'left',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8,
          backdropFilter: 'blur(4px)',
          transition: 'background 0.2s, box-shadow 0.2s, border-color 0.2s, border-radius 0.15s',
          position: 'relative', overflow: 'hidden', width: '100%',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${c.border}, transparent)`, opacity: active ? 1 : 0, transition: 'opacity 0.2s' }} />
        <div>
          <div style={{ fontSize: 'clamp(11px, 1.5vw, 13px)', fontWeight: 700, color: active ? c.title : C.text, fontFamily: FONTS.display, letterSpacing: '-0.2px', marginBottom: lines.length ? 4 : 0, transition: 'color 0.2s' }}>
            {n.title}
          </div>
          {lines.map((l, i) => (
            <div key={i} style={{ fontSize: 'clamp(10px, 1.2vw, 11px)', color: active ? c.sub : C.textMuted, fontFamily: FONTS.body, lineHeight: 1.55, opacity: 0.9, transition: 'color 0.2s' }}>
              {l}
            </div>
          ))}
        </div>
        <motion.div animate={{ rotate: active ? 180 : 0 }} transition={{ duration: 0.22 }} style={{ flexShrink: 0, marginTop: 2, opacity: active ? 0.7 : 0.35 }}>
          <ChevronDown size={12} color={active ? c.title : C.textMuted} />
        </motion.div>
      </motion.button>

      <AnimatePresence initial={false}>
        {active && n.detail && (
          <motion.div key="detail" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} style={{ overflow: 'hidden' }}>
            <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderTop: `1px solid ${c.border}20`, borderRadius: '0 0 12px 12px', padding: '12px 14px 16px', boxShadow: `0 6px 16px ${c.border}18` }}>
              <div style={{ height: 1, background: `${c.border}25`, marginBottom: 10 }} />
              <div style={{ fontSize: 12, fontWeight: 700, color: c.title, fontFamily: FONTS.display, marginBottom: 6 }}>{n.detail.heading}</div>
              {n.detail.body && (
                <div style={{ marginBottom: 8 }}>
                  {n.detail.body.includes('(') || n.detail.body.includes('→') ? (
                    <code style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, background: `${c.border}18`, padding: '2px 6px', borderRadius: 5, color: c.title, lineHeight: 1.6, display: 'inline-block', wordBreak: 'break-all' }}>{n.detail.body}</code>
                  ) : (
                    <span style={{ fontSize: 11, color: c.sub, fontFamily: FONTS.body, lineHeight: 1.6, opacity: 0.9 }}>{n.detail.body}</span>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {n.detail.bullets.map((b, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: c.border, flexShrink: 0, marginTop: 6 }} />
                    {b.code ? (
                      <code style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: c.title, background: `${c.border}15`, padding: '1px 5px', borderRadius: 4, lineHeight: 1.65, wordBreak: 'break-all' }}>{b.text}</code>
                    ) : (
                      <span style={{ fontSize: 11, color: c.sub, fontFamily: FONTS.body, lineHeight: 1.6, opacity: 0.9 }}>{b.text}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── Legend ─────────────────────────────────────────────────────────────────── */
const LEGEND_ITEMS = [
  { label: 'Candidate flow',   bg: '#E1F5EE', border: '#0F6E56' },
  { label: 'LLM / Agent',      bg: '#EEEDFE', border: '#534AB7' },
  { label: 'Scoring',          bg: '#E6F1FB', border: '#185FA5' },
  { label: 'Async / external', bg: '#FAEEDA', border: '#854F0B' },
  { label: 'Persistence',      bg: '#F1EFE8', border: '#5F5E5A' },
  { label: 'Sourcing agent',   bg: '#FAECE7', border: '#993C1D' },
];

const Legend: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.3 }}
    style={{
      display: 'flex', flexWrap: 'wrap', gap: '8px 16px',
      justifyContent: 'center', marginTop: 28,
      padding: 'clamp(12px, 2vw, 16px) clamp(16px, 3vw, 24px)',
      background: C.bgCard,
      border: `1px solid ${C.border}`,
      borderRadius: 14,
    }}
  >
    <div style={{ width: '100%', textAlign: 'center', fontSize: 10.5, color: C.textMuted, fontFamily: FONTS.body, letterSpacing: '0.4px', marginBottom: 6 }}>
      Click any node to expand details
    </div>
    {LEGEND_ITEMS.map(({ label, bg, border }) => (
      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 10, height: 10, borderRadius: 3, background: bg, border: `1px solid ${border}`, flexShrink: 0 }} />
        <span style={{ fontSize: 'clamp(10.5px, 1.5vw, 11.5px)', color: C.textMuted, fontFamily: FONTS.body }}>{label}</span>
      </div>
    ))}
  </motion.div>
);

/* ─── Layout helpers ─────────────────────────────────────────────────────────── */
const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center' };

/* Row that wraps on mobile */
const Row: React.FC<{ gap?: number; children: React.ReactNode }> = ({ gap = 12, children }) => (
  <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap }}>
    {children}
  </div>
);

/* ─── Main section ───────────────────────────────────────────────────────────── */
export const ArchitectureSection: React.FC = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [activeId, setActiveId] = useState<string | null>(null);
  const toggle = (id: string) => setActiveId(prev => prev === id ? null : id);
  const N = (id: string, index = 0) => <Node id={id} activeId={activeId} onToggle={toggle} index={index} />;

  return (
    <section
      id="architecture"
      style={{
        padding: 'clamp(64px, 10vh, 110px) clamp(16px, 4vw, calc((100vw - 980px) / 2))',
        background: C.surface,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `radial-gradient(circle, ${C.border} 1px, transparent 1px)`, backgroundSize: '28px 28px', opacity: 0.25 }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 80, repeat: Infinity, ease: 'linear' }} style={{ position: 'absolute', top: '5%', right: '4%', width: 180, height: 180, borderRadius: '50%', border: '1px solid rgba(37,99,235,0.12)' }}>
          <div style={{ position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)', width: 8, height: 8, borderRadius: '50%', background: 'rgba(37,99,235,0.4)' }} />
        </motion.div>
      </div>
      <MeshBg />

      <div ref={ref} style={{ position: 'relative' }}>
        <SectionHeader
          inView={inView}
          pill={<><Cpu size={11} /> System architecture</>}
          pillColor={C.indigo}
          pillBg={C.indigoDim}
          title="How IntelliHire works under the hood"
          subtitle="Every resume, application, and sourced candidate flows through a tightly orchestrated AI pipeline — from upload to ranked shortlist. Click any node to explore."
        />

        {/* Diagram card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="arch-diagram-card"
          style={{
            maxWidth: 760, margin: '0 auto',
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${C.border}`,
            borderRadius: 20,
            padding: 'clamp(20px, 3vw, 36px) clamp(14px, 3vw, 32px) clamp(28px, 5vw, 44px)',
            boxShadow: C.shadow,
            overflowX: 'hidden',
          }}
        >
          {/* Entry points */}
          <SectionLabel label="Entry points" index={0} />
          <div style={col}>
            <Row gap={12}>{N('candidate', 0)}{N('recruiter', 1)}</Row>
            <MergeArrows spread={160} />
          </div>

          {/* Auth */}
          <SectionLabel label="Auth service" index={1} />
          <div style={col}>{N('auth', 2)}<ArrowDown /></div>

          {/* Resume pipeline */}
          <SectionLabel label="Resume pipeline" index={2} />
          <div style={col}>
            <Row gap={12}>{N('upload_internal', 4)}</Row>
            <div style={{ display: 'flex', gap: 2, alignItems: 'flex-start', marginTop: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
              <div style={col}><ArrowDown dashed label="async" />{N('celery', 4)}<ArrowDown dashed /></div>
              <div style={col}><ArrowDown /></div>
            </div>
            <ArrowDown />
            {N('extractor', 6)}
            <ArrowDown />
            {N('langchain', 7)}
            <ArrowDown />
            {N('embedder', 8)}
            <ArrowDown />
          </div>

          {/* Application + scoring */}
          <SectionLabel label="Application + scoring" index={3} />
          <div style={col}>
            <Row gap={12}>{N('apply', 9)}{N('score_app', 10)}</Row>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginTop: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
              <div style={col}><ArrowDown />{N('rule_score', 11)}</div>
              <div style={col}><ArrowDown />{N('sem_score', 12)}</div>
            </div>
            <MergeArrows spread={140} />
            {N('shortlist', 13)}
            <ArrowDown />
            {N('get_apps', 14)}
            <ArrowDown />
          </div>

          {/* Sourcing agent */}
          <SectionLabel label="Sourcing agent pipeline" index={4} />
          <div style={col}>
            {N('source_entry', 15)}
            <ForkArrows spread={220} />
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center' }}>
              <div style={col}>{N('agent_strategy', 16)}<ArrowDown />{N('internal_search', 17)}</div>
              <div style={col}>{N('agent_query', 18)}<ArrowDown />{N('scrape', 19)}</div>
            </div>
            <MergeArrows spread={180} />
            {N('eligibility', 20)}
            <ArrowDown />
            {/* Rerank → score → fit — stack vertically on small screens */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
              {N('rerank', 21)}<ArrowRight />{N('score_pool', 22)}<ArrowRight />{N('fit_summary', 23)}
            </div>
            <ArrowDown />
          </div>

          {/* Persistence + external */}
          <SectionLabel label="Persistence + external" index={5} />
          <div style={col}>
            <Row gap={12}>{N('save_sourcing', 24)}{N('sync_scores', 25)}</Row>
            <MergeArrows spread={200} />
            {N('postgres', 26)}
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 10 }}>
              {N('s3', 27)}{N('groq', 28)}{N('google_ai', 29)}{N('postjobfree', 30)}
            </div>
          </div>
        </motion.div>

        <Legend />
      </div>
    </section>
  );
};