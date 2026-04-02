// pages/JobDetailsPage.tsx
// Theme: Light blue professional — matches ApplicationsPage & MyApplicationsPage
// (DM Sans + Fraunces · frosted glass cards · animated orb background · dot-grid)

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  MapPin, Briefcase, Calendar, Users, Star,
  ArrowLeft, Zap, Edit2, AlertCircle, TrendingUp,
  Loader2, Sparkles, UserCheck, CheckCircle, XCircle,
  RefreshCw, Download, ExternalLink,
} from 'lucide-react';

import { formatDate } from '../utils/helpers';
import type { RootState } from '../app/store';
import type { Application, AppStatus } from '../features/application/types/application.types';
import {
  useJobDetails,
  useJobApplications,
  useApplyForJob,
  useShortlistJob,
  useUpdateApplicationStatus,
} from '../features/jobs/hooks/useJobDetails';

/* ═══════════════════════════════════════════════════════════════
   DESIGN TOKENS — identical to ApplicationsPage
   ═══════════════════════════════════════════════════════════════ */
const C = {
  bg:           '#f0f5ff',
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
  gradBlue:     'linear-gradient(135deg, #2a4fff 0%, #4f7dff 50%, #6b93ff 100%)',
  teal:         '#06d6b0',
  tealLight:    '#09ebb8',
  tealDim:      'rgba(6,214,176,0.10)',
  tealBorder:   'rgba(6,214,176,0.30)',
  indigo:       '#9b6dff',
  indigoDim:    'rgba(155,109,255,0.09)',
  indigoBorder: 'rgba(155,109,255,0.30)',
  amber:        '#f59e0b',
  amberDim:     'rgba(245,158,11,0.09)',
  amberBorder:  'rgba(245,158,11,0.30)',
  danger:       '#ef4444',
  dangerDim:    'rgba(239,68,68,0.08)',
  dangerBorder: 'rgba(239,68,68,0.28)',
  text:         '#0d1b3e',
  textMuted:    '#4f6a9a',
  textFaint:    '#8fa3c8',
  white:        '#ffffff',
  shadow:       '0 1px 3px rgba(15,30,80,0.06), 0 6px 20px rgba(15,30,80,0.07)',
  shadowHov:    '0 4px 8px rgba(15,30,80,0.05), 0 18px 44px rgba(15,30,80,0.12)',
  shadowBlue:   '0 4px 22px rgba(79,125,255,0.28)',
  shadowTeal:   '0 4px 16px rgba(6,214,176,0.25)',
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  applied:     { label: 'Applied',     color: C.textMuted, bg: C.surfaceDeep, border: C.border        },
  scored:      { label: 'Scored',      color: C.blue,      bg: C.blueDim,    border: `${C.blue}35`   },
  shortlisted: { label: 'Shortlisted', color: C.teal,      bg: C.tealDim,    border: C.tealBorder    },
  hired:       { label: 'Hired',       color: C.indigo,    bg: C.indigoDim,  border: C.indigoBorder  },
  rejected:    { label: 'Rejected',    color: C.danger,    bg: C.dangerDim,  border: C.dangerBorder  },
};

const parseSkills = (s: string | string[] | null | undefined): string[] => {
  if (!s) return [];
  if (Array.isArray(s)) return s;
  return s.split(',').map(x => x.trim()).filter(Boolean);
};

const scoreColor = (n: number) => n >= 80 ? C.teal : n >= 65 ? C.amber : C.danger;

/* ═══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

/* ── Animated orb + dot-grid background ─────────────────────── */
const BgPattern: React.FC = () => (
  <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
    <div style={{ position:'absolute', top:'-10%', right:'-5%', width:680, height:560, borderRadius:'50%', background:'radial-gradient(ellipse,rgba(79,125,255,0.13) 0%,rgba(79,125,255,0.04) 50%,transparent 75%)', filter:'blur(64px)', animation:'orbFloat1 18s ease-in-out infinite' }} />
    <div style={{ position:'absolute', bottom:'-8%', left:'-4%', width:560, height:480, borderRadius:'50%', background:'radial-gradient(ellipse,rgba(6,214,176,0.10) 0%,rgba(6,214,176,0.03) 50%,transparent 75%)', filter:'blur(72px)', animation:'orbFloat2 22s ease-in-out infinite' }} />
    <div style={{ position:'absolute', top:'40%', left:'30%', width:440, height:360, borderRadius:'50%', background:'radial-gradient(ellipse,rgba(155,109,255,0.07) 0%,transparent 70%)', filter:'blur(60px)', animation:'orbFloat3 26s ease-in-out infinite' }} />
    <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.38 }}>
      <defs>
        <pattern id="jd-dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.85" fill="rgba(79,125,255,0.20)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#jd-dots)" />
    </svg>
    <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,transparent 0%,#4f7dff 30%,#06d6b0 60%,transparent 100%)', opacity:0.6 }} />
  </div>
);

/* ── Frosted glass card ──────────────────────────────────────── */
const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; delay?: number }> = ({ children, style, delay = 0 }) => (
  <div style={{ background:'rgba(255,255,255,0.82)', backdropFilter:'blur(20px) saturate(1.5)', border:`1px solid ${C.border}`, borderRadius:18, boxShadow:C.shadow, animationName:'fadeUp', animationDuration:'0.5s', animationTimingFunction:'cubic-bezier(0.22,1,0.36,1)', animationDelay:`${delay}s`, animationFillMode:'both', ...style }}>
    {children}
  </div>
);

/* ── Skill pill ──────────────────────────────────────────────── */
const SkillPill: React.FC<{ children: string }> = ({ children }) => (
  <span style={{ display:'inline-flex', alignItems:'center', padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:600, background:C.blueDim, color:C.blue, border:`1px solid ${C.blue}20` }}>
    {children}
  </span>
);

/* ── Status badge ────────────────────────────────────────────── */
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const m = STATUS_META[status] ?? STATUS_META.applied;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:99, background:m.bg, color:m.color, border:`1px solid ${m.border}`, fontSize:10.5, fontWeight:700 }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:m.color, flexShrink:0 }} />
      {m.label}
    </span>
  );
};

/* ── Score ring ──────────────────────────────────────────────── */
const ScoreRing: React.FC<{ score: number; size?: number }> = ({ score, size = 52 }) => {
  const v = Math.min(100, Math.max(0, Math.round(score)));
  const color = scoreColor(v);
  const r = size / 2 - 5, circ = 2 * Math.PI * r, dash = (v / 100) * circ;
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', flexShrink:0, background:C.white, border:`1px solid ${C.border}`, boxShadow:C.shadow, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative' }}>
      <svg width={size} height={size} style={{ position:'absolute', inset:0, transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${color}18`} strokeWidth="3" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition:'stroke-dasharray 0.9s cubic-bezier(0.4,0,0.2,1)', filter:`drop-shadow(0 0 3px ${color}70)` }} />
      </svg>
      <span style={{ fontSize:size*0.225, fontWeight:800, color, lineHeight:1, zIndex:1 }}>{v}</span>
      <span style={{ fontSize:size*0.115, color:`${color}90`, fontWeight:700, letterSpacing:0.3, zIndex:1, textTransform:'uppercase' }}>%</span>
    </div>
  );
};

/* ── Info row for sidebar ────────────────────────────────────── */
const InfoItem: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, background:C.surfaceDeep, border:`1px solid ${C.border}` }}>
    <div style={{ width:30, height:30, borderRadius:8, background:C.blueDim, border:`1px solid ${C.blue}22`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <span style={{ color:C.blue, display:'flex' }}>{icon}</span>
    </div>
    <div>
      <div style={{ fontSize:10, color:C.textFaint, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:13, fontWeight:700, color:C.text, fontFamily:"'Fraunces', Georgia, serif" }}>{value}</div>
    </div>
  </div>
);

/* ── Sidebar action button ───────────────────────────────────── */
const SideBtn: React.FC<{
  icon: React.ReactNode; label: string; onClick: () => void;
  loading?: boolean; color?: string; colorDim?: string; colorBorder?: string;
}> = ({ icon, label, onClick, loading, color = C.blue, colorDim = C.blueDim, colorBorder = `${C.blue}35` }) => {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick} disabled={loading}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:`1px solid ${hov ? colorBorder : C.border}`, background: hov ? colorDim : C.white, color: hov ? color : C.textMuted, fontSize:12.5, fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', gap:8, justifyContent:'center', fontFamily:'inherit', transition:'all 0.18s', boxShadow: hov ? `0 0 14px ${color}20` : C.shadow, opacity: loading ? 0.6 : 1 }}
    >
      {loading ? <Loader2 size={13} style={{ animation:'spin 1s linear infinite' }} /> : icon}
      {label}
    </button>
  );
};

/* ── Application row ─────────────────────────────────────────── */
const AppRow: React.FC<{
  app: Application; index: number;
  onStatus: (id: number, status: 'applied' | 'shortlisted' | 'rejected' | 'hired') => void;
  loadingId: number | null;
}> = ({ app, index, onStatus, loadingId }) => {
  const [hov, setHov] = useState(false);
  const sm      = STATUS_META[app.status ?? 'applied'] ?? STATUS_META.applied;
  const name    = app.candidate?.name?.trim() || `Applicant #${app.candidate_id}`;
  const initials = name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
  const palette  = [C.blue, C.indigo, C.teal, C.amber];
  const aColor   = palette[(app.candidate_id ?? 0) % palette.length];
  const isLoading = loadingId === app.id;
  const status   = (app.status ?? 'applied') as AppStatus;

  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ padding:'13px 16px', borderRadius:12, border:`1px solid ${hov ? C.borderHov : C.border}`, background: hov ? C.white : 'rgba(255,255,255,0.60)', transition:'all 0.18s', display:'flex', alignItems:'center', gap:13, flexWrap:'wrap', animationName:'fadeUp', animationDuration:'0.4s', animationTimingFunction:'cubic-bezier(0.22,1,0.36,1)', animationDelay:`${index * 0.05}s`, animationFillMode:'both', boxShadow: hov ? C.shadowHov : 'none' }}
    >
      {/* Avatar */}
      <div style={{ width:38, height:38, borderRadius:10, flexShrink:0, background:`${aColor}12`, border:`1.5px solid ${aColor}28`, color:aColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, fontFamily:"'DM Sans', system-ui, sans-serif" }}>
        {initials}
      </div>

      <div style={{ flex:1, minWidth:140 }}>
        <div style={{ fontSize:13.5, fontWeight:700, color:C.text, fontFamily:"'Fraunces', Georgia, serif" }}>{name}</div>
        <div style={{ fontSize:11.5, color:C.textFaint, marginTop:2 }}>
          Applied {app.created_at ? formatDate(app.created_at) : 'recently'}
        </div>
      </div>

      {app.final_score != null && <ScoreRing score={app.final_score} />}

      <StatusBadge status={app.status ?? 'applied'} />

      <div style={{ display:'flex', gap:5 }}>
        {app.source_url && (
          <a href={app.source_url} target="_blank" rel="noopener noreferrer"
            style={{ padding:'5px 10px', borderRadius:8, border:`1px solid ${C.border}`, background:C.white, fontSize:11.5, fontWeight:600, color:C.textMuted, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:4, transition:'all 0.15s', boxShadow:C.shadow }}
            onMouseEnter={e => { const a = e.currentTarget as HTMLAnchorElement; a.style.borderColor = C.borderFocus; a.style.color = C.blue; }}
            onMouseLeave={e => { const a = e.currentTarget as HTMLAnchorElement; a.style.borderColor = C.border; a.style.color = C.textMuted; }}>
            <ExternalLink size={10}/> Profile
          </a>
        )}
        {(status === 'applied' || status === 'scored') && (
          <>
            <button
              onClick={() => onStatus(app.id, 'shortlisted')} disabled={isLoading}
              style={{ padding:'5px 11px', borderRadius:8, border:'none', background:C.gradBlue, color:C.white, fontSize:11.5, fontWeight:700, cursor: isLoading ? 'not-allowed' : 'pointer', display:'inline-flex', alignItems:'center', gap:4, fontFamily:'inherit', boxShadow:C.shadowBlue, opacity: isLoading ? 0.6 : 1 }}>
              {isLoading ? <Loader2 size={10} style={{ animation:'spin 1s linear infinite' }}/> : <Star size={10} fill="currentColor"/>} Shortlist
            </button>
            <button
              onClick={() => onStatus(app.id, 'rejected')} disabled={isLoading}
              style={{ padding:'5px 11px', borderRadius:8, border:`1px solid ${C.dangerBorder}`, background:C.dangerDim, color:C.danger, fontSize:11.5, fontWeight:700, cursor: isLoading ? 'not-allowed' : 'pointer', display:'inline-flex', alignItems:'center', gap:4, fontFamily:'inherit', opacity: isLoading ? 0.6 : 1 }}>
              <XCircle size={10}/> Reject
            </button>
          </>
        )}
        {status === 'shortlisted' && (
          <button
            onClick={() => onStatus(app.id, 'hired')} disabled={isLoading}
            style={{ padding:'5px 11px', borderRadius:8, border:'none', background:`linear-gradient(135deg,${C.indigo},${C.blueLight})`, color:C.white, fontSize:11.5, fontWeight:700, cursor: isLoading ? 'not-allowed' : 'pointer', display:'inline-flex', alignItems:'center', gap:4, fontFamily:'inherit', boxShadow:`0 4px 14px ${C.indigo}35`, opacity: isLoading ? 0.6 : 1 }}>
            {isLoading ? <Loader2 size={10} style={{ animation:'spin 1s linear infinite' }}/> : <UserCheck size={10}/>} Hire
          </button>
        )}
      </div>
    </div>
  );
};

/* ── Toast notification ──────────────────────────────────────── */
const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => (
  <div style={{ position:'fixed', bottom:24, right:24, zIndex:100, display:'flex', alignItems:'center', gap:10, padding:'12px 18px', borderRadius:12, background: type === 'success' ? C.tealDim : C.dangerDim, border:`1px solid ${type === 'success' ? C.tealBorder : C.dangerBorder}`, boxShadow:C.shadowHov, backdropFilter:'blur(20px)', animationName:'fadeUp', animationDuration:'0.3s', animationFillMode:'both', maxWidth:340 }}>
    {type === 'success' ? <CheckCircle size={15} style={{ color:C.teal, flexShrink:0 }}/> : <AlertCircle size={15} style={{ color:C.danger, flexShrink:0 }}/>}
    <span style={{ fontSize:13, fontWeight:600, color: type === 'success' ? C.teal : C.danger, flex:1 }}>{message}</span>
    <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.textFaint, padding:0, display:'flex' }}>
      <XCircle size={13}/>
    </button>
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */
const JobDetailsPage: React.FC = () => {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  const jobId       = id ? parseInt(id) : null;
  const isRecruiter = user?.role === 'recruiter';
  const isCandidate = user?.role === 'candidate';

  const [activeTab, setActiveTab] = useState<'description' | 'applications'>('description');
  const [toast, setToast]         = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* Hooks */
  const { job, loading, error: jobError } = useJobDetails(jobId);
  const { apps, reload: reloadApps, updateLocalStatus } = useJobApplications(jobId, isRecruiter);
  const { apply, applying, success: applied, error: applyError, reset: resetApply } = useApplyForJob();
  const { shortlist, shortlisting, result: shortlistResult } = useShortlistJob(reloadApps);
  const { update: updateStatus, loadingId } = useUpdateApplicationStatus((appId, status) => {
    updateLocalStatus(appId, status);
  });

  /* Show feedback toasts */
  React.useEffect(() => { if (applied) { showToast('Application submitted successfully!'); resetApply(); } }, [applied]);
  React.useEffect(() => { if (applyError) showToast(applyError, 'error'); }, [applyError]);
  React.useEffect(() => { if (shortlistResult) showToast(shortlistResult, shortlistResult.includes('failed') ? 'error' : 'success'); }, [shortlistResult]);

  const skills = parseSkills(job?.skills_required);

  /* ── Loading ── */
  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh', background:C.bg }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width:44, height:44, borderRadius:'50%', border:`2.5px solid ${C.blueDim}`, borderTop:`2.5px solid ${C.blue}`, animation:'spin 1s linear infinite' }}/>
    </div>
  );

  /* ── Not found ── */
  if (!job) return (
    <div style={{ fontFamily:"'DM Sans', system-ui, sans-serif", background:C.bg, minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <Card style={{ padding:48, maxWidth:400, textAlign:'center' }}>
        <AlertCircle size={36} style={{ color:C.danger, display:'block', margin:'0 auto 14px' }}/>
        <p style={{ fontSize:16, fontWeight:700, color:C.text, margin:'0 0 6px', fontFamily:"'Fraunces', Georgia, serif" }}>Job Not Found</p>
        <p style={{ fontSize:13, color:C.textMuted, margin:'0 0 20px' }}>This posting doesn't exist or was removed.</p>
        <button onClick={() => navigate('/jobs')}
          style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'9px 20px', borderRadius:10, background:C.gradBlue, border:'none', color:C.white, cursor:'pointer', fontWeight:700, fontSize:13.5, fontFamily:'inherit', boxShadow:C.shadowBlue }}>
          Back to Jobs
        </button>
      </Card>
    </div>
  );

  return (
    <div style={{ fontFamily:"'DM Sans', system-ui, sans-serif", background:C.bg, padding:24, position:'relative', overflow:'hidden', minHeight:'100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=Fraunces:opsz,wght@9..144,600;9..144,700;9..144,800&display=swap');
        @keyframes fadeUp    { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin      { to{transform:rotate(360deg)} }
        @keyframes orbFloat1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-40px,30px)} }
        @keyframes orbFloat2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(50px,-35px)} }
        @keyframes orbFloat3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-25px,20px)} }
        @keyframes pulseGlow { 0%,100%{opacity:1} 50%{opacity:0.35} }
        * { box-sizing:border-box; }
        ::selection { background:rgba(79,125,255,0.18); color:#0d1b3e; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:rgba(79,125,255,0.18); border-radius:99px; }
        .jd-grid { display:grid; grid-template-columns:1fr 290px; gap:16px; align-items:start; }
        @media(max-width:900px) { .jd-grid { grid-template-columns:1fr; } }
      `}</style>

      <BgPattern />

      <div style={{ position:'relative', zIndex:2 }}>

        {/* ── Back button ── */}
        <button onClick={() => navigate('/jobs')}
          style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 13px', borderRadius:9, marginBottom:20, border:`1px solid ${C.border}`, background:C.white, fontSize:12.5, fontWeight:600, color:C.textMuted, cursor:'pointer', fontFamily:'inherit', transition:'all 0.16s', animationName:'fadeUp', animationDuration:'0.35s', animationFillMode:'both', boxShadow:C.shadow }}
          onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = C.borderFocus; b.style.color = C.blue; b.style.boxShadow = C.shadowBlue; }}
          onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = C.border; b.style.color = C.textMuted; b.style.boxShadow = C.shadow; }}>
          <ArrowLeft size={13}/> Back to Jobs
        </button>

        {/* ── Hero card ── */}
        <Card style={{ marginBottom:16, overflow:'hidden' }} delay={0.05}>
          {/* Active/closed stripe */}
          <div style={{ height:3, background: job.is_active ? `linear-gradient(90deg,${C.blue},${C.teal})` : `linear-gradient(90deg,${C.textFaint},transparent)` }} />
          <div style={{ padding:'22px 24px' }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:18, flexWrap:'wrap' }}>
              {/* Icon */}
              <div style={{ width:56, height:56, borderRadius:16, flexShrink:0, background:C.blueDim, border:`1.5px solid ${C.blue}28`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:C.shadowBlue }}>
                <Briefcase size={24} style={{ color:C.blue }}/>
              </div>

              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:9 }}>
                  <h1 style={{ fontSize:22, fontWeight:800, color:C.text, margin:0, letterSpacing:'-0.4px', fontFamily:"'Fraunces', Georgia, serif" }}>{job.title}</h1>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700, background: job.is_active ? C.tealDim : C.surfaceDeep, color: job.is_active ? C.teal : C.textFaint, border:`1px solid ${job.is_active ? C.tealBorder : C.border}` }}>
                    <span style={{ width:5, height:5, borderRadius:'50%', background: job.is_active ? C.teal : C.textFaint, animation: job.is_active ? 'pulseGlow 2s ease infinite' : 'none' }}/>
                    {job.is_active ? 'Active' : 'Closed'}
                  </span>
                </div>
                <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                  {[
                    { icon:<TrendingUp size={11}/>, text:`${job.experience_required}+ yrs experience` },
                    ...(job.location ? [{ icon:<MapPin size={11}/>, text:job.location }] : []),
                    { icon:<Calendar size={11}/>, text:`Posted ${job.created_at ? formatDate(job.created_at) : 'recently'}` },
                    { icon:<Users size={11}/>, text:`${apps.length} application${apps.length !== 1 ? 's' : ''}` },
                  ].map((m, i) => (
                    <span key={i} style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12, color:C.textMuted, fontWeight:500 }}>
                      <span style={{ color:C.textFaint }}>{m.icon}</span>{m.text}
                    </span>
                  ))}
                </div>
              </div>

              {/* Apply button — candidate only */}
              {isCandidate && job.is_active && (
                <button onClick={() => apply(jobId!)} disabled={applying}
                  style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'11px 22px', borderRadius:11, background: applying ? C.surfaceDeep : C.gradBlue, color: applying ? C.textMuted : C.white, border:'none', cursor: applying ? 'not-allowed' : 'pointer', fontSize:14, fontWeight:700, boxShadow: applying ? 'none' : C.shadowBlue, fontFamily:'inherit', transition:'opacity 0.18s', flexShrink:0 }}
                  onMouseEnter={e => { if (!applying) (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}>
                  {applying ? <><Loader2 size={14} style={{ animation:'spin 1s linear infinite' }}/> Applying…</> : <><UserCheck size={14}/> Apply Now</>}
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* ── Main grid ── */}
        <div className="jd-grid">

          {/* Left column */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* Tabs — recruiter only */}
            {isRecruiter && (
              <div style={{ display:'flex', gap:6, animationName:'fadeUp', animationDuration:'0.4s', animationDelay:'0.1s', animationFillMode:'both' }}>
                {(['description', 'applications'] as const).map(tab => {
                  const active = activeTab === tab;
                  return (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      style={{ padding:'8px 16px', borderRadius:9, border:`1px solid ${active ? `${C.blue}40` : C.border}`, background: active ? C.blueDim : C.white, color: active ? C.blue : C.textMuted, fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all 0.18s', boxShadow: active ? C.shadowBlue : C.shadow }}>
                      {tab === 'applications' ? `Applications (${apps.length})` : 'Description'}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Description tab */}
            {(activeTab === 'description' || !isRecruiter) && (
              <>
                <Card delay={0.12}>
                  <div style={{ padding:'16px 20px 13px', borderBottom:`1px solid ${C.border}` }}>
                    <span style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:"'Fraunces', Georgia, serif" }}>Job Description</span>
                  </div>
                  <div style={{ padding:'18px 22px' }}>
                    <p style={{ fontSize:13.5, color:C.textMuted, lineHeight:1.85, margin:0, whiteSpace:'pre-wrap', fontFamily:"'DM Sans', system-ui, sans-serif" }}>
                      {job.description || 'No description provided.'}
                    </p>
                  </div>
                </Card>

                <Card delay={0.18}>
                  <div style={{ padding:'16px 20px 13px', borderBottom:`1px solid ${C.border}` }}>
                    <span style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:"'Fraunces', Georgia, serif" }}>Required Skills</span>
                  </div>
                  <div style={{ padding:'16px 20px' }}>
                    {skills.length > 0 ? (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                        {skills.map((s, i) => <SkillPill key={i}>{s}</SkillPill>)}
                      </div>
                    ) : (
                      <p style={{ fontSize:13, color:C.textFaint, margin:0 }}>No specific skills listed.</p>
                    )}
                  </div>
                </Card>
              </>
            )}

            {/* Applications tab — recruiter only */}
            {isRecruiter && activeTab === 'applications' && (
              <Card delay={0.12}>
                <div style={{ padding:'16px 20px 13px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
                  <span style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:"'Fraunces', Georgia, serif" }}>Applications ({apps.length})</span>
                  <div style={{ display:'flex', gap:5, alignItems:'center', flexWrap:'wrap' }}>
                    {(['applied','scored','shortlisted','hired','rejected'] as const).map(s => {
                      const count = apps.filter(a => a.status === s).length;
                      if (!count) return null;
                      const m = STATUS_META[s];
                      return (
                        <span key={s} style={{ padding:'2px 8px', borderRadius:99, fontSize:10.5, fontWeight:700, background:m.bg, color:m.color, border:`1px solid ${m.border}` }}>
                          {count} {m.label}
                        </span>
                      );
                    })}
                    <button onClick={reloadApps}
                      style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:8, border:`1px solid ${C.border}`, background:C.white, fontSize:11.5, fontWeight:600, color:C.textMuted, cursor:'pointer', fontFamily:'inherit', boxShadow:C.shadow, transition:'all 0.15s' }}
                      onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = C.borderFocus; b.style.color = C.blue; }}
                      onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = C.border; b.style.color = C.textMuted; }}>
                      <RefreshCw size={11}/> Refresh
                    </button>
                  </div>
                </div>
                <div style={{ padding:'14px 16px' }}>
                  {apps.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'44px 0' }}>
                      <div style={{ width:52, height:52, borderRadius:'50%', margin:'0 auto 12px', background:C.surfaceDeep, border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Users size={22} style={{ color:C.textFaint }}/>
                      </div>
                      <p style={{ fontSize:14, fontWeight:700, color:C.text, margin:'0 0 5px', fontFamily:"'Fraunces', Georgia, serif" }}>No applications yet</p>
                      <p style={{ fontSize:13, color:C.textMuted, margin:0 }}>Applications will appear here once candidates apply.</p>
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                      {apps.map((app, i) => (
                        <AppRow key={app.id} app={app} index={i} onStatus={updateStatus} loadingId={loadingId} />
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Right sidebar */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* Job details */}
            <Card delay={0.14}>
              <div style={{ padding:'16px 20px 13px', borderBottom:`1px solid ${C.border}` }}>
                <span style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:"'Fraunces', Georgia, serif" }}>Job Details</span>
              </div>
              <div style={{ padding:'13px 14px', display:'flex', flexDirection:'column', gap:7 }}>
                <InfoItem icon={<TrendingUp size={12}/>} label="Experience" value={`${job.experience_required}+ years`} />
                {job.location && <InfoItem icon={<MapPin size={12}/>} label="Location" value={job.location} />}
                <InfoItem icon={<Calendar size={12}/>} label="Posted" value={job.created_at ? formatDate(job.created_at) : 'N/A'} />
                <InfoItem icon={<Users size={12}/>} label="Applications" value={String(apps.length)} />
              </div>
            </Card>

            {/* Recruiter actions */}
            {isRecruiter && (
              <Card delay={0.2}>
                <div style={{ padding:'16px 20px 13px', borderBottom:`1px solid ${C.border}` }}>
                  <span style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:"'Fraunces', Georgia, serif" }}>Actions</span>
                </div>
                <div style={{ padding:'13px 14px', display:'flex', flexDirection:'column', gap:7 }}>
                  <SideBtn icon={<Edit2 size={13}/>} label="Edit Job" onClick={() => navigate(`/jobs/${job.id}/edit`)} />
                  <SideBtn
                    icon={<Star size={13}/>} label="Auto-Shortlist Candidates"
                    onClick={() => shortlist(job.id)}
                    loading={shortlisting}
                    color={C.amber} colorDim={C.amberDim} colorBorder={C.amberBorder}
                  />
                  <SideBtn
                    icon={<Zap size={13}/>} label="Source Candidates"
                    onClick={() => navigate(`/sourcing?job=${job.id}`)}
                    color={C.teal} colorDim={C.tealDim} colorBorder={C.tealBorder}
                  />
                </div>
              </Card>
            )}

            {/* AI badge */}
            <div style={{ borderRadius:16, padding:'16px 18px', animationName:'fadeUp', animationDuration:'0.4s', animationDelay:'0.26s', animationFillMode:'both', background:`linear-gradient(145deg, ${C.blueDim} 0%, ${C.tealDim} 100%)`, border:`1px solid ${C.borderMid}`, backdropFilter:'blur(16px)', boxShadow:C.shadow }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
                <Sparkles size={13} style={{ color:C.blue }}/>
                <span style={{ fontSize:12.5, fontWeight:700, color:C.blue, letterSpacing:0.2 }}>AI-Powered Matching</span>
              </div>
              <p style={{ fontSize:12, color:C.textMuted, margin:0, lineHeight:1.65 }}>
                Use AI sourcing to automatically discover and score candidates matching this role's requirements.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default JobDetailsPage;