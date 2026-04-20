// features/jobs/services/job.service.ts

import axiosInstance from '../../../lib/axios';
import type { Job, JobCreateRequest, JobUpdateRequest } from '../types/job.types';

/* ─── JD Generation types ─────────────────────────────────────── */
export interface GeneratedJD {
  title:            string;
  summary:          string;
  responsibilities: string[];
  requirements:     string[];
  nice_to_have:     string[];
  benefits:         string[];
  suggested_skills: string[];
  full_description: string;
}

export interface EnhancedJD {
  enhanced_description: string;
  suggested_skills:     string[];
  improvement_notes:    string;
}

export interface JDGenerateParams {
  title:            string;
  skills?:          string[];
  experience_years?: number;
  location?:        string;
  extra_context?:   string;
}

export interface JDEnhanceParams {
  title:       string;
  description: string;
  skills?:     string[];
}

/* ─── Job Service ─────────────────────────────────────────────── */
export const jobService = {

  // ── CRUD ──────────────────────────────────────────────────────

  /** POST /jobs/ — create new job posting */
  async createJob(data: JobCreateRequest): Promise<Job> {
    const res = await axiosInstance.post('/jobs/', data);
    return res.data;
  },

  /** GET /jobs/ — all jobs (candidate + recruiter fallback) */
  async listJobs(): Promise<Job[]> {
    const res = await axiosInstance.get('/jobs/');
    return res.data;
  },

  /** GET /jobs/mine — recruiter: only jobs posted by current user */
  async listMyJobs(): Promise<Job[]> {
    const res = await axiosInstance.get('/jobs/mine');
    return res.data;
  },

  /** GET /jobs/{jobId} — full job details */
  async getJob(jobId: number): Promise<Job> {
    const res = await axiosInstance.get(`/jobs/${jobId}`);
    return res.data;
  },

  /** PATCH /jobs/{jobId} — partial update */
  async updateJob(jobId: number, data: JobUpdateRequest): Promise<Job> {
    const res = await axiosInstance.patch(`/jobs/${jobId}`, data);
    return res.data;
  },

  /** DELETE /jobs/{jobId} */
  async deleteJob(jobId: number): Promise<void> {
    await axiosInstance.delete(`/jobs/${jobId}`);
  },

  /** PATCH /jobs/{jobId}/close — set is_active = false */
  async closeJob(jobId: number): Promise<Job> {
    const res = await axiosInstance.patch(`/jobs/${jobId}/close`);
    return res.data;
  },

  /** PATCH /jobs/{jobId}/reopen — set is_active = true */
  async reopenJob(jobId: number): Promise<Job> {
    const res = await axiosInstance.patch(`/jobs/${jobId}/reopen`);
    return res.data;
  },

  // ── AI / JD Generation ────────────────────────────────────────

  /**
   * POST /jobs/generate-jd
   * Generate a full structured JD from title + skills + optional context.
   * Stateless — does not create a job posting.
   */
  async generateJD(params: JDGenerateParams): Promise<GeneratedJD> {
    const res = await axiosInstance.post('/jobs/generate-jd', params);
    return res.data;
  },

  /**
   * POST /jobs/enhance-jd
   * Rewrite and improve a recruiter-drafted description.
   * Returns enhanced prose + suggested skills + improvement notes.
   */
  async enhanceJD(params: JDEnhanceParams): Promise<EnhancedJD> {
    const res = await axiosInstance.post('/jobs/enhance-jd', params);
    return res.data;
  },

  /**
   * POST /jobs/extract-skills
   * Parse skill names from a free-text job description.
   * Returns { skills: string[] }.
   */
  async extractSkills(description: string): Promise<string[]> {
    const res = await axiosInstance.post('/jobs/extract-skills', { description });
    return res.data.skills ?? [];
  },
};