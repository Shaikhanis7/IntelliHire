/* ═══════════════════════════════════════════════════════════════
   features/application/services/application.service.ts
   Single service — recruiter + candidate endpoints
   ═══════════════════════════════════════════════════════════════ */

import axiosInstance from '../../../lib/axios';
import type {
  Application,
  ApplyResponse,
  ShortlistResponse,
  Job,
} from '../types/application.types';

// ── Application service ───────────────────────────────────────────────────────

export const applicationService = {

  // ── CANDIDATE endpoints ──────────────────────────────────────

  /**
   * POST /applications/apply/{job_id}
   * Candidate submits an application (optionally with resume).
   * Status is "applied" on creation; scores are written later by sourcing.
   */
  async applyForJob(jobId: number, file?: File): Promise<ApplyResponse> {
    if (file) {
      const form = new FormData();
      form.append('file', file);
      const res = await axiosInstance.post(
        `/applications/apply/${jobId}`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return res.data;
    }
    const res = await axiosInstance.post(`/applications/apply/${jobId}`);
    return res.data;
  },

  /**
   * GET /applications/mine
   * Returns the authenticated candidate's own applications.
   * NOTE: backend must NOT return semantic_score / rule_score here
   * (or the frontend must ignore them — never render them in candidate UI).
   */
  async getMyApplications(): Promise<Application[]> {
    const res = await axiosInstance.get('/applications/mine');
    return res.data;
  },

  // ── RECRUITER endpoints ──────────────────────────────────────

  /**
   * GET /applications/job/{job_id}
   * Recruiter lists all applicants for a job.
   * Pre-sorted by backend: sourced (sourcing_rank asc) → direct (final_score desc).
   * Includes semantic_score and rule_score for recruiter review.
   */
  async getJobApplications(jobId: number): Promise<Application[]> {
    const res = await axiosInstance.get(`/applications/job/${jobId}`);
    return res.data;
  },

  /**
   * POST /applications/shortlist/{job_id}
   * Bulk-shortlists top N scored candidates for a job.
   */
  async shortlistJob(
    jobId: number,
    topN: number = 10,
  ): Promise<ShortlistResponse> {
    const res = await axiosInstance.post(
      `/applications/shortlist/${jobId}`,
      null,
      { params: { top_n: topN } },
    );
    return res.data;
  },

  /**
   * PATCH /applications/{application_id}/status
   * Recruiter manually moves a candidate through the pipeline.
   */
  async updateApplicationStatus(
    applicationId: number,
    status: 'shortlisted' | 'rejected' | 'hired' | 'applied',
  ): Promise<{ application_id: number; status: string }> {
    const res = await axiosInstance.patch(
      `/applications/${applicationId}/status`,
      null,
      { params: { status } },
    );
    return res.data;
  },
};

// ── Job service ───────────────────────────────────────────────────────────────

export const jobService = {
  /**
   * GET /jobs
   * Returns all jobs visible to the current user.
   */
  async listJobs(): Promise<Job[]> {
    const res = await axiosInstance.get('/jobs');
    return res.data;
  },
};