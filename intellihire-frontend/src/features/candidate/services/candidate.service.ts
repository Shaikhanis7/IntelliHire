// features/candidate/services/candidate.service.ts
import axiosInstance from '../../../lib/axios';
import { env } from '../../../config/env';

/* ─── Types ──────────────────────────────────────────────────────────────────── */
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

export type AppStatus = 'pending' | 'scored' | 'shortlisted' | 'selected' | 'rejected';

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
    id:                   number;
    title:                string;
    location:             string | null;
    skills_required:      string | null;
    experience_required:  number;
    is_active:            boolean;
    company?: {
      name:     string;
      logo_url: string | null;
    };
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

/* ─── Service ────────────────────────────────────────────────────────────────── */
export const candidateService = {

  // ── Profile ────────────────────────────────────────────────────────────────
  async getMyProfile(): Promise<CandidateProfile> {
    const res = await axiosInstance.get(`${env.API_URL}/candidates/me`);
    return res.data;
  },

  async updateProfile(data: UpdateProfilePayload): Promise<CandidateProfile> {
    const res = await axiosInstance.patch(`${env.API_URL}/candidates/me`, data);
    return res.data;
  },

  async createProfile(data: UpdateProfilePayload): Promise<CandidateProfile> {
    const res = await axiosInstance.post(`${env.API_URL}/candidates/profile`, data);
    return res.data;
  },

  // ── Applications ───────────────────────────────────────────────────────────
  async getMyApplications(): Promise<MyApplication[]> {
    const res = await axiosInstance.get(`${env.API_URL}/applications/mine`);
    return res.data;
  },

  async applyForJob(jobId: number, file?: File): Promise<MyApplication> {
    if (file) {
      const form = new FormData();
      form.append('file', file);
      const res = await axiosInstance.post(
        `${env.API_URL}/applications/apply/${jobId}`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return res.data;
    }
    const res = await axiosInstance.post(`${env.API_URL}/applications/apply/${jobId}`);
    return res.data;
  },

  // ── Helpers ────────────────────────────────────────────────────────────────
  computeStats(apps: MyApplication[]): ApplicationStats {
    return {
      total:       apps.length,
      pending:     apps.filter(a => a.status === 'pending').length,
      scored:      apps.filter(a => a.status === 'scored').length,
      shortlisted: apps.filter(a => a.status === 'shortlisted').length,
      selected:    apps.filter(a => a.status === 'selected').length,
      rejected:    apps.filter(a => a.status === 'rejected').length,
    };
  },

  parseSkills(raw: string | null | undefined): string[] {
    if (!raw) return [];
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  },
};