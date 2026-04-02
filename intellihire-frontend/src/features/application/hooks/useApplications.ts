/* ═══════════════════════════════════════════════════════════════
   useApplications.ts  —  custom hooks for ApplicationsPage
   ═══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback } from 'react';
import { applicationService, jobService } from '../services/application.service';
import type { Application, AppStatus, Job } from '../types/application.types';

/* ─── useJobs ────────────────────────────────────────────────────────────────
   Fetches all jobs once on mount. Auto-selects the first job.
   ─────────────────────────────────────────────────────────────────────────── */
export interface UseJobsReturn {
  jobs:        Job[];
  loading:     boolean;
  error:       string | null;
}

export function useJobs(): UseJobsReturn {
  const [jobs,    setJobs]    = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    jobService
      .listJobs()
      .then(setJobs)
      .catch(e => setError(String(e?.message ?? 'Failed to load jobs')))
      .finally(() => setLoading(false));
  }, []);

  return { jobs, loading, error };
}

/* ─── useApplications ────────────────────────────────────────────────────────
   Fetches applications for a given job ID. Re-fetches when jobId changes.
   Exposes a manual refresh function.
   ─────────────────────────────────────────────────────────────────────────── */
export interface UseApplicationsReturn {
  apps:        Application[];
  loading:     boolean;
  error:       string | null;
  refresh:     () => void;
}

export function useApplications(jobId: number | null): UseApplicationsReturn {
  const [apps,    setApps]    = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const fetch = useCallback(() => {
    if (!jobId) { setApps([]); return; }
    setLoading(true);
    setError(null);
    applicationService
      .getJobApplications(jobId)
      .then(setApps)
      .catch(e => setError(String(e?.message ?? 'Failed to load applications')))
      .finally(() => setLoading(false));
  }, [jobId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { apps, loading, error, refresh: fetch };
}

/* ─── useApplicationStatus ───────────────────────────────────────────────────
   Manages optimistic status updates for a single application.
   Returns an update function and a per-id loading state.
   ─────────────────────────────────────────────────────────────────────────── */
export interface UseApplicationStatusReturn {
  statusLoading: number | null;               // id of the app currently being updated
  updateStatus:  (id: number, status: AppStatus, onSuccess: (id: number, status: AppStatus) => void) => Promise<void>;
}

export function useApplicationStatus(): UseApplicationStatusReturn {
  const [statusLoading, setStatusLoading] = useState<number | null>(null);

  const SUPPORTED: AppStatus[] = ['applied', 'shortlisted', 'rejected', 'hired'];

  const updateStatus = useCallback(async (
    id:        number,
    status:    AppStatus,
    onSuccess: (id: number, status: AppStatus) => void,
  ) => {
    if (!SUPPORTED.includes(status)) return;
    setStatusLoading(id);
    try {
      await applicationService.updateApplicationStatus(
        id,
        status as 'applied' | 'shortlisted' | 'rejected' | 'hired',
      );
      onSuccess(id, status);
    } catch {
      alert('Failed to update status. Please try again.');
    } finally {
      setStatusLoading(null);
    }
  }, []);

  return { statusLoading, updateStatus };
}

/* ─── useCandidateFilter ─────────────────────────────────────────────────────
   Filters a list of Applications by status + search term.
   ─────────────────────────────────────────────────────────────────────────── */
export interface UseCandidateFilterReturn {
  filtered:      Application[];
  statusFilter:  string;
  search:        string;
  setStatus:     (s: string) => void;
  setSearch:     (s: string) => void;
  clearFilters:  () => void;
  stats: {
    total:       number;
    scored:      number;
    shortlisted: number;
    hired:       number;
    rejected:    number;
    sourced:     number;
    avg:         number;
  };
}

export function useCandidateFilter(apps: Application[]): UseCandidateFilterReturn {
  const [statusFilter, setStatus] = useState('all');
  const [search,       setSearch] = useState('');

  const filtered = apps.filter(a => {
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || a.candidate?.name?.toLowerCase().includes(q)
      || a.candidate?.email?.toLowerCase().includes(q)
      || (a.candidate?.skills ?? '').toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const scored = apps.filter(a => a.final_score != null);
  const stats = {
    total:       apps.length,
    scored:      scored.length,
    shortlisted: apps.filter(a => a.status === 'shortlisted').length,
    hired:       apps.filter(a => a.status === 'hired').length,
    rejected:    apps.filter(a => a.status === 'rejected').length,
    sourced:     apps.filter(a => a.sourcing_rank != null).length,
    avg:         scored.length > 0
      ? Math.round(scored.reduce((s, a) => s + a.final_score!, 0) / scored.length)
      : 0,
  };

  return {
    filtered,
    statusFilter,
    search,
    setStatus,
    setSearch,
    clearFilters: () => { setStatus('all'); setSearch(''); },
    stats,
  };
}