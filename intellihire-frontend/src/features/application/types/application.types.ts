/* ═══════════════════════════════════════════════════════════════
   features/application/types/application.types.ts
   Shared types for both recruiter and candidate application flows
   ═══════════════════════════════════════════════════════════════ */

// ── Core entities ─────────────────────────────────────────────────────────────

export interface Candidate {
  id:       number;
  name:     string;
  email:    string;
  skills:   string;
  location: string;
  user_id:  number;
}

export interface Job {
  id:                  number;
  title:               string;
  skills_required:     string | null;
  experience_required: number;
  location?:           string;
  is_active:           boolean;
}

// ── Status ────────────────────────────────────────────────────────────────────

export type AppStatus =
  | 'applied'
  | 'scored'
  | 'shortlisted'
  | 'rejected'
  | 'hired'
  | 'sourced_invited';

// ── Application ───────────────────────────────────────────────────────────────

export interface Application {
  id:             number;
  candidate_id:   number;
  job_id:         number;

  /**
   * AI scoring fields — 0–100 (multiplied ×100 by backend).
   * null = sourcing hasn't run yet for this job.
   *
   * ⚠️  semantic_score and rule_score are RECRUITER-ONLY.
   *     Never render these values in candidate-facing UI.
   *     Only final_score (overall match %) may be shown to candidates.
   */
  semantic_score: number | null; // recruiter-only
  rule_score:     number | null; // recruiter-only
  final_score:    number | null; // may be shown to candidate as "match score"

  // Sourcing fields — populated after a sourcing run
  sourcing_rank:  number | null;
  sourcing_score: number | null;
  sourcing_id:    number | null;
  fit_summary:    string | null; // may be shown to candidate as "match insight"
  source_tag:     string | null;
  source_url:     string | null;

  status:     AppStatus;
  created_at: string;

  // Joined relations (populated by backend on some endpoints)
  candidate?: Candidate;
  job?:       Job;
}

// ── Request / Response ────────────────────────────────────────────────────────

export interface ApplyResponse {
  application_id:  number;
  job_id:          number;
  status:          'applied';
  resume_uploaded: boolean;
}

export interface ShortlistResponse {
  job_id:            number;
  top_n:             number;
  shortlisted_count: number;
  candidates: Array<{
    application_id: number;
    candidate_id:   number;
    final_score:    number;
    rule_score:     number;        // recruiter-only
    semantic_score: number;        // recruiter-only
    sourcing_rank:  number | null;
    status:         string;
  }>;
}