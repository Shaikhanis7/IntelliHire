// features/jobs/hooks/useJobs.ts
// Custom hook — full CRUD + toggle for recruiter + list for candidate
// Design tokens match SourcingPage exactly

import { useState, useCallback, useEffect } from 'react';
import { jobService } from '../services/job.service';
import type { Job, JobCreateRequest, JobUpdateRequest } from '../types/job.types';

/* ─── useJobs ────────────────────────────────────────────────────────────────── */
export const useJobs = (autoLoad = true) => {
  const [jobs, setJobs]             = useState<Job[]>([]);
  const [loading, setLoading]       = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const data = await jobService.listJobs();
      setJobs(data);
    } catch {
      setError('Failed to load jobs. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) load();
  }, [autoLoad, load]);

  const createJob = useCallback(async (data: JobCreateRequest): Promise<Job> => {
    const created = await jobService.createJob(data);
    setJobs(prev => [created, ...prev]);
    return created;
  }, []);

  const updateJob = useCallback(async (jobId: number, data: JobUpdateRequest): Promise<Job> => {
    const updated = await jobService.updateJob(jobId, data);
    setJobs(prev => prev.map(j => j.id === updated.id ? updated : j));
    return updated;
  }, []);

  const deleteJob = useCallback(async (jobId: number): Promise<void> => {
    await jobService.deleteJob(jobId);
    setJobs(prev => prev.filter(j => j.id !== jobId));
  }, []);

  const toggleJob = useCallback(async (jobId: number, currentIsActive: boolean): Promise<void> => {
    const updated = currentIsActive
      ? await jobService.closeJob(jobId)
      : await jobService.reopenJob(jobId);
    setJobs(prev => prev.map(j => j.id === updated.id ? updated : j));
  }, []);

  return { jobs, loading, refreshing, error, load, createJob, updateJob, deleteJob, toggleJob };
};

/* ─── useJobFilters ──────────────────────────────────────────────────────────── */
export const useJobFilters = (jobs: Job[]) => {
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed'>('all');

  const parseSkills = (s: string | string[] | null | undefined): string[] => {
    if (!s) return [];
    if (Array.isArray(s)) return s;
    return s.split(',').map(x => x.trim()).filter(Boolean);
  };

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || j.title.toLowerCase().includes(q)
      || j.description?.toLowerCase().includes(q)
      || j.location?.toLowerCase().includes(q)
      || parseSkills(j.skills_required).some(s => s.toLowerCase().includes(q));
    const matchStatus =
      statusFilter === 'all'    ? true :
      statusFilter === 'active' ? j.is_active : !j.is_active;
    return matchSearch && matchStatus;
  });

  const stats = {
    total:  jobs.length,
    active: jobs.filter(j => j.is_active).length,
    closed: jobs.filter(j => !j.is_active).length,
  };

  return { search, setSearch, statusFilter, setStatusFilter, filtered, stats };
};

/* ─── useJobModal ────────────────────────────────────────────────────────────── */
export type ModalMode = 'create' | 'edit' | null;

export const useJobModal = () => {
  const [mode, setMode]   = useState<ModalMode>(null);
  const [job, setJob]     = useState<Job | null>(null);
  const [saving, setSaving] = useState(false);

  const openCreate = ()           => { setJob(null); setMode('create'); };
  const openEdit   = (j: Job)     => { setJob(j);    setMode('edit');   };
  const close      = ()           => { setMode(null); setJob(null);     };

  return { mode, job, saving, setSaving, openCreate, openEdit, close };
};