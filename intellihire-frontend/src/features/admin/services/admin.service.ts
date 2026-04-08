// features/admin/services/admin.service.ts

import axiosInstance from '../../../lib/axios'; // adjust to your axios instance path

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

export const adminService = {
  /**
   * POST /admin/recruiters
   * Admin-only: creates a recruiter account.
   */
  createRecruiter: async (
    payload: CreateRecruiterPayload,
  ): Promise<CreatedRecruiter> => {
    const { data } = await axiosInstance.post<CreatedRecruiter>(
      '/admin/recruiters',
      payload,
    );
    return data;
  },
};