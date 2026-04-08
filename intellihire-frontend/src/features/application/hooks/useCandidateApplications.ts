/* ═══════════════════════════════════════════════════════════════
   features/application/hooks/useCandidateApplications.ts
   Candidate-facing hooks — NO recruiter-only score fields exposed
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useState, useCallback } from 'react';
import { applicationService } from '../services/application.service';
import type { Application, AppStatus } from '../types/application.types';

/* ─────────────────────────────────────────────────────────────
   useCandidateApplications
   Fetches the authenticated candidate's own applications.
   Strips semantic_score and rule_score so they can never
   accidentally surface in candidate-facing UI.
───────────────────────────────────────────────────────────── */
export function useCandidateApplications() {
  const [apps,       setApps]       = useState<Application[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const stripRecruiterFields = (raw: Application[]): Application[] =>
    raw.map(a => ({
      ...a,
      semantic_score: null, // recruiter-only — always null for candidates
      rule_score:     null, // recruiter-only — always null for candidates
    }));

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else        setLoading(true);
    setError(null);

    try {
      const data = await applicationService.getMyApplications();
      setApps(stripRecruiterFields(data));
    } catch (e: any) {
      setError(String(e?.message ?? 'Failed to load your applications.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = () => load(true);

  return { apps, loading, refreshing, error, refresh };
}

/* ─────────────────────────────────────────────────────────────
   useCandidateFilter
   Pure client-side filter + stats for the candidate view.
   Only exposes fields safe to show a candidate
   (final_score, fit_summary — never semantic/rule scores).
───────────────────────────────────────────────────────────── */
export function useCandidateFilter(apps: Application[]) {
  const [statusFilter, setStatusFilter] = useState<'all' | AppStatus>('all');
  const [search,       setSearch]       = useState('');

  const filtered = apps.filter(a => {
    const title = (a.job?.title ?? `Job #${a.job_id}`).toLowerCase();
    const matchSearch  = !search || title.includes(search.toLowerCase());
    const matchStatus  = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total:       apps.length,
    active:      apps.filter(a => !['rejected', 'hired'].includes(a.status ?? '')).length,
    applied:     apps.filter(a => a.status === 'applied').length,
    shortlisted: apps.filter(a => a.status === 'shortlisted').length,
    hired:       apps.filter(a => a.status === 'hired').length,
    rejected:    apps.filter(a => a.status === 'rejected').length,
  };

  const clearFilters = () => { setStatusFilter('all'); setSearch(''); };

  return {
    filtered,
    statusFilter, setStatusFilter,
    search,       setSearch,
    stats,
    clearFilters,
  };
}