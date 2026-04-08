// features/jobs/services/job.service.ts

import axiosInstance from '../../../lib/axios';
import type { Job, JobCreateRequest, JobUpdateRequest } from '../types/job.types';

export const jobService = {

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

  /** PATCH /jobs/{jobId} — set is_active = false */
  async closeJob(jobId: number): Promise<Job> {
    return this.updateJob(jobId, { is_active: false });
  },

  /** PATCH /jobs/{jobId} — set is_active = true */
  async reopenJob(jobId: number): Promise<Job> {
    return this.updateJob(jobId, { is_active: true });
  },
};