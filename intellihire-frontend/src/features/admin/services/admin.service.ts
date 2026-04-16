// features/admin/services/admin.service.ts

import axiosInstance from '../../../lib/axios'; // adjust to your axios instance path

export interface CreateRecruiterPayload {
  name:     string;
  email:    string;
  password: string;
}

export interface Recruiter {
  id:    number;
  name:  string;
  email: string;
  role:  string;
}

export const adminService = {
  /**
   * POST /admin/recruiters
   * Admin-only: creates a recruiter account.
   */
  createRecruiter: async (payload: CreateRecruiterPayload): Promise<Recruiter> => {
    const { data } = await axiosInstance.post<Recruiter>('/admin/recruiters', payload);
    return data;
  },

  /**
   * GET /admin/recruiters
   * Admin-only: returns all recruiter accounts (newest first).
   */
  listRecruiters: async (): Promise<Recruiter[]> => {
    const { data } = await axiosInstance.get<Recruiter[]>('/admin/recruiters');
    return data;
  },

  /**
   * DELETE /admin/recruiters/:id
   * Admin-only: permanently removes a recruiter account.
   */
  deleteRecruiter: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/admin/recruiters/${id}`);
  },
};