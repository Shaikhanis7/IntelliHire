// features/jobs/types/job.types.ts

export interface Job {
  id:                  number;
  recruiter_id:        number;
  title:               string;
  description:         string | null;
  skills_required:     string | string[] | null;
  experience_required: number;
  /** Alias used by some UI components (maps to experience_required) */
  min_experience?:     number;
  location:            string | null;
  is_active:           boolean;
  /** ISO-8601 string — use new Date(created_at) to parse */
  created_at:          string | null;
  /** ISO-8601 string */
  updated_at:          string | null;
}

export interface JobCreateRequest {
  title:               string;
  description:         string;
  /** Array — backend joins with ", " before storing */
  skills_required:     string[];
  experience_required: number;
  location?:           string;
}

export interface JobUpdateRequest {
  title?:               string;
  description?:         string;
  skills_required?:     string[];
  experience_required?: number;
  location?:            string;
  is_active?:           boolean;
}