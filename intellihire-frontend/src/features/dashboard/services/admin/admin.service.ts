// features/admin/services/admin.service.ts

import axiosInstance from '../../../../lib/axios';
import type { CreateRecruiterPayload, CreatedRecruiter } from '../../../dashboard/types/dashboard.types';

export const adminService = {
  /** POST /admin/recruiters — admin only */
  createRecruiter: async (payload: CreateRecruiterPayload): Promise<CreatedRecruiter> => {
    const { data } = await axiosInstance.post<CreatedRecruiter>('/admin/recruiters', payload);
    return data;
  },
};