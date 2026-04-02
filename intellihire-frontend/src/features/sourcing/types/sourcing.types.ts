export interface SourcingRequest {
  job_id: number;
  count: number;
  mode: 'internal' | 'external' | 'both';
}

export interface SourcingResponse {
  sourcing_id: number;
  job_id: number;
  role: string;
  skills: string[];
  min_exp: number;
  status: string;
  note: string;
}

export interface SourcingCandidate {
  id: number;
  sourcing_id: number;
  candidate_id: number;
  rank: number;
  source_tag: string;
  source_url: string | null;
  fit_summary: string | null;
  quality_note: string | null;
  rule_score: number;
  semantic_score: number;
  final_score: number;
  candidate?: {
    id: number;
    name: string;
    skills: string;
    location: string;
    email?: string;
  };
}

export interface SourcingHistory {
  id: number;
  job_id: number;
  role: string;
  skills: string;
  location: string;
  status: string;
  created_at: Date;
  candidates_count: number;
}

export interface SourcingState {
  sourcingHistory: SourcingHistory[];
  currentSourcing: SourcingResponse | null;
  sourcingCandidates: SourcingCandidate[];
  isLoading: boolean;
  error: string | null;
}