// features/dashboard/hooks/useDashboard.ts  — recruiter / admin

import { useState, useEffect, useCallback } from 'react';
import { jobService } from '../../jobs/services/job.service';
import type { Job }   from '../../jobs/types/job.types';
import type { RecruiterStats } from '../types/dashboard.types';

const EMPTY: RecruiterStats = { totalJobs: 0, activeJobs: 0, totalApplications: 0, shortlisted: 0 };

export interface UseDashboardReturn {
  recentJobs: Job[];
  stats:      RecruiterStats;
  loading:    boolean;
  error:      string | null;
  reload:     () => Promise<void>;
}

export const useDashboard = (): UseDashboardReturn => {
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [stats,      setStats]      = useState<RecruiterStats>(EMPTY);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const jobs = await jobService.listJobs();
      setRecentJobs(jobs.slice(0, 5));
      setStats({
        totalJobs:         jobs.length,
        activeJobs:        jobs.filter(j => j.is_active).length,
        totalApplications: 0,
        shortlisted:       0,
      });
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Failed to load dashboard.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  return { recentJobs, stats, loading, error, reload };
};