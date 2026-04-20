// src/features/admin/services/adminSourcing.service.ts

import axiosInstance from '../../../lib/axios';
import { env } from '../../../config/env';
import type { AdminSourcingRun, AdminRecruiterStat } from '../type/adminSourcing.types';

export const adminSourcingService = {

  /**
   * GET /admin/sourcing/runs
   * Returns all sourcing runs across all recruiters.
   */
  async getRuns(): Promise<AdminSourcingRun[]> {
    const response = await axiosInstance.get(`${env.API_URL}/admin/sourcing/runs`);
    const data = response.data;
    if (Array.isArray(data)) return data;
    return data?.runs ?? data?.data ?? data?.results ?? [];
  },

  /**
   * GET /admin/sourcing/recruiter-stats
   * Returns per-recruiter aggregated sourcing stats.
   */
  async getRecruiterStats(): Promise<AdminRecruiterStat[]> {
    const response = await axiosInstance.get(`${env.API_URL}/admin/sourcing/recruiter-stats`);
    const data = response.data;
    if (Array.isArray(data)) return data;
    return data?.stats ?? data?.data ?? data?.results ?? [];
  },
};