export interface Candidate {
  id: number;
  user_id: string;
  name: string;
  skills: string | null;
  location: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CandidateProfileRequest {
  name: string;
  skills?: string;
  location?: string;
}