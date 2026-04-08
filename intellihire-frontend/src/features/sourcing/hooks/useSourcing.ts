// features/sourcing/hooks/useSourcing.ts
import { useState, useRef, useCallback } from 'react';
import {
  sourcingService,
  type SourcingRun,
  type SourcingCandidate,
  type TriggerSourcingParams,
} from '../services/sourcing.service';

/* ─── Constants ──────────────────────────────────────────────────────────────── */
const MAX_POLLS    = 18;
const POLL_INTERVAL = 10_000; // 10 s

/* ─── Hook: useSourcingHistory ───────────────────────────────────────────────── */
export function useSourcingHistory() {
  const [runs,        setRuns]        = useState<SourcingRun[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [neverSourced,setNeverSourced]= useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const fetchHistory = useCallback(async (jobId: number) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await sourcingService.getHistory(jobId);
      setRuns(resp.runs);
      setNeverSourced(!resp.sourced || resp.runs.length === 0);
      return resp;
    } catch (e) {
      console.error('[useSourcingHistory] fetchHistory failed:', e);
      setError('Failed to load sourcing history.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setRuns([]);
    setNeverSourced(false);
    setError(null);
  }, []);

  return { runs, loading, neverSourced, error, fetchHistory, reset };
}

/* ─── Hook: useSourcingCandidates ────────────────────────────────────────────── */
export function useSourcingCandidates() {
  const [candidates,       setCandidates]       = useState<SourcingCandidate[]>([]);
  const [activeSourcingId, setActiveSourcingId] = useState<number | null>(null);
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState<string | null>(null);

  const fetchCandidates = useCallback(async (sourcingId: number, jobId?: number) => {
    setActiveSourcingId(sourcingId);
    setLoading(true);
    setCandidates([]);
    setError(null);
    try {
      const resp = await sourcingService.getCandidates(sourcingId, jobId);
      setCandidates(resp.candidates);
      return resp;
    } catch (e) {
      console.error('[useSourcingCandidates] fetchCandidates failed:', e);
      setError('Failed to load candidates.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /** Optimistically updates a candidate's source_tag to 'applied_shortlisted'. */
  const markShortlisted = useCallback((candidateId: number) => {
    setCandidates(prev =>
      prev.map(c =>
        c.candidate_id === candidateId
          ? { ...c, source_tag: 'applied_shortlisted' }
          : c,
      ),
    );
  }, []);

  const reset = useCallback(() => {
    setCandidates([]);
    setActiveSourcingId(null);
    setError(null);
  }, []);

  return {
    candidates,
    activeSourcingId,
    loading,
    error,
    fetchCandidates,
    markShortlisted,
    reset,
  };
}

/* ─── Hook: useSourcingTrigger ───────────────────────────────────────────────── */
export interface UseSourcingTriggerOptions {
  /** Called with the new sourcing_id as soon as the task is queued. */
  onQueued?: (sourcingId: number) => void;
  /** Called with the streamed-in candidates once the Celery task completes. */
  onComplete?: (candidates: SourcingCandidate[], sourcingId: number) => void;
  /** Called when the max poll count is reached without a result. */
  onTimeout?: () => void;
}

export function useSourcingTrigger(options: UseSourcingTriggerOptions = {}) {
  const [triggering,  setTriggering]  = useState(false);
  const [pollAttempt, setPollAttempt] = useState(0);
  const [error,       setError]       = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setTriggering(false);
    setPollAttempt(0);
  }, []);

  const trigger = useCallback(async (params: TriggerSourcingParams) => {
    if (triggering) return;
    setTriggering(true);
    setPollAttempt(0);
    setError(null);

    // Clear any lingering poll from a previous run
    if (pollRef.current) clearInterval(pollRef.current);

    try {
      const result = await sourcingService.triggerSourcing(params);
      const { sourcing_id: sourcingId } = result;

      options.onQueued?.(sourcingId);

      let attempts = 0;

      pollRef.current = setInterval(async () => {
        attempts++;
        setPollAttempt(attempts);

        try {
          const resp = await sourcingService.getCandidates(sourcingId, params.job_id);

          if (resp.ready && resp.candidates.length > 0) {
            stopPolling();
            options.onComplete?.(resp.candidates, sourcingId);
          }
        } catch {
          // Network hiccup — keep polling until MAX_POLLS
        }

        if (attempts >= MAX_POLLS) {
          stopPolling();
          options.onTimeout?.();
        }
      }, POLL_INTERVAL);
    } catch (e) {
      console.error('[useSourcingTrigger] trigger failed:', e);
      setError('Failed to start sourcing. Please try again.');
      stopPolling();
    }
  }, [triggering, stopPolling, options]);

  /** Abort an in-progress poll (e.g. when the user navigates away). */
  const cancel = useCallback(() => {
    stopPolling();
  }, [stopPolling]);

  return {
    triggering,
    pollAttempt,
    maxPolls: MAX_POLLS,
    error,
    trigger,
    cancel,
  };
}

/* ─── Hook: useShortlist ─────────────────────────────────────────────────────── */
export function useShortlist() {
  const [shortlisting, setShortlisting] = useState<Record<number, boolean>>({});
  const [error,        setError]        = useState<string | null>(null);

  const shortlist = useCallback(
    async (
      candidateId: number,
      jobId: number,
      onSuccess?: (candidateId: number) => void,
    ) => {
      setShortlisting(prev => ({ ...prev, [candidateId]: true }));
      setError(null);
      try {
        await sourcingService.shortlistCandidate(candidateId, jobId);
        onSuccess?.(candidateId);
      } catch (e) {
        console.error('[useShortlist] shortlist failed:', e);
        setError('Failed to shortlist candidate. Please try again.');
      } finally {
        setShortlisting(prev => ({ ...prev, [candidateId]: false }));
      }
    },
    [],
  );

  const isShortlisting = useCallback(
    (candidateId: number) => !!shortlisting[candidateId],
    [shortlisting],
  );

  return { shortlist, isShortlisting, error };
}

/* ─── Hook: useCandidateFilter ───────────────────────────────────────────────── */
export function useCandidateFilter(candidates: SourcingCandidate[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter,  setTagFilter]  = useState('all');

  const filtered = candidates.filter(c => {
    const s           = searchTerm.toLowerCase();
    const matchSearch = !s
      || c.name.toLowerCase().includes(s)
      || (c.fit_summary ?? '').toLowerCase().includes(s);
    const matchTag    = tagFilter === 'all' || c.source_tag === tagFilter;
    return matchSearch && matchTag;
  });

  const allTags = [
    'all',
    ...Array.from(new Set(candidates.map(c => c.source_tag))),
  ];

  const stats = {
    total:    candidates.length,
    internal: candidates.filter(c => c.source_tag !== 'external').length,
    external: candidates.filter(c => c.source_tag === 'external').length,
    avg:
      candidates.length > 0
        ? Math.round(
            (candidates.reduce((s, c) => s + c.final_score, 0) / candidates.length) * 100,
          )
        : 0,
    top:
      candidates.length > 0
        ? Math.round(Math.max(...candidates.map(c => c.final_score)) * 100)
        : 0,
  };

  const clearSearch = useCallback(() => setSearchTerm(''),  []);
  const clearFilter = useCallback(() => setTagFilter('all'), []);
  const clearAll    = useCallback(() => { setSearchTerm(''); setTagFilter('all'); }, []);

  return {
    searchTerm,
    setSearchTerm,
    tagFilter,
    setTagFilter,
    filtered,
    allTags,
    stats,
    clearSearch,
    clearFilter,
    clearAll,
  };
}