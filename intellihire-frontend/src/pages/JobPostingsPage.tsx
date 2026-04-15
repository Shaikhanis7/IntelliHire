// pages/JobPostingsPage.tsx — FULLY RESPONSIVE
// Design: exact SourcingPage tokens — #f0f5ff bg, blue/teal/indigo/amber,
//         Fraunces (headings) + DM Sans (body), frosted glass cards, dot-grid bg
// Recruiter: create / edit / delete / toggle with JobFormModal
// Candidate: job board with Quick Apply + resume-required flow

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase, Plus, Search, MapPin, Clock,
  CheckCircle, Eye, Trash2, Edit3,
  Loader2, AlertCircle, RefreshCw, ArrowRight,
  X, UploadCloud, FileText,
  ListChecks, ToggleLeft, ToggleRight,
  Filter, Star, Users, Zap, Sparkles,
  Database,
} from 'lucide-react';

import { jobService }         from '../features/jobs/services/job.service';
import { formatDate }         from '../utils/helpers';
import type { RootState }     from '../app/store';
import type { Job }           from '../features/jobs/types/job.types';
import { applicationService } from '../features/application/services/application.service';
import axiosInstance          from '../lib/axios';
import { useJobs, useJobFilters, useJobModal } from '../features/jobs/hooks/useJobs';
import { JobCard }            from '../features/jobs/components/JobCard';
import { JobFormModal }       from '../features/jobs/components/JobFormModal';

/* ─── Design tokens ──────────────────────────────────────────── */
const C = {
  bg:           '#f0f5ff',
  bgAlt:        '#e6eeff',
  bgCard:       '#ffffff',
  surface:      '#f5f8ff',
  surfaceDeep:  '#e8effe',
  border:       'rgba(79,125,255,0.13)',
  borderMid:    'rgba(79,125,255,0.22)',
  borderHov:    'rgba(79,125,255,0.45)',
  borderFocus:  '#4f7dff',
  blue:         '#4f7dff',
  blueLight:    '#6b93ff',
  blueDark:     '#2a4fff',
  blueDim:      'rgba(79,125,255,0.10)',
  blueMid:      'rgba(79,125,255,0.18)',
  gradBlue:     'linear-gradient(135deg, #2a4fff 0%, #4f7dff 50%, #6b93ff 100%)',
  teal:         '#06d6b0',
  tealLight:    '#09ebb8',
  tealDim:      'rgba(6,214,176,0.10)',
  tealBorder:   'rgba(6,214,176,0.30)',
  indigo:       '#9b6dff',
  indigoDim:    'rgba(155,109,255,0.09)',
  amber:        '#f59e0b',
  amberDim:     'rgba(245,158,11,0.09)',
  amberBorder:  'rgba(245,158,11,0.30)',
  danger:       '#ef4444',
  dangerDim:    'rgba(239,68,68,0.08)',
  dangerBorder: 'rgba(239,68,68,0.28)',
  text:         '#0d1b3e',
  textMid:      '#1e3260',
  textMuted:    '#4f6a9a',
  textFaint:    '#8fa3c8',
  white:        '#ffffff',
  shadow:       '0 1px 3px rgba(15,30,80,0.06), 0 6px 20px rgba(15,30,80,0.07)',
  shadowHov:    '0 4px 8px rgba(15,30,80,0.05), 0 18px 44px rgba(15,30,80,0.12)',
  shadowBlue:   '0 4px 22px rgba(79,125,255,0.28)',
  shadowTeal:   '0 4px 16px rgba(6,214,176,0.25)',
};

const parseSkills = (s: string | string[] | null | undefined): string[] => {
  if (!s) return [];
  if (Array.isArray(s)) return s;
  return s.split(',').map(x => x.trim()).filter(Boolean);
};

/* ═══════════════════════════════════════════════════════════════
   BACKGROUND
═══════════════════════════════════════════════════════════════ */
const BgPattern: React.FC = () => (
  <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: 680, height: 560, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(79,125,255,0.13) 0%, rgba(79,125,255,0.04) 50%, transparent 75%)', filter: 'blur(64px)', animation: 'jpOrbFloat1 18s ease-in-out infinite' }} />
    <div style={{ position: 'absolute', bottom: '-8%', left: '-4%', width: 560, height: 480, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(6,214,176,0.10) 0%, rgba(6,214,176,0.03) 50%, transparent 75%)', filter: 'blur(72px)', animation: 'jpOrbFloat2 22s ease-in-out infinite' }} />
    <div style={{ position: 'absolute', top: '40%', left: '30%', width: 440, height: 360, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(155,109,255,0.07) 0%, transparent 70%)', filter: 'blur(60px)', animation: 'jpOrbFloat3 26s ease-in-out infinite' }} />
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.38 }}>
      <defs>
        <pattern id="jpDotGrid" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.85" fill="rgba(79,125,255,0.20)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#jpDotGrid)" />
    </svg>
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, transparent 0%, #4f7dff 30%, #06d6b0 60%, transparent 100%)', opacity: 0.6 }} />
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   SHARED MICRO-COMPONENTS
═══════════════════════════════════════════════════════════════ */
const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; delay?: number }> = ({ children, style, delay = 0 }) => (
  <div style={{
    background: 'rgba(255,255,255,0.82)',
    backdropFilter: 'blur(20px) saturate(1.5)',
    border: `1px solid ${C.border}`,
    borderRadius: 18, boxShadow: C.shadow,
    animationDelay: `${delay}s`, animationFillMode: 'both',
    animationName: 'jpFadeUp', animationDuration: '0.5s',
    animationTimingFunction: 'cubic-bezier(0.22,1,0.36,1)',
    ...style,
  }}>
    {children}
  </div>
);

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color: string; delay?: number }> = ({ label, value, icon, color, delay = 0 }) => {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      background: hov ? C.white : 'rgba(255,255,255,0.80)',
      backdropFilter: 'blur(16px)',
      border: `1px solid ${hov ? color + '35' : C.border}`,
      borderRadius: 16, padding: '14px 16px',
      boxShadow: hov ? `0 8px 32px ${color}18` : C.shadow,
      transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)',
      transform: hov ? 'translateY(-3px)' : 'none', cursor: 'default',
      animationDelay: `${delay}s`, animationFillMode: 'both',
      animationName: 'jpFadeUp', animationDuration: '0.5s',
      animationTimingFunction: 'cubic-bezier(0.22,1,0.36,1)',
    }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, marginBottom: 10, background: `${color}12`, border: `1px solid ${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: hov ? `0 0 16px ${color}30` : 'none', transition: 'box-shadow 0.25s' }}>
        <span style={{ color, display: 'flex' }}>{icon}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: C.text, letterSpacing: '-1px', lineHeight: 1, fontFamily: "'Fraunces', Georgia, serif" }}>{value}</div>
      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4, fontWeight: 500, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{label}</div>
    </div>
  );
};

const FilterBtn: React.FC<{ label: string; count: number; active: boolean; color: string; onClick: () => void }> = ({ label, count, active, color, onClick }) => (
  <button onClick={onClick} style={{
    padding: '5px 11px', borderRadius: 8,
    border: `1px solid ${active ? color + '55' : C.border}`,
    background: active ? `${color}10` : C.white,
    color: active ? color : C.textMuted,
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    transition: 'all 0.18s',
    boxShadow: active ? `0 0 10px ${color}18` : 'none',
    whiteSpace: 'nowrap',
  }}
    onMouseEnter={e => { if (!active) { const b = e.currentTarget as HTMLButtonElement; b.style.background = `${color}08`; b.style.borderColor = `${color}35`; } }}
    onMouseLeave={e => { if (!active) { const b = e.currentTarget as HTMLButtonElement; b.style.background = C.white; b.style.borderColor = C.border; } }}
  >
    {label} <span style={{ opacity: 0.65, fontSize: 10.5 }}>{count}</span>
  </button>
);

/* ═══════════════════════════════════════════════════════════════
   RESUME MODAL
═══════════════════════════════════════════════════════════════ */
const resumeService = {
  async hasResume(): Promise<boolean> {
    try { const r = await axiosInstance.get('/resumes/mine'); return Array.isArray(r.data) ? r.data.length > 0 : !!r.data; }
    catch { return false; }
  },
  async upload(file: File): Promise<void> {
    const f = new FormData(); f.append('file', file);
    await axiosInstance.post('/resumes/upload', f, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

const ResumeModal: React.FC<{ jobTitle: string; jobId: number; onSuccess: () => void; onClose: () => void }> = ({ jobTitle, jobId, onSuccess, onClose }) => {
  const [file, setFile]   = useState<File | null>(null);
  const [drag, setDrag]   = useState(false);
  const [step, setStep]   = useState<'upload' | 'submitting' | 'done' | 'error'>('upload');
  const [err, setErr]     = useState('');
  const inputRef          = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (f.type !== 'application/pdf') { setErr('Please upload a PDF file.'); return; }
    if (f.size > 5 * 1024 * 1024)    { setErr('File must be under 5 MB.');   return; }
    setErr(''); setFile(f);
  };

  const submit = async () => {
    if (!file) return; setStep('submitting');
    try {
      await resumeService.upload(file);
      await applicationService.applyForJob(jobId);
      setStep('done');
      setTimeout(() => { onSuccess(); onClose(); }, 1200);
    } catch (e: any) { setErr(e?.response?.data?.detail ?? 'Something went wrong.'); setStep('error'); }
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(13,27,62,0.55)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
    >
      <div style={{ background: C.white, border: `1px solid ${C.borderMid}`, borderRadius: 20, width: '100%', maxWidth: 480, boxShadow: '0 24px 64px rgba(15,30,80,0.18)', animation: 'jpFadeUp 0.25s ease both', overflow: 'hidden' }}>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${C.blue}, ${C.teal})` }} />
        <div style={{ padding: '18px 20px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: C.blueDim, border: `1px solid ${C.blue}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={17} style={{ color: C.blue }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: "'Fraunces', Georgia, serif" }}>Upload resume to apply</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2, fontFamily: "'DM Sans', system-ui, sans-serif" }}>Applying to: <strong style={{ color: C.blue }}>{jobTitle}</strong></div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textFaint, display: 'flex', padding: 4, flexShrink: 0 }}><X size={18} /></button>
        </div>

        <div style={{ padding: '20px 20px' }}>
          {step === 'done' ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: C.tealDim, border: `1px solid ${C.tealBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <CheckCircle size={24} style={{ color: C.teal }} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 6, fontFamily: "'Fraunces', Georgia, serif" }}>Application sent!</div>
              <div style={{ fontSize: 13, color: C.textMuted, fontFamily: "'DM Sans', system-ui, sans-serif" }}>Your resume was uploaded and application submitted.</div>
            </div>
          ) : (
            <>
              <div style={{ padding: '10px 14px', borderRadius: 10, background: C.blueDim, border: `1px solid ${C.blue}22`, fontSize: 13, color: C.textMuted, marginBottom: 18, lineHeight: 1.6, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                You don't have a resume on file yet. Upload a PDF below — we'll save it and submit your application in one step.
              </div>
              <div
                onDragOver={e => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onClick={() => inputRef.current?.click()}
                style={{ border: `2px dashed ${drag ? C.blue : file ? C.teal : C.borderMid}`, borderRadius: 14, padding: '24px 16px', textAlign: 'center', cursor: 'pointer', background: drag ? C.blueDim : file ? C.tealDim : C.surface, transition: 'all 0.18s', marginBottom: 14 }}
              >
                <input ref={inputRef} type="file" accept=".pdf,application/pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                {file ? (
                  <>
                    <FileText size={22} style={{ color: C.teal, display: 'block', margin: '0 auto 10px' }} />
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4, fontFamily: "'Fraunces', Georgia, serif", wordBreak: 'break-all' }}>{file.name}</div>
                    <div style={{ fontSize: 12, color: C.textMuted, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{(file.size / 1024).toFixed(0)} KB · PDF</div>
                    <button onClick={e => { e.stopPropagation(); setFile(null); }} style={{ marginTop: 10, padding: '4px 12px', borderRadius: 7, border: `1px solid ${C.border}`, background: C.white, fontSize: 12, fontWeight: 600, color: C.textMuted, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}>Change file</button>
                  </>
                ) : (
                  <>
                    <UploadCloud size={22} style={{ color: drag ? C.blue : C.textFaint, display: 'block', margin: '0 auto 12px', transition: 'color 0.15s' }} />
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6, fontFamily: "'Fraunces', Georgia, serif" }}>{drag ? 'Drop your PDF here' : 'Drag & drop your resume'}</div>
                    <div style={{ fontSize: 12, color: C.textMuted, fontFamily: "'DM Sans', system-ui, sans-serif" }}>or click to browse · PDF only · max 5 MB</div>
                  </>
                )}
              </div>
              {(err || step === 'error') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 13px', borderRadius: 9, background: C.dangerDim, border: `1px solid ${C.dangerBorder}`, fontSize: 13, color: C.danger, marginBottom: 14, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                  <AlertCircle size={14} style={{ flexShrink: 0 }} /> {err || 'Something went wrong. Please try again.'}
                </div>
              )}
            </>
          )}
        </div>

        {step !== 'done' && (
          <div style={{ padding: '12px 20px 18px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 9, border: `1px solid ${C.border}`, background: C.white, fontSize: 13.5, fontWeight: 600, color: C.textMuted, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}>Cancel</button>
            <button onClick={submit} disabled={!file || step === 'submitting'}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 20px', borderRadius: 9, background: !file ? C.surfaceDeep : C.gradBlue, border: 'none', color: !file ? C.textFaint : C.white, fontSize: 13.5, fontWeight: 700, cursor: !file || step === 'submitting' ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", boxShadow: !file ? 'none' : C.shadowBlue, transition: 'all 0.15s' }}>
              {step === 'submitting' ? <><Loader2 size={13} style={{ animation: 'jpSpin 1s linear infinite' }} /> Submitting…</> : <><ArrowRight size={13} /> Upload & Apply</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   CANDIDATE VIEW
═══════════════════════════════════════════════════════════════ */
const CandidateView: React.FC = () => {
  const navigate = useNavigate();
  const { jobs, loading, error, load } = useJobs();
  const { search, setSearch, statusFilter, setStatusFilter, filtered, stats } = useJobFilters(jobs);
  const [appliedMap, setAppliedMap]   = useState<Record<number, boolean>>({});
  const [applyingId, setApplyingId]   = useState<number | null>(null);
  const [resumeModal, setResumeModal] = useState<{ jobId: number; jobTitle: string } | null>(null);

  useEffect(() => {
    applicationService.getMyApplications()
      .then(apps => { const m: Record<number, boolean> = {}; apps.forEach(a => { m[a.job_id] = true; }); setAppliedMap(m); })
      .catch(() => {});
  }, []);

  const handleApply = useCallback(async (jobId: number) => {
    setApplyingId(jobId);
    try {
      const hasResume = await resumeService.hasResume();
      if (!hasResume) {
        const job = jobs.find(j => j.id === jobId);
        setResumeModal({ jobId, jobTitle: job?.title ?? 'this position' });
        setApplyingId(null); return;
      }
      await applicationService.applyForJob(jobId);
      setAppliedMap(prev => ({ ...prev, [jobId]: true }));
    } catch (e: any) {
      const detail = e?.response?.data?.detail ?? '';
      if (detail.toLowerCase().includes('resume')) {
        const job = jobs.find(j => j.id === jobId);
        setResumeModal({ jobId, jobTitle: job?.title ?? 'this position' });
      } else alert(detail || 'Could not apply. Please try again.');
    } finally { setApplyingId(null); }
  }, [jobs]);

  const appliedCount = Object.keys(appliedMap).length;

  return (
    <div>
      {/* Header */}
      <div className="jp-page-header" style={{ marginBottom: 22, position: 'relative', zIndex: 2, animationName: 'jpFadeUp', animationDuration: '0.4s', animationFillMode: 'both' }}>
        <div className="jp-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 50, height: 50, borderRadius: 15, background: C.gradBlue, boxShadow: C.shadowBlue, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Briefcase size={22} color={C.white} />
            </div>
            <div>
              <h1 style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 700, color: C.text, letterSpacing: '-0.6px', margin: 0, lineHeight: 1.1, fontFamily: "'Fraunces', Georgia, serif" }}>
                Open Positions
              </h1>
              <p style={{ fontSize: 13, color: C.textMuted, margin: '3px 0 0', fontWeight: 500, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                {stats.active} roles available · {appliedCount} applied by you
              </p>
            </div>
          </div>
          {appliedCount > 0 && (
            <button onClick={() => navigate('/my-applications')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, border: `1px solid ${C.tealBorder}`, background: C.tealDim, fontSize: 13, fontWeight: 700, color: C.teal, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
              <ListChecks size={14} /> Track ({appliedCount})
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="jp-stat-grid" style={{ marginBottom: 20, position: 'relative', zIndex: 2 }}>
        <StatCard label="Total roles"  value={stats.total}   color={C.blue}   icon={<Briefcase size={14}/>}    delay={0}    />
        <StatCard label="Open now"     value={stats.active}  color={C.teal}   icon={<Star size={14}/>}          delay={0.06} />
        <StatCard label="Applied"      value={appliedCount}  color={C.indigo} icon={<CheckCircle size={14}/>}   delay={0.12} />
      </div>

      {/* Search + filter */}
      <Card style={{ padding: '12px 14px', marginBottom: 16 }} delay={0.08}>
        <div className="jp-filter-bar">
          <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: C.textFaint, pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title, skill, keyword…"
              style={{ width: '100%', padding: '8px 32px 8px 32px', border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 13, color: C.text, background: C.surface, fontFamily: "'DM Sans', system-ui, sans-serif", outline: 'none', transition: 'all 0.15s' }}
              onFocus={e => { e.target.style.borderColor = C.borderFocus; (e.target as HTMLInputElement).style.boxShadow = `0 0 0 3px rgba(79,125,255,0.10)`; }}
              onBlur={e  => { e.target.style.borderColor = C.border; (e.target as HTMLInputElement).style.boxShadow = 'none'; }}
            />
            {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.textFaint, display: 'flex' }}><X size={12} /></button>}
          </div>
          <div className="jp-filter-pills">
            <Filter size={12} style={{ color: C.textFaint, flexShrink: 0 }} />
            <FilterBtn label="All"     count={stats.total}  active={statusFilter === 'all'}    color={C.blue}   onClick={() => setStatusFilter('all')}    />
            <FilterBtn label="Open"    count={stats.active} active={statusFilter === 'active'} color={C.teal}   onClick={() => setStatusFilter('active')} />
            <FilterBtn label="Applied" count={appliedCount} active={statusFilter === 'closed'} color={C.indigo} onClick={() => setStatusFilter('closed')} />
          </div>
        </div>
      </Card>

      {!loading && filtered.length > 0 && (
        <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, marginBottom: 10, padding: '0 2px', position: 'relative', zIndex: 2, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          <strong style={{ color: C.text }}>{filtered.length}</strong> position{filtered.length !== 1 ? 's' : ''}
          {search && ` · "${search}"`}
        </div>
      )}

      {/* Job grid */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        {error ? (
          <Card style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.danger, fontSize: 13.5, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              <AlertCircle size={15} /> {error}
            </div>
          </Card>
        ) : loading ? (
          <Card style={{ padding: '60px 0', textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', margin: '0 auto 12px', border: `2.5px solid ${C.blueDim}`, borderTop: `2.5px solid ${C.blue}`, animation: 'jpSpin 1s linear infinite' }} />
            <p style={{ fontSize: 13, color: C.textMuted, margin: 0, fontFamily: "'DM Sans', system-ui, sans-serif" }}>Loading positions…</p>
          </Card>
        ) : filtered.length === 0 ? (
          <Card style={{ padding: '64px 32px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px', background: C.surfaceDeep, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Briefcase size={26} style={{ color: C.textFaint }} />
            </div>
            <p style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 8px', fontFamily: "'Fraunces', Georgia, serif" }}>
              {jobs.length === 0 ? 'No positions yet' : 'No matches found'}
            </p>
            <p style={{ fontSize: 13, color: C.textMuted, margin: 0, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              {jobs.length === 0 ? 'Check back soon for new openings.' : `No results for "${search}"`}
            </p>
          </Card>
        ) : (
          <div className="jp-job-grid">
            {filtered.map((job, i) => (
              <JobCard
                key={job.id} job={job} index={i}
                role="candidate"
                applied={!!appliedMap[job.id]}
                applying={applyingId === job.id}
                onApply={handleApply}
                onView={j => navigate(`/jobs/${j.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {resumeModal && (
        <ResumeModal
          jobId={resumeModal.jobId} jobTitle={resumeModal.jobTitle}
          onSuccess={() => setAppliedMap(prev => ({ ...prev, [resumeModal!.jobId]: true }))}
          onClose={() => setResumeModal(null)}
        />
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   RECRUITER VIEW
═══════════════════════════════════════════════════════════════ */
const RecruiterView: React.FC = () => {
  const navigate = useNavigate();
  const { jobs, loading, refreshing, error, load, createJob, updateJob, deleteJob, toggleJob } = useJobs();
  const { search, setSearch, statusFilter, setStatusFilter, filtered, stats } = useJobFilters(jobs);
  const modal = useJobModal();

  const handleSave = async (data: any) => {
    modal.setSaving(true);
    try {
      if (modal.mode === 'create') await createJob(data);
      else if (modal.job)         await updateJob(modal.job.id, { ...data, skills_required: data.skills_required });
      modal.close();
    } catch { alert('Save failed. Please try again.'); }
    finally { modal.setSaving(false); }
  };

  return (
    <div>
      {/* Header */}
      <div className="jp-page-header" style={{ marginBottom: 22, position: 'relative', zIndex: 2, animationName: 'jpFadeUp', animationDuration: '0.4s', animationFillMode: 'both' }}>
        <div className="jp-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 50, height: 50, borderRadius: 15, background: C.gradBlue, boxShadow: C.shadowBlue, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Briefcase size={22} color={C.white} />
            </div>
            <div>
              <h1 style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 700, color: C.text, letterSpacing: '-0.6px', margin: 0, lineHeight: 1.1, fontFamily: "'Fraunces', Georgia, serif" }}>
                Job Postings
              </h1>
              <p style={{ fontSize: 13, color: C.textMuted, margin: '3px 0 0', fontWeight: 500, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                {stats.active} active · {stats.closed} closed · {stats.total} total
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={() => load(true)} disabled={refreshing}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.white, fontSize: 12.5, fontWeight: 600, color: C.textMuted, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", transition: 'all 0.15s' }}>
              <RefreshCw size={12} style={{ animation: refreshing ? 'jpSpin 1s linear infinite' : 'none' }} />
              <span className="jp-hide-xs">{refreshing ? 'Refreshing…' : 'Refresh'}</span>
            </button>
            <button onClick={modal.openCreate}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, background: C.gradBlue, border: 'none', color: C.white, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", boxShadow: C.shadowBlue, whiteSpace: 'nowrap' }}>
              <Plus size={14} /> <span className="jp-hide-xs">Post new job</span><span className="jp-show-xs">Post</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="jp-stat-grid" style={{ marginBottom: 20, position: 'relative', zIndex: 2 }}>
        <StatCard label="Total postings" value={stats.total}  color={C.blue}      icon={<Briefcase size={14}/>}  delay={0}    />
        <StatCard label="Active"         value={stats.active} color={C.teal}      icon={<Star size={14}/>}       delay={0.06} />
        <StatCard label="Closed"         value={stats.closed} color={C.textMuted} icon={<Database size={14}/>}   delay={0.12} />
      </div>

      {/* Search + filter */}
      <Card style={{ padding: '12px 14px', marginBottom: 14 }} delay={0.06}>
        <div className="jp-filter-bar">
          <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: C.textFaint, pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title, location, skill…"
              style={{ width: '100%', padding: '8px 32px 8px 32px', border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 13, color: C.text, background: C.surface, fontFamily: "'DM Sans', system-ui, sans-serif", outline: 'none', transition: 'all 0.15s' }}
              onFocus={e => { e.target.style.borderColor = C.borderFocus; (e.target as HTMLInputElement).style.boxShadow = `0 0 0 3px rgba(79,125,255,0.10)`; }}
              onBlur={e  => { e.target.style.borderColor = C.border; (e.target as HTMLInputElement).style.boxShadow = 'none'; }}
            />
            {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.textFaint, display: 'flex' }}><X size={12} /></button>}
          </div>
          <div className="jp-filter-pills">
            <Filter size={12} style={{ color: C.textFaint, flexShrink: 0 }} />
            <FilterBtn label="All"    count={stats.total}  active={statusFilter === 'all'}    color={C.blue} onClick={() => setStatusFilter('all')}    />
            <FilterBtn label="Active" count={stats.active} active={statusFilter === 'active'} color={C.teal} onClick={() => setStatusFilter('active')} />
            <FilterBtn label="Closed" count={stats.closed} active={statusFilter === 'closed'} color={C.textMuted} onClick={() => setStatusFilter('closed')} />
          </div>
        </div>
      </Card>

      {!loading && filtered.length > 0 && (
        <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, marginBottom: 10, padding: '0 2px', position: 'relative', zIndex: 2, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          <strong style={{ color: C.text }}>{filtered.length}</strong> posting{filtered.length !== 1 ? 's' : ''}
          {search && ` · "${search}"`}
        </div>
      )}

      {/* List */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        {error ? (
          <Card style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.danger, fontSize: 13.5, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              <AlertCircle size={15} /> {error}
            </div>
          </Card>
        ) : loading ? (
          <Card style={{ padding: '60px 0', textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', margin: '0 auto 12px', border: `2.5px solid ${C.blueDim}`, borderTop: `2.5px solid ${C.blue}`, animation: 'jpSpin 1s linear infinite' }} />
            <p style={{ fontSize: 13, color: C.textMuted, margin: 0, fontFamily: "'DM Sans', system-ui, sans-serif" }}>Loading…</p>
          </Card>
        ) : filtered.length === 0 ? (
          <Card style={{ padding: '64px 32px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px', background: C.amberDim, border: `1px solid ${C.amberBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={26} style={{ color: C.amber }} />
            </div>
            <p style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 8px', fontFamily: "'Fraunces', Georgia, serif" }}>No postings yet</p>
            <p style={{ fontSize: 13, color: C.textMuted, margin: '0 0 20px', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              Post your first opening to start receiving applications.
            </p>
            <button onClick={modal.openCreate}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 20px', borderRadius: 9, background: C.gradBlue, border: 'none', color: C.white, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", boxShadow: C.shadowBlue }}>
              <Plus size={13} /> Post a job
            </button>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((job, i) => (
              <JobCard
                key={job.id} job={job} index={i}
                role="recruiter"
                onEdit={modal.openEdit}
                onDelete={deleteJob}
                onToggle={toggleJob}
                onView={j => navigate(`/jobs/${j.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <JobFormModal
        isOpen={modal.mode !== null}
        mode={modal.mode ?? 'create'}
        job={modal.job}
        saving={modal.saving}
        onClose={modal.close}
        onSubmit={handleSave}
      />
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   ROOT PAGE
═══════════════════════════════════════════════════════════════ */
const JobPostingsPage: React.FC = () => {
  const { user } = useSelector((s: RootState) => s.auth);

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: C.bg, padding: 'clamp(12px,3vw,24px)', position: 'relative', overflow: 'hidden', minHeight: '100%' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,600&display=swap');

        @keyframes jpFadeUp   { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes jpSpin     { to{transform:rotate(360deg)} }
        @keyframes jpOrbFloat1{ 0%,100%{transform:translate(0,0)} 50%{transform:translate(-40px,30px)} }
        @keyframes jpOrbFloat2{ 0%,100%{transform:translate(0,0)} 50%{transform:translate(50px,-35px)} }
        @keyframes jpOrbFloat3{ 0%,100%{transform:translate(0,0)} 50%{transform:translate(-25px,20px)} }

        * { box-sizing:border-box; }
        ::selection { background:rgba(79,125,255,0.18); color:#0d1b3e; }
        input::placeholder,textarea::placeholder { color:#8fa3c8; font-weight:400; }
        input:focus,textarea:focus { outline:none; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(79,125,255,0.18); border-radius:99px; }
        textarea { color:#0d1b3e !important; }

        /* ── Layout classes ── */
        .jp-page-header { margin-bottom:22px; position:relative; z-index:2; }
        .jp-header-inner { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }

        .jp-stat-grid {
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:10px;
        }

        .jp-filter-bar {
          display:flex;
          gap:10px;
          align-items:center;
          flex-wrap:wrap;
        }

        .jp-filter-pills {
          display:flex;
          gap:5px;
          flex-wrap:wrap;
          align-items:center;
        }

        .jp-job-grid {
          display:grid;
          grid-template-columns:repeat(auto-fill,minmax(300px,1fr));
          gap:14px;
        }

        /* show/hide helpers */
        .jp-hide-xs { display:inline; }
        .jp-show-xs { display:none; }

        /* ── Tablet (≤768px) ── */
        @media(max-width:768px) {
          .jp-header-inner { gap:10px; }
          .jp-stat-grid { grid-template-columns:repeat(3,1fr); gap:8px; }
          .jp-filter-bar { flex-direction:column; align-items:stretch; }
          .jp-filter-pills { justify-content:flex-start; }
          .jp-job-grid { grid-template-columns:1fr; }
        }

        /* ── Mobile (≤520px) ── */
        @media(max-width:520px) {
          .jp-stat-grid { grid-template-columns:repeat(3,1fr); gap:6px; }
          .jp-hide-xs { display:none; }
          .jp-show-xs { display:inline; }
        }

        /* ── Very small (≤380px) ── */
        @media(max-width:380px) {
          .jp-stat-grid { grid-template-columns:1fr 1fr; }
        }
      `}</style>

      <BgPattern />

      <div style={{ position: 'relative', zIndex: 2 }}>
        {user?.role === 'recruiter' ? <RecruiterView /> : <CandidateView />}
      </div>
    </div>
  );
};

export default JobPostingsPage;