// pages/MyApplicationsPage.tsx — CANDIDATE ONLY
// Theme: Light blue professional — matches ApplicationsPage (DM Sans + Fraunces · frosted glass · orbs · dot-grid)

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, MapPin, Clock, CheckCircle, XCircle,
  AlertCircle, RefreshCw, ArrowRight, Eye,
  Star, UserCheck, Search, X, TrendingUp,
  Circle, Users,
} from 'lucide-react';

import { formatDate } from '../utils/helpers';
import type { Application, AppStatus } from '../features/application/types/application.types';
import {
  useCandidateApplications,
  useCandidateFilter,
} from '../features/application/hooks/useCandidateApplications';

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

/* ═══════════════════════════════════════════════════════════════
   STATUS META
   ═══════════════════════════════════════════════════════════════ */
interface StatusMeta {
  label: string; color: string; bg: string; border: string;
  icon: React.ReactNode; step: number; description: string;
}

const STATUS: Record<AppStatus, StatusMeta> = {
  applied:         { label: 'Applied',       color: C.textMuted, bg: C.surfaceDeep, border: C.border,               icon: <Circle size={10}/>,     step: 0,  description: 'Your application was received and is under review.'                    },
  sourced_invited: { label: 'Invited',        color: C.amber,     bg: C.amberDim,   border: C.amberBorder,           icon: <Star size={10}/>,       step: 1,  description: 'You were sourced and invited to this opportunity.'                     },
  scored:          { label: 'Being reviewed', color: C.blue,      bg: C.blueDim,    border: `${C.blue}35`,           icon: <TrendingUp size={10}/>,  step: 1,  description: 'Your application is being evaluated by the recruiter.'                 },
  shortlisted:     { label: 'Shortlisted',    color: C.teal,      bg: C.tealDim,    border: C.tealBorder,            icon: <CheckCircle size={10}/>, step: 2,  description: "Great news! You've been shortlisted for this role."                    },
  rejected:        { label: 'Not selected',   color: C.danger,    bg: C.dangerDim,  border: C.dangerBorder,          icon: <XCircle size={10}/>,    step: -1, description: 'The recruiter has decided to move forward with other candidates.'       },
  hired:           { label: 'Hired 🎉',        color: C.indigo,    bg: C.indigoDim,  border: `${C.indigo}35`,         icon: <UserCheck size={10}/>,  step: 3,  description: "Congratulations! You've been selected for this position."              },
};

const PIPELINE_STEPS = ['Applied', 'In Review', 'Shortlisted', 'Hired'];

/* ═══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

/* ── Animated background ─────────────────────────────────────── */
const BgPattern: React.FC = () => (
  <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
    <div style={{ position:'absolute', top:'-10%', right:'-5%', width:680, height:560, borderRadius:'50%', background:'radial-gradient(ellipse,rgba(79,125,255,0.13) 0%,rgba(79,125,255,0.04) 50%,transparent 75%)', filter:'blur(64px)', animation:'orbFloat1 18s ease-in-out infinite' }} />
    <div style={{ position:'absolute', bottom:'-8%', left:'-4%', width:560, height:480, borderRadius:'50%', background:'radial-gradient(ellipse,rgba(6,214,176,0.10) 0%,rgba(6,214,176,0.03) 50%,transparent 75%)', filter:'blur(72px)', animation:'orbFloat2 22s ease-in-out infinite' }} />
    <div style={{ position:'absolute', top:'40%', left:'30%', width:440, height:360, borderRadius:'50%', background:'radial-gradient(ellipse,rgba(155,109,255,0.07) 0%,transparent 70%)', filter:'blur(60px)', animation:'orbFloat3 26s ease-in-out infinite' }} />
    <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.38 }}>
      <defs>
        <pattern id="myapp-dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.85" fill="rgba(79,125,255,0.20)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#myapp-dots)" />
    </svg>
    <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,transparent 0%,#4f7dff 30%,#06d6b0 60%,transparent 100%)', opacity:0.6 }} />
  </div>
);

/* ── Frosted card ────────────────────────────────────────────── */
const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background:'rgba(255,255,255,0.82)', backdropFilter:'blur(20px) saturate(1.5)', border:`1px solid ${C.border}`, borderRadius:18, boxShadow:C.shadow, ...style }}>
    {children}
  </div>
);

/* ── Stat card ───────────────────────────────────────────────── */
const StatCard: React.FC<{ label: string; value: number | string; icon: React.ReactNode; color: string; delay?: number }> = ({ label, value, icon, color, delay = 0 }) => {
  const [hov, setHov] = useState(false);
  return (
    <motion.div
      initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
      transition={{ delay, duration:0.4, ease:[0.22,1,0.36,1] }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov ? C.white : 'rgba(255,255,255,0.80)', backdropFilter:'blur(16px)', border:`1px solid ${hov ? `${color}35` : C.border}`, borderRadius:16, padding:'16px 18px', boxShadow: hov ? `0 8px 32px ${color}18` : C.shadow, transition:'all 0.25s cubic-bezier(0.22,1,0.36,1)', transform: hov ? 'translateY(-3px)' : 'none', cursor:'default' }}
    >
      <div style={{ width:36, height:36, borderRadius:10, marginBottom:12, background:`${color}12`, border:`1px solid ${color}22`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow: hov ? `0 0 16px ${color}30` : 'none', transition:'box-shadow 0.25s' }}>
        <span style={{ color, display:'flex' }}>{icon}</span>
      </div>
      <div style={{ fontSize:26, fontWeight:800, color:C.text, letterSpacing:'-1px', lineHeight:1, fontFamily:"'Fraunces', Georgia, serif" }}>{value}</div>
      <div style={{ fontSize:11, color:C.textMuted, marginTop:4, fontWeight:500 }}>{label}</div>
    </motion.div>
  );
};

/* ── Status badge ────────────────────────────────────────────── */
const StatusBadge: React.FC<{ status: AppStatus }> = ({ status }) => {
  const m = STATUS[status] ?? STATUS.applied;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:99, background:m.bg, color:m.color, border:`1px solid ${m.border}`, fontSize:10.5, fontWeight:700, letterSpacing:0.2 }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:m.color, flexShrink:0 }} />
      {m.label}
    </span>
  );
};

/* ── Skill pill ──────────────────────────────────────────────── */
const Pill: React.FC<{ children: string }> = ({ children }) => (
  <span style={{ padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:600, background:C.blueDim, color:C.blue, border:`1px solid ${C.blue}20` }}>
    {children}
  </span>
);

/* ── Pipeline progress bar ───────────────────────────────────── */
const PipelineBar: React.FC<{ status: AppStatus }> = ({ status }) => {
  const step = status === 'rejected' ? -1 : STATUS[status].step;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:0, marginTop:14 }}>
      {PIPELINE_STEPS.map((label, i) => {
        const isActive  = step >= i;
        const isCurrent = step === i;
        const isLast    = i === PIPELINE_STEPS.length - 1;
        const isRejected = status === 'rejected';
        const dotColor = isRejected
          ? (i === 0 ? C.danger : C.border)
          : isActive ? C.blue : C.border;
        return (
          <React.Fragment key={label}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
              <motion.div
                initial={{ scale:0.6, opacity:0 }} animate={{ scale:1, opacity:1 }}
                transition={{ delay: i * 0.07, duration:0.3 }}
                style={{ width:20, height:20, borderRadius:'50%', background: isRejected ? (i===0 ? C.dangerDim : C.surfaceDeep) : isActive ? C.blueDim : C.surfaceDeep, border:`2px solid ${dotColor}`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow: isCurrent && !isRejected ? `0 0 0 3px ${C.blue}20` : 'none' }}
              >
                {isRejected && i===0
                  ? <XCircle size={9} color={C.danger}/>
                  : isActive
                    ? <CheckCircle size={9} color={C.blue}/>
                    : <span style={{ width:4, height:4, borderRadius:'50%', background:C.textFaint, display:'block' }} />
                }
              </motion.div>
              <span style={{ fontSize:9, fontWeight: isCurrent ? 700 : 500, color: isRejected ? (i===0 ? C.danger : C.textFaint) : isActive ? C.blue : C.textFaint, whiteSpace:'nowrap' }}>
                {isRejected && i===0 ? 'Rejected' : label}
              </span>
            </div>
            {!isLast && (
              <motion.div
                initial={{ scaleX:0 }} animate={{ scaleX:1 }}
                transition={{ delay: i*0.1 + 0.15, duration:0.35 }}
                style={{ height:2, flex:1, marginBottom:14, background: isRejected ? C.surfaceDeep : step > i ? C.blue : C.surfaceDeep, minWidth:16, transformOrigin:'left', borderRadius:99 }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* ── Application card ────────────────────────────────────────── */
const ApplicationCard: React.FC<{ app: Application; index: number; onView: (id: number) => void }> = ({ app, index, onView }) => {
  const status      = (app.status ?? 'applied') as AppStatus;
  const meta        = STATUS[status];
  const isHired     = status === 'hired';
  const isShortlist = status === 'shortlisted';

  const skills: string[] = (() => {
    const raw = app.job?.skills_required;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as string[];
    return String(raw).split(',').map(s => s.trim()).filter(Boolean);
  })();

  const jobTitle    = app.job?.title ?? `Job #${app.job_id}`;
  const jobLocation = app.job?.location;

  return (
    <motion.div
      initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
      transition={{ delay: index * 0.06, duration:0.45, ease:[0.22,1,0.36,1] }}
      whileHover={{ y:-3, boxShadow: isHired ? `0 8px 36px ${C.indigo}22` : isShortlist ? `0 8px 32px ${C.teal}18` : C.shadowHov }}
      style={{ background:'rgba(255,255,255,0.84)', backdropFilter:'blur(18px)', border:`1.5px solid ${isHired ? `${C.indigo}35` : isShortlist ? C.tealBorder : C.border}`, borderRadius:18, overflow:'hidden', boxShadow:C.shadow, transition:'border-color 0.2s', position:'relative' }}
    >
      {/* Top accent stripe */}
      {(isHired || isShortlist) && (
        <div style={{ height:3, background: isHired ? `linear-gradient(90deg,${C.indigo},${C.blueLight})` : `linear-gradient(90deg,${C.blue},${C.teal})` }} />
      )}

      <div style={{ padding:'20px 22px' }}>
        <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>

          {/* Icon */}
          <div style={{ width:44, height:44, borderRadius:12, flexShrink:0, background: isHired ? C.indigoDim : isShortlist ? C.tealDim : C.blueDim, border:`1px solid ${isHired ? `${C.indigo}28` : isShortlist ? C.tealBorder : C.border}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Briefcase size={17} style={{ color: isHired ? C.indigo : isShortlist ? C.teal : C.blue }} />
          </div>

          {/* Info */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom:6, flexWrap:'wrap' }}>
              <div>
                <h3 style={{ fontSize:15, fontWeight:700, color:C.text, margin:0, letterSpacing:'-0.2px', fontFamily:"'Fraunces', Georgia, serif" }}>{jobTitle}</h3>
                <div style={{ display:'flex', gap:12, marginTop:4, flexWrap:'wrap' }}>
                  {jobLocation && (
                    <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11.5, color:C.textMuted, fontWeight:500 }}>
                      <MapPin size={10} style={{ color:C.textFaint }}/> {jobLocation}
                    </span>
                  )}
                  <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11.5, color:C.textMuted, fontWeight:500 }}>
                    <Clock size={10} style={{ color:C.textFaint }}/> Applied {formatDate(app.created_at)}
                  </span>
                  <span style={{ fontSize:11.5, color:C.textFaint, fontWeight:500 }}>Job #{app.job_id}</span>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                <StatusBadge status={status} />
              </div>
            </div>

            {/* Description */}
            <p style={{ fontSize:12.5, color:C.textMuted, margin:'0 0 10px', lineHeight:1.6, fontStyle:'italic' }}>{meta.description}</p>

            {/* Skills */}
            {skills.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:10 }}>
                {skills.slice(0, 5).map(s => <Pill key={s}>{s}</Pill>)}
                {skills.length > 5 && <span style={{ fontSize:10, fontWeight:600, color:C.textFaint, padding:'2px 6px' }}>+{skills.length - 5} more</span>}
              </div>
            )}

            {/* Fit summary — safe for candidate */}
            {app.fit_summary && (
              <div style={{ padding:'8px 12px', borderRadius:9, background:C.surfaceDeep, border:`1px solid ${C.border}`, fontSize:12, color:C.textMuted, lineHeight:1.6, marginBottom:10 }}>
                <span style={{ fontWeight:700, color:C.blue, marginRight:5 }}>Match insight:</span>
                {app.fit_summary}
              </div>
            )}

            {/* Pipeline bar */}
            <PipelineBar status={status} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:14, paddingTop:12, borderTop:`1px solid ${C.border}` }}>
          <motion.button
            onClick={() => onView(app.job_id)}
            whileHover={{ borderColor:C.borderFocus, color:C.blue, background:C.blueDim }}
            whileTap={{ scale:0.97 }}
            style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, border:`1px solid ${C.border}`, background:C.white, fontSize:12, fontWeight:600, color:C.textMuted, cursor:'pointer', fontFamily:'inherit', boxShadow:C.shadow, transition:'all 0.15s' }}
          >
            <Eye size={12}/> View job
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */
const MyApplicationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchFocused, setSearchFocused] = useState(false);

  const { apps, loading, refreshing, error, refresh } = useCandidateApplications();
  const filter = useCandidateFilter(apps);

  const filterOptions = [
    { key: 'all'         as const, label: 'All',          count: filter.stats.total,       color: C.blue   },
    { key: 'applied'     as const, label: 'Applied',      count: filter.stats.applied,     color: C.textMuted },
    { key: 'shortlisted' as const, label: 'Shortlisted',  count: filter.stats.shortlisted, color: C.teal   },
    { key: 'hired'       as const, label: 'Hired',        count: filter.stats.hired,       color: C.indigo },
    { key: 'rejected'    as const, label: 'Not selected', count: filter.stats.rejected,    color: C.danger },
  ];

  return (
    <div style={{ fontFamily:"'DM Sans', system-ui, sans-serif", minHeight:'100vh', background:C.bg, padding:24, position:'relative', overflow:'hidden' }}>
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
        input::placeholder { color:#8fa3c8; font-weight:400; }
        input:focus { outline:none; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:rgba(79,125,255,0.18); border-radius:99px; }
        .myapp-stat-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; }
        @media(max-width:900px)  { .myapp-stat-grid { grid-template-columns:repeat(3,1fr); } }
        @media(max-width:560px)  { .myapp-stat-grid { grid-template-columns:repeat(2,1fr); } }
      `}</style>

      <BgPattern />

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }}
        transition={{ duration:0.5, ease:[0.22,1,0.36,1] }}
        style={{ marginBottom:26, position:'relative', zIndex:2, display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}
      >
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:50, height:50, borderRadius:15, background:C.gradBlue, boxShadow:C.shadowBlue, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Briefcase size={22} color={C.white} />
          </div>
          <div>
            <h1 style={{ fontSize:24, fontWeight:800, color:C.text, letterSpacing:'-0.6px', margin:0, lineHeight:1.1, fontFamily:"'Fraunces', Georgia, serif" }}>My Applications</h1>
            <p style={{ fontSize:13, color:C.textMuted, fontWeight:500, margin:'3px 0 0' }}>
              {filter.stats.total} application{filter.stats.total !== 1 ? 's' : ''} · {filter.stats.active} in progress
            </p>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:99, background:C.tealDim, border:`1px solid ${C.tealBorder}`, fontSize:12, fontWeight:700, color:C.teal }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:C.teal, animation:'pulseGlow 2s ease infinite', display:'inline-block' }} />
            Tracking Active
          </span>
          <motion.button
            onClick={refresh} disabled={refreshing}
            whileHover={{ borderColor:C.borderFocus, color:C.blue }}
            whileTap={{ scale:0.97 }}
            style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10, border:`1px solid ${C.border}`, background:C.white, fontSize:12.5, fontWeight:600, color:C.textMuted, cursor: refreshing ? 'not-allowed' : 'pointer', fontFamily:'inherit', boxShadow:C.shadow, transition:'all 0.2s' }}
          >
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </motion.button>
        </div>
      </motion.div>

      {/* ── Stats strip ── */}
      <AnimatePresence>
        {!loading && apps.length > 0 && (
          <div className="myapp-stat-grid" style={{ marginBottom:20, position:'relative', zIndex:2 }}>
            <StatCard label="Total applied"  value={filter.stats.total}       color={C.blue}   icon={<Briefcase size={14}/>}  delay={0}    />
            <StatCard label="In progress"    value={filter.stats.active}      color={C.blue}   icon={<TrendingUp size={14}/>} delay={0.05} />
            <StatCard label="Shortlisted"    value={filter.stats.shortlisted} color={C.teal}   icon={<Star size={14}/>}       delay={0.10} />
            <StatCard label="Hired"          value={filter.stats.hired}       color={C.indigo} icon={<UserCheck size={14}/>}  delay={0.15} />
            <StatCard label="Not selected"   value={filter.stats.rejected}    color={C.danger} icon={<XCircle size={14}/>}    delay={0.20} />
          </div>
        )}
      </AnimatePresence>

      {/* ── Filter + Search bar ── */}
      <Card style={{ padding:'12px 14px', marginBottom:14, position:'relative', zIndex:2 }}>
        <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>

          {/* Search */}
          <div style={{ flex:1, minWidth:200, position:'relative' }}>
            <Search size={13} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color: searchFocused ? C.blue : C.textFaint, transition:'color 0.2s', pointerEvents:'none' }} />
            <input
              value={filter.search}
              onChange={e => filter.setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search by job title…"
              style={{ width:'100%', padding:'8px 32px 8px 33px', border:`1.5px solid ${searchFocused ? C.borderFocus : C.border}`, borderRadius:9, fontSize:13, color:C.text, background:C.surface, fontFamily:'inherit', fontWeight:500, transition:'border-color 0.15s', boxShadow: searchFocused ? `0 0 0 3px ${C.blue}14` : 'none' }}
            />
            <AnimatePresence>
              {filter.search && (
                <motion.button
                  initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.8 }}
                  onClick={() => filter.setSearch('')}
                  style={{ position:'absolute', right:9, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:C.textFaint, display:'flex', padding:0 }}
                >
                  <X size={13}/>
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Status filter pills */}
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', alignItems:'center' }}>
            {filterOptions.map(f => {
              const active = filter.statusFilter === f.key;
              return (
                <motion.button
                  key={f.key}
                  onClick={() => filter.setStatusFilter(f.key)}
                  whileTap={{ scale:0.96 }}
                  style={{ padding:'5px 12px', borderRadius:8, border:`1px solid ${active ? `${f.color}50` : C.border}`, background: active ? `${f.color}12` : C.white, color: active ? f.color : C.textMuted, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all .15s', boxShadow: active ? `0 0 10px ${f.color}18` : 'none' }}
                  onMouseEnter={e => { if (!active) { const b = e.currentTarget as HTMLButtonElement; b.style.background = C.blueDim; b.style.borderColor = `${C.blue}35`; } }}
                  onMouseLeave={e => { if (!active) { const b = e.currentTarget as HTMLButtonElement; b.style.background = C.white; b.style.borderColor = C.border; } }}
                >
                  {f.label}
                  <span style={{ marginLeft:5, fontSize:10, opacity:0.65 }}>{f.count}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Result count */}
      {!loading && filter.filtered.length > 0 && (
        <div style={{ fontSize:12, color:C.textMuted, fontWeight:600, marginBottom:10, padding:'0 2px', position:'relative', zIndex:2 }}>
          Showing <strong style={{ color:C.text }}>{filter.filtered.length}</strong> application{filter.filtered.length !== 1 ? 's' : ''}
          {filter.statusFilter !== 'all' && ` · ${STATUS[filter.statusFilter as AppStatus]?.label}`}
          {filter.search && ` · "${filter.search}"`}
        </div>
      )}

      {/* ── Content ── */}
      <div style={{ position:'relative', zIndex:2 }}>
        <AnimatePresence mode="wait">

          {/* Error */}
          {error && (
            <motion.div key="err" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
              style={{ padding:'14px 16px', background:C.dangerDim, border:`1px solid ${C.dangerBorder}`, borderRadius:12, color:C.danger, fontSize:13.5, display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <AlertCircle size={15}/> {error}
              <button onClick={refresh} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:C.danger, fontWeight:700, fontSize:12, fontFamily:'inherit' }}>
                Try again
              </button>
            </motion.div>
          )}

          {/* Loading */}
          {loading && (
            <motion.div key="loading" initial={{ opacity:0 }} animate={{ opacity:1 }}>
              <Card style={{ padding:'60px 0', textAlign:'center' }}>
                <div style={{ width:44, height:44, borderRadius:'50%', margin:'0 auto 14px', border:`2.5px solid ${C.blueDim}`, borderTop:`2.5px solid ${C.blue}`, animation:'spin 1s linear infinite' }} />
                <p style={{ fontSize:13, color:C.textMuted, fontWeight:500, margin:0 }}>Loading your applications…</p>
              </Card>
            </motion.div>
          )}

          {/* Empty state */}
          {!loading && apps.length === 0 && (
            <motion.div key="empty" initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }}>
              <Card style={{ padding:'80px 32px', textAlign:'center' }}>
                <div style={{ width:68, height:68, borderRadius:'50%', margin:'0 auto 16px', background:C.surfaceDeep, border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Briefcase size={28} style={{ color:C.textFaint }}/>
                </div>
                <p style={{ fontSize:18, fontWeight:700, color:C.text, margin:'0 0 6px', fontFamily:"'Fraunces', Georgia, serif" }}>No applications yet</p>
                <p style={{ fontSize:13, color:C.textMuted, margin:'0 auto 24px', maxWidth:320 }}>Browse open positions and apply to start tracking your journey.</p>
                <motion.button
                  onClick={() => navigate('/jobs')}
                  whileHover={{ boxShadow:C.shadowBlue, opacity:0.92 }}
                  whileTap={{ scale:0.97 }}
                  style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'10px 22px', borderRadius:10, background:C.gradBlue, border:'none', color:C.white, fontSize:13.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:C.shadowBlue }}
                >
                  <ArrowRight size={14}/> Explore jobs
                </motion.button>
              </Card>
            </motion.div>
          )}

          {/* No filter results */}
          {!loading && apps.length > 0 && filter.filtered.length === 0 && (
            <motion.div key="no-results" initial={{ opacity:0 }} animate={{ opacity:1 }}>
              <Card style={{ padding:'60px 32px', textAlign:'center' }}>
                <div style={{ width:60, height:60, borderRadius:'50%', margin:'0 auto 14px', background:C.surfaceDeep, border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Search size={24} style={{ color:C.textFaint }}/>
                </div>
                <p style={{ fontSize:18, fontWeight:700, color:C.text, margin:'0 0 6px', fontFamily:"'Fraunces', Georgia, serif" }}>No matches found</p>
                <p style={{ fontSize:13, color:C.textMuted, margin:0 }}>
                  {filter.search ? `No applications match "${filter.search}"` : 'No applications with this status.'}
                </p>
              </Card>
            </motion.div>
          )}

          {/* Application list */}
          {!loading && filter.filtered.length > 0 && (
            <motion.div key="list" style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {filter.filtered.map((app, i) => (
                <ApplicationCard
                  key={app.id}
                  app={app}
                  index={i}
                  onView={id => navigate(`/jobs/${id}`)}
                />
              ))}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};

export default MyApplicationsPage;