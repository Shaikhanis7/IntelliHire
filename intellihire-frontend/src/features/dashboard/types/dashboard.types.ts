// features/dashboard/types/dashboard.types.ts

/* ─── Shared ─────────────────────────────────────────────────────────────── */
export type UserRole = 'admin' | 'recruiter' | 'candidate';

export type AppStatus = 'pending' | 'scored' | 'shortlisted' | 'selected' | 'rejected';

/* ─── Candidate ──────────────────────────────────────────────────────────── */
export interface CandidateProfile {
  id:         number;
  user_id:    number;
  name:       string;
  skills:     string | null;
  location:   string | null;
  created_at: string;
}

export interface UpdateProfilePayload {
  name:      string;
  skills?:   string;
  location?: string;
}

export interface MyApplication {
  id:             number;
  job_id:         number;
  candidate_id:   number;
  status:         AppStatus;
  score:          number | null;
  semantic_score: number | null;
  rule_score:     number | null;
  applied_at:     string;
  job?: {
    id:                  number;
    title:               string;
    location:            string | null;
    skills_required:     string | null;
    experience_required: number;
    is_active:           boolean;
    company?: { name: string; logo_url: string | null };
  };
}

export interface ApplicationStats {
  total:       number;
  pending:     number;
  scored:      number;
  shortlisted: number;
  selected:    number;
  rejected:    number;
}

/* ─── Recruiter / Admin ──────────────────────────────────────────────────── */
export interface RecruiterStats {
  totalJobs:         number;
  activeJobs:        number;
  totalApplications: number;
  shortlisted:       number;
}

/* ─── Admin ──────────────────────────────────────────────────────────────── */
export interface CreateRecruiterPayload {
  name:     string;
  email:    string;
  password: string;
}

export interface CreatedRecruiter {
  id:    number;
  name:  string;
  email: string;
  role:  string;
}