// features/dashboard/hooks/useCandidateDashboard.ts

import { useState, useEffect, useCallback } from 'react';
import { candidateService } from '../../candidate/services/candidate.service';
import type { CandidateProfile, MyApplication, ApplicationStats } from '../types/dashboard.types';

const EMPTY: ApplicationStats = { total: 0, pending: 0, scored: 0, shortlisted: 0, selected: 0, rejected: 0 };

export interface UseCandidateDashboardReturn {
  profile:      CandidateProfile | null;
  applications: MyApplication[];
  stats:        ApplicationStats;
  loading:      boolean;
  refreshing:   boolean;
  error:        string | null;
  reload:       (showRefresh?: boolean) => Promise<void>;
}

export const useCandidateDashboard = (): UseCandidateDashboardReturn => {
  const [profile,      setProfile]      = useState<CandidateProfile | null>(null);
  const [applications, setApplications] = useState<MyApplication[]>([]);
  const [stats,        setStats]        = useState<ApplicationStats>(EMPTY);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const reload = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const [prof, apps] = await Promise.all([
        candidateService.getMyProfile(),
        candidateService.getMyApplications(),
      ]);
      setProfile(prof);
      setApplications(apps);
      setStats(candidateService.computeStats(apps));
    } catch {
      setError('Failed to load your data. Please try again.');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  return { profile, applications, stats, loading, refreshing, error, reload };
};