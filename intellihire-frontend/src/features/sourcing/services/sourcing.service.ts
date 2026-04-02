// features/sourcing/services/sourcing.service.ts

import axiosInstance from '../../../lib/axios';
import { env } from '../../../config/env';

/* ─── Types ──────────────────────────────────────────────────────────────────── */

export interface SourcingRun {
  sourcing_id: number;
  job_id:      number;
  role:        string;
  location:    string;
  created_at:  string;
}

export interface SourcingHistoryResponse {
  job_id:  number | null;
  sourced: boolean;        // false = no runs exist yet for this job
  runs:    SourcingRun[];
}

export interface SourcingCandidate {
  rank:           number;
  candidate_id:   number;
  name:           string;
  source_tag:     string;
  source_url:     string | null;
  fit_summary:    string | null;
  quality_note:   string | null;
  rule_score:     number;  // 0–1 float (×100 = %)
  semantic_score: number;  // 0–1 float
  final_score:    number;  // 0–1 float
}

export interface SourcingCandidatesResponse {
  sourcing_id: number;
  job_id:      number | null;
  ready:       boolean;    // false = Celery task still running
  total:       number;
  candidates:  SourcingCandidate[];
}

export interface TriggerSourcingParams {
  job_id: number;
  count:  number;
  mode:   'internal' | 'external' | 'both';
}

export interface TriggerSourcingResponse {
  sourcing_id: number;
  job_id:      number;
  role:        string;
  skills:      string[];
  min_exp:     number;
  mode:        string;
  status:      string;
  note:        string;
}

export interface ResumeDownloadResponse {
  download_url: string;
}

/* ─── Service ────────────────────────────────────────────────────────────────── */

export const sourcingService = {

  /**
   * POST /sourcing/source
   * Kicks off the Celery task. Returns sourcing_id immediately.
   * The actual pipeline runs in the background.
   * Poll getCandidates(sourcing_id, job_id) until ready=true.
   */
  async triggerSourcing(params: TriggerSourcingParams): Promise<TriggerSourcingResponse> {
    const response = await axiosInstance.post(`${env.API_URL}/sourcing/source`, {
      job_id: params.job_id,
      count:  params.count,
      mode:   params.mode,
    });
    console.log('[sourcing] trigger raw response:', response.data);
    return response.data;
  },

  /**
   * GET /sourcing/history?job_id={jobId}
   * Returns { sourced: bool, runs: SourcingRun[] }
   * If sourced=false, no runs exist for this job yet.
   */
  async getHistory(jobId: number): Promise<SourcingHistoryResponse> {
    const response = await axiosInstance.get(`${env.API_URL}/sourcing/history`, {
      params: { job_id: jobId },
    });
    return response.data;
  },

  /**
   * GET /sourcing/{sourcingId}/candidates?job_id={jobId}
   * Returns { ready: bool, candidates: SourcingCandidate[] }
   * ready=false means Celery hasn't finished writing yet — keep polling.
   * Pass jobId for backend ownership validation.
   */
  async getCandidates(
    sourcingId: number,
    jobId?: number,
  ): Promise<SourcingCandidatesResponse> {
    const response = await axiosInstance.get(
      `${env.API_URL}/sourcing/${sourcingId}/candidates`,
      { params: jobId != null ? { job_id: jobId } : {} },
    );
    return response.data;
  },

  /**
   * POST /sourcing/shortlist
   * HR shortlists a sourced candidate to a job.
   * Backend creates an Application row (if missing) and sets status = "shortlisted".
   * This is the only action available from the Sourcing UI.
   * Candidates who are already shortlisted/applied on THIS job have no action buttons.
   */
  async shortlistCandidate(candidateId: number, jobId: number): Promise<void> {
    await axiosInstance.post(`${env.API_URL}/sourcing/shortlist`, {
      candidate_id: candidateId,
      job_id:       jobId,
    });
  },

  /**
   * GET /resumes/candidate/{candidateId}/download
   * Returns a signed download URL for a candidate's resume.
   * Returns null when the candidate has no resume on file.
   */
  async getResumeDownloadUrl(candidateId: number): Promise<string | null> {
    try {
      const response = await axiosInstance.get<ResumeDownloadResponse>(
        `${env.API_URL}/resumes/candidate/${candidateId}/download`,
      );
      return response.data?.download_url ?? null;
    } catch {
      return null;
    }
  },
};