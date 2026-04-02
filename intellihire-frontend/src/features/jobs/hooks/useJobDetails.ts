/* ═══════════════════════════════════════════════════════════════
   features/jobs/hooks/useJobDetails.ts
   Hooks for JobDetailsPage — job fetch, apply, shortlist, status
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useState, useCallback } from 'react';
import { jobService } from '../services/job.service';
import { applicationService } from '../../application/services/application.service';
import type { Job } from '../types/job.types';
import type { Application } from '../../application/types/application.types';

/* ─────────────────────────────────────────────────────────────
   useJobDetails
   Fetches a single job by ID.
───────────────────────────────────────────────────────────── */
export function useJobDetails(id: number | null) {
  const [job,     setJob]     = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setJob(await jobService.getJob(id));
    } catch (e: any) {
      setError(String(e?.message ?? 'Failed to load job'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  return { job, loading, error, reload: load };
}

/* ─────────────────────────────────────────────────────────────
   useJobApplications
   Recruiter-only: fetch all applications for a job.
───────────────────────────────────────────────────────────── */
export function useJobApplications(jobId: number | null, isRecruiter: boolean) {
  const [apps,    setApps]    = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!jobId || !isRecruiter) return;
    setLoading(true);
    try {
      setApps(await applicationService.getJobApplications(jobId));
    } catch {
      // silently fail — recruiter sees empty list
    } finally {
      setLoading(false);
    }
  }, [jobId, isRecruiter]);

  useEffect(() => { load(); }, [load]);

  const updateLocalStatus = useCallback((appId: number, status: string) => {
    setApps(prev => prev.map(a => a.id === appId ? { ...a, status: status as any } : a));
  }, []);

  return { apps, loading, reload: load, updateLocalStatus };
}

/* ─────────────────────────────────────────────────────────────
   useApplyForJob
   Candidate: submit application (with optional resume file).
───────────────────────────────────────────────────────────── */
export function useApplyForJob() {
  const [applying, setApplying] = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const apply = useCallback(async (jobId: number, file?: File) => {
    setApplying(true);
    setError(null);
    setSuccess(false);
    try {
      await applicationService.applyForJob(jobId, file);
      setSuccess(true);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Failed to submit application.');
    } finally {
      setApplying(false);
    }
  }, []);

  const reset = () => { setSuccess(false); setError(null); };

  return { apply, applying, success, error, reset };
}

/* ─────────────────────────────────────────────────────────────
   useShortlistJob
   Recruiter: bulk auto-shortlist top N candidates.
───────────────────────────────────────────────────────────── */
export function useShortlistJob(onDone: () => void) {
  const [shortlisting, setShortlisting] = useState(false);
  const [result,       setResult]       = useState<string | null>(null);

  const shortlist = useCallback(async (jobId: number, topN = 10) => {
    setShortlisting(true);
    setResult(null);
    try {
      const r = await applicationService.shortlistJob(jobId, topN);
      setResult(`Shortlisted top ${r.shortlisted_count} candidates`);
      onDone();
    } catch (e: any) {
      setResult(e?.response?.data?.detail ?? 'Shortlisting failed.');
    } finally {
      setShortlisting(false);
    }
  }, [onDone]);

  return { shortlist, shortlisting, result };
}

/* ─────────────────────────────────────────────────────────────
   useUpdateApplicationStatus
   Recruiter: move a single application through the pipeline.
───────────────────────────────────────────────────────────── */
export function useUpdateApplicationStatus(
  onSuccess: (appId: number, status: string) => void,
) {
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const update = useCallback(async (appId: number, status: 'applied' | 'shortlisted' | 'rejected' | 'hired') => {
    setLoadingId(appId);
    try {
      await applicationService.updateApplicationStatus(appId, status);
      onSuccess(appId, status);
    } catch (e: any) {
      alert(e?.response?.data?.detail ?? 'Failed to update status.');
    } finally {
      setLoadingId(null);
    }
  }, [onSuccess]);

  return { update, loadingId };
}