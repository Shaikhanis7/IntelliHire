/* ═══════════════════════════════════════════════════════════════
   features/application/hooks/useRecruiterApplications.ts
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useState, useCallback } from 'react';
import { applicationService, jobService } from '../services/application.service';
import type { Application, AppStatus, Job } from '../types/application.types';

/* ─────────────────────────────────────────────────────────────
   useJobs
   Fetches the full job list once on mount.
───────────────────────────────────────────────────────────── */
export function useJobs() {
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

/* ─────────────────────────────────────────────────────────────
   useRecruiterApplications
   Fetches all applications for the given jobId.
   Re-fetches whenever jobId changes.
   Exposes:
     • refresh()                       — manual re-fetch
     • updateLocalStatus(id, status)   — optimistic local patch
───────────────────────────────────────────────────────────── */
export function useRecruiterApplications(jobId: number | null) {
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

  const updateLocalStatus = useCallback((id: number, status: AppStatus) => {
    setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  }, []);

  return { apps, loading, error, refresh: fetch, updateLocalStatus };
}

/* ─────────────────────────────────────────────────────────────
   useApplicationStatus
   Handles the async PATCH for a single application.
   Calls onSuccess (updateLocalStatus) optimistically after
   the server confirms.
───────────────────────────────────────────────────────────── */
const PATCHABLE: AppStatus[] = ['applied', 'shortlisted', 'rejected', 'hired'];

export function useApplicationStatus(
  onSuccess: (id: number, status: AppStatus) => void,
) {
  const [statusLoading, setStatusLoading] = useState<number | null>(null);

  const updateStatus = useCallback(
    async (id: number, status: AppStatus) => {
      if (!PATCHABLE.includes(status)) return;
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
    },
    [onSuccess],
  );

  return { statusLoading, updateStatus };
}

/* ─────────────────────────────────────────────────────────────
   useRecruiterFilter
   Pure client-side filtering + stats — no API calls.
   Accepts the full apps array and returns a filtered view
   plus aggregated stats for the stat-strip.
───────────────────────────────────────────────────────────── */
export function useRecruiterFilter(apps: Application[]) {
  const [statusFilter, setStatus] = useState<string>('all');
  const [search,       setSearch] = useState('');

  const filtered = apps.filter(a => {
    const matchStatus =
      statusFilter === 'all' || a.status === statusFilter;

    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (a.candidate?.name  ?? '').toLowerCase().includes(q) ||
      (a.candidate?.email ?? '').toLowerCase().includes(q) ||
      (a.candidate?.skills ?? '').toLowerCase().includes(q);

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
    avg:
      scored.length > 0
        ? Math.round(
            scored.reduce((sum, a) => sum + a.final_score!, 0) / scored.length,
          )
        : 0,
  };

  const clearFilters = () => { setStatus('all'); setSearch(''); };

  return {
    filtered,
    statusFilter,
    search,
    stats,
    setStatus,
    setSearch,
    clearFilters,
  };
}