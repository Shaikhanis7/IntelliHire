import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  Search, Users, Zap, Globe, Database,
  ChevronDown, ChevronUp, ExternalLink,
  CheckCircle, AlertCircle, Loader2, Play,
  History, Filter, Sparkles, Target,
  Award, Brain, ChevronRight, BarChart3, X,
  MapPin, TrendingUp, Star, Clock, FileDown,
} from 'lucide-react';

import { jobService } from '../features/jobs/services/job.service';
import type { RootState } from '../app/store';
import type { Job } from '../features/jobs/types/job.types';
import { formatDate } from '../utils/helpers';

import {
  useSourcingHistory,
  useSourcingCandidates,
  useSourcingTrigger,
  useShortlist,
  useCandidateFilter,
} from '../features/sourcing/hooks/useSourcing';
import {
  sourcingService,
  type SourcingCandidate,
} from '../features/sourcing/services/sourcing.service';

/* ─── Design tokens — Light Blue Professional (mirrors DashboardLayout) ──────── */
const C = {
  /* Backgrounds */
  bg:           '#f0f5ff',
  bgAlt:        '#e6eeff',
  bgCard:       '#ffffff',
  surface:      '#f5f8ff',
  surfaceDeep:  '#e8effe',

  /* Borders */
  border:       'rgba(79,125,255,0.13)',
  borderMid:    'rgba(79,125,255,0.22)',
  borderHov:    'rgba(79,125,255,0.45)',
  borderFocus:  '#4f7dff',

  /* Blues — exact match DashboardLayout */
  blue:         '#4f7dff',
  blueLight:    '#6b93ff',
  blueDark:     '#2a4fff',
  blueDim:      'rgba(79,125,255,0.10)',
  blueMid:      'rgba(79,125,255,0.18)',
  gradBlue:     'linear-gradient(135deg, #2a4fff 0%, #4f7dff 50%, #6b93ff 100%)',

  /* Teal */
  teal:         '#06d6b0',
  tealLight:    '#09ebb8',
  tealDim:      'rgba(6,214,176,0.10)',
  tealBorder:   'rgba(6,214,176,0.30)',

  /* Purple */
  indigo:       '#9b6dff',
  indigoDim:    'rgba(155,109,255,0.09)',
  indigoLight:  '#b899ff',

  /* Amber */
  amber:        '#f59e0b',
  amberDim:     'rgba(245,158,11,0.09)',
  amberBorder:  'rgba(245,158,11,0.30)',

  /* Danger */
  danger:       '#ef4444',
  dangerDim:    'rgba(239,68,68,0.08)',
  dangerBorder: 'rgba(239,68,68,0.28)',

  /* Text */
  text:         '#0d1b3e',
  textMid:      '#1e3260',
  textMuted:    '#4f6a9a',
  textFaint:    '#8fa3c8',
  white:        '#ffffff',

  /* Shadows */
  shadow:       '0 1px 3px rgba(15,30,80,0.06), 0 6px 20px rgba(15,30,80,0.07)',
  shadowHov:    '0 4px 8px rgba(15,30,80,0.05), 0 18px 44px rgba(15,30,80,0.12)',
  shadowBlue:   '0 4px 22px rgba(79,125,255,0.28)',
  shadowTeal:   '0 4px 16px rgba(6,214,176,0.25)',
};

/* ─── Tag metadata ──────────────────────────────────────────────────────────── */
const TAG_META: Record<string, {
  label:        string;
  bg:           string;
  text:         string;
  dot:          string;
  actionPolicy: 'none' | 'pipeline' | 'shortlist';
  hasResume:    boolean;
}> = {
  applied_shortlisted:       { label: 'Shortlisted',           bg: C.tealDim,   text: C.teal,    dot: C.teal,    actionPolicy: 'none',      hasResume: true  },
  applied_pending:           { label: 'Applied · Pending',     bg: C.amberDim,  text: C.amber,   dot: C.amber,   actionPolicy: 'pipeline',  hasResume: true  },
  applied_scored:            { label: 'Applied · Scored',      bg: C.blueDim,   text: C.blue,    dot: C.blue,    actionPolicy: 'pipeline',  hasResume: true  },
  applied_closed_shortlisted:{ label: 'Shortlisted (closed)',  bg: C.tealDim,   text: C.teal,    dot: C.teal,    actionPolicy: 'shortlist', hasResume: true  },
  applied_closed_scored:     { label: 'Scored (closed)',       bg: C.blueDim,   text: C.blue,    dot: C.blue,    actionPolicy: 'shortlist', hasResume: true  },
  applied_closed_pending:    { label: 'Pending (closed)',      bg: C.amberDim,  text: C.amber,   dot: C.amber,   actionPolicy: 'shortlist', hasResume: true  },
  applied_closed_rejected:   { label: 'Rejected (closed)',     bg: C.dangerDim, text: C.danger,  dot: C.danger,  actionPolicy: 'shortlist', hasResume: true  },
  db_applied_other:          { label: 'Applied (other job)',   bg: C.indigoDim, text: C.indigo,  dot: C.indigo,  actionPolicy: 'shortlist', hasResume: true  },
  db_match:                  { label: 'DB Match',              bg: C.indigoDim, text: C.indigo,  dot: C.indigo,  actionPolicy: 'shortlist', hasResume: true  },
  prev_sourced:              { label: 'Prev. Sourced',         bg: 'rgba(79,125,255,0.06)', text: C.textMuted, dot: C.textFaint, actionPolicy: 'shortlist', hasResume: false },
  external:                  { label: 'External',              bg: C.dangerDim, text: C.danger,  dot: C.danger,  actionPolicy: 'shortlist', hasResume: false },
};

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
const parseSkills = (s: string | string[] | null | undefined): string[] => {
  if (!s) return [];
  if (Array.isArray(s)) return s;
  return s.split(',').map(x => x.trim()).filter(Boolean);
};

const highlightMatch = (text: string, query: string): React.ReactNode => {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(79,125,255,0.16)', color: C.blue, borderRadius: 3, padding: '0 2px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
};

/* ══════════════════════ BACKGROUND ══════════════════════════════════════════ */
const BgPattern: React.FC = () => (
  <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
    {/* Blurred orbs */}
    <div style={{
      position: 'absolute', top: '-10%', right: '-5%',
      width: 680, height: 560, borderRadius: '50%',
      background: 'radial-gradient(ellipse, rgba(79,125,255,0.13) 0%, rgba(79,125,255,0.04) 50%, transparent 75%)',
      filter: 'blur(64px)', animation: 'orbFloat1 18s ease-in-out infinite',
    }} />
    <div style={{
      position: 'absolute', bottom: '-8%', left: '-4%',
      width: 560, height: 480, borderRadius: '50%',
      background: 'radial-gradient(ellipse, rgba(6,214,176,0.10) 0%, rgba(6,214,176,0.03) 50%, transparent 75%)',
      filter: 'blur(72px)', animation: 'orbFloat2 22s ease-in-out infinite',
    }} />
    <div style={{
      position: 'absolute', top: '40%', left: '30%',
      width: 440, height: 360, borderRadius: '50%',
      background: 'radial-gradient(ellipse, rgba(155,109,255,0.07) 0%, transparent 70%)',
      filter: 'blur(60px)', animation: 'orbFloat3 26s ease-in-out infinite',
    }} />

    {/* Subtle dot grid */}
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.38 }}>
      <defs>
        <pattern id="dotgrid" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.85" fill="rgba(79,125,255,0.20)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dotgrid)" />
    </svg>

    {/* Top edge accent */}
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: 3,
      background: 'linear-gradient(90deg, transparent 0%, #4f7dff 30%, #06d6b0 60%, transparent 100%)',
      opacity: 0.6,
    }} />
  </div>
);

/* ══════════════════════ MICRO-COMPONENTS ════════════════════════════════════ */

const TagBadge: React.FC<{ tag: string }> = ({ tag }) => {
  const m = TAG_META[tag] ?? { label: tag, bg: C.blueDim, text: C.textMuted, dot: C.textFaint };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 99,
      background: m.bg, color: m.text,
      fontSize: 10.5, fontWeight: 700, letterSpacing: 0.2,
      border: `1px solid ${m.text}25`,
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.dot, flexShrink: 0 }} />
      {m.label}
    </span>
  );
};

const ScoreRing: React.FC<{ score: number; size?: number }> = ({ score, size = 62 }) => {
  const pct   = Math.round(score * 100);
  const color = pct >= 80 ? C.teal : pct >= 60 ? C.amber : C.danger;
  const r     = size / 2 - 5;
  const circ  = 2 * Math.PI * r;
  const dash  = (pct / 100) * circ;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: C.white,
      border: `1px solid ${C.border}`,
      boxShadow: C.shadow,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
    }}>
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${color}18`} strokeWidth="3.5" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3.5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 3px ${color}70)` }} />
      </svg>
      <span style={{ fontSize: size * 0.225, fontWeight: 800, color, lineHeight: 1, zIndex: 1, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{pct}</span>
      <span style={{ fontSize: size * 0.115, color: `${color}90`, fontWeight: 700, letterSpacing: 0.3, zIndex: 1, textTransform: 'uppercase', fontFamily: "'DM Sans', system-ui, sans-serif" }}>score</span>
    </div>
  );
};

const ScoreBar: React.FC<{ value: number; color: string; label: string }> = ({ value, color, label }) => (
  <div style={{ flex: 1 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: C.textMuted, marginBottom: 4, fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <span>{label}</span><span style={{ color }}>{Math.round(value * 100)}%</span>
    </div>
    <div style={{ height: 3, background: C.surfaceDeep, borderRadius: 99, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${Math.round(value * 100)}%`,
        background: `linear-gradient(90deg, ${color}88, ${color})`,
        borderRadius: 99, transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
      }} />
    </div>
  </div>
);

const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; delay?: number }> = ({ children, style, delay = 0 }) => (
  <div style={{
    background: 'rgba(255,255,255,0.82)',
    backdropFilter: 'blur(20px) saturate(1.5)',
    WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
    border: `1px solid ${C.border}`,
    borderRadius: 18,
    boxShadow: C.shadow,
    animationDelay: `${delay}s`,
    animationFillMode: 'both',
    animationName: 'fadeUp',
    animationDuration: '0.5s',
    animationTimingFunction: 'cubic-bezier(0.22,1,0.36,1)',
    ...style,
  }}>
    {children}
  </div>
);

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color: string; delay?: number }> = ({ label, value, icon, color, delay = 0 }) => {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? C.white : 'rgba(255,255,255,0.80)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${hov ? color + '35' : C.border}`,
        borderRadius: 16, padding: '16px 18px',
        boxShadow: hov ? `0 8px 32px ${color}18` : C.shadow,
        transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)',
        transform: hov ? 'translateY(-3px)' : 'none',
        cursor: 'default',
        animationDelay: `${delay}s`, animationFillMode: 'both',
        animationName: 'fadeUp', animationDuration: '0.5s',
        animationTimingFunction: 'cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10, marginBottom: 12,
        background: `${color}12`, border: `1px solid ${color}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'box-shadow 0.25s',
        boxShadow: hov ? `0 0 16px ${color}30` : 'none',
      }}>
        <span style={{ color, display: 'flex' }}>{icon}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: '-1px', lineHeight: 1, fontFamily: "'Fraunces', Georgia, serif" }}>{value}</div>
      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4, fontWeight: 500, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{label}</div>
    </div>
  );
};

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; color: string; subtitle?: string }> = ({ icon, title, color, subtitle }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <div style={{
      width: 34, height: 34, borderRadius: 10,
      background: `${color}10`, border: `1px solid ${color}22`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ color, display: 'flex' }}>{icon}</span>
    </div>
    <div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, lineHeight: 1.2, fontFamily: "'Fraunces', Georgia, serif" }}>{title}</div>
      {subtitle && <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 500, marginTop: 2, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{subtitle}</div>}
    </div>
  </div>
);

const Divider: React.FC = () => (
  <div style={{ height: 1, background: C.border, margin: '16px 0' }} />
);

const ModeBtn: React.FC<{ label: string; icon: React.ReactNode; desc: string; active: boolean; onClick: () => void }> = ({ label, icon, desc, active, onClick }) => (
  <button onClick={onClick} style={{
    flex: 1, padding: '10px 8px', borderRadius: 11,
    border: `1.5px solid ${active ? C.blue : C.border}`,
    cursor: 'pointer',
    background: active ? C.blueDim : 'transparent',
    color: active ? C.blue : C.textMuted,
    boxShadow: active ? C.shadowBlue : 'none',
    transition: 'all 0.2s cubic-bezier(0.22,1,0.36,1)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    fontFamily: "'DM Sans', system-ui, sans-serif",
  }}>
    <span style={{ display: 'flex' }}>{icon}</span>
    <span style={{ fontSize: 11, fontWeight: 700 }}>{label}</span>
    <span style={{ fontSize: 10, opacity: 0.65, fontWeight: 500, lineHeight: 1.3 }}>{desc}</span>
  </button>
);

/* ─── Ghost Button ────────────────────────────────────────────────────────── */
const GhostBtn: React.FC<{
  icon: React.ReactNode; label: string;
  onClick?: () => void; href?: string;
  loading?: boolean; disabled?: boolean; title?: string;
}> = ({ icon, label, onClick, href, loading, disabled, title }) => {
  const [hov, setHov] = useState(false);
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '6px 12px', borderRadius: 9,
    border: `1px solid ${hov ? C.borderHov : C.border}`,
    background: hov ? C.blueDim : C.white,
    fontSize: 12, color: disabled ? C.textFaint : hov ? C.blue : C.textMuted,
    fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
    textDecoration: 'none', fontFamily: "'DM Sans', system-ui, sans-serif",
    transition: 'all 0.18s', opacity: loading ? 0.7 : 1,
    pointerEvents: disabled ? 'none' : 'auto',
    boxShadow: hov ? C.shadowBlue + '50' : 'none',
  };
  const props = { style: base, title, onMouseEnter: () => setHov(true), onMouseLeave: () => setHov(false) };
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{icon}{label}</a>;
  return (
    <button onClick={onClick} disabled={disabled} {...props}>
      {loading ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : icon}
      {label}
    </button>
  );
};

/* ─── Job Combobox ────────────────────────────────────────────────────────── */
const JobSearchCombobox: React.FC<{ jobs: Job[]; selected: Job | null; onSelect: (job: Job) => void }> = ({ jobs, selected, onSelect }) => {
  const [query,   setQuery]   = useState('');
  const [open,    setOpen]    = useState(false);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  const norm     = query.replace(/^#/, '').trim().toLowerCase();
  const filtered = norm
    ? jobs.filter(j => String(j.id).startsWith(norm) || j.title.toLowerCase().includes(norm) || parseSkills(j.skills_required).some(s => s.toLowerCase().includes(norm)))
    : jobs;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) { setOpen(false); setQuery(''); }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleSelect = (job: Job) => { onSelect(job); setOpen(false); setQuery(''); };
  const display      = open ? query : selected ? `#${selected.id} · ${selected.title}` : '';

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        border: `1.5px solid ${focused ? C.borderFocus : C.border}`,
        borderRadius: 11, background: C.white, overflow: 'hidden',
        boxShadow: focused ? `0 0 0 3px ${C.blue}14` : 'none',
        transition: 'all 0.18s',
      }}>
        <Search size={14} style={{ color: C.textFaint, flexShrink: 0, marginLeft: 12 }} />
        <input ref={inputRef} value={display}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setFocused(true); setOpen(true); setQuery(''); }}
          onBlur={() => setFocused(false)}
          placeholder="Search by #ID, title, or skill…"
          style={{ flex: 1, padding: '10px 10px', border: 'none', outline: 'none', fontSize: 13, color: C.text, background: 'transparent', fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 500 }}
        />
        {open && query
          ? <button onMouseDown={e => { e.preventDefault(); setQuery(''); }} style={{ padding: '0 10px', background: 'none', border: 'none', cursor: 'pointer', color: C.textFaint, display: 'flex' }}><X size={13} /></button>
          : <ChevronDown size={14} style={{ color: C.textFaint, marginRight: 10, flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />}
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(20px)',
          border: `1px solid ${C.borderMid}`, borderRadius: 14,
          boxShadow: C.shadowHov, zIndex: 100, maxHeight: 340, overflowY: 'auto',
          animation: 'dropIn 0.15s cubic-bezier(0.22,1,0.36,1) both',
        }}>
          {filtered.length === 0
            ? <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: C.textFaint, fontFamily: "'DM Sans', system-ui, sans-serif" }}>No jobs match "{query}"</div>
            : filtered.map(job => {
                const skills = parseSkills(job.skills_required).slice(0, 3);
                const extra  = parseSkills(job.skills_required).length - 3;
                const isSel  = selected?.id === job.id;
                return (
                  <div key={String(job.id)}
                    onMouseDown={e => { e.preventDefault(); handleSelect(job); }}
                    style={{ padding: '11px 14px', cursor: 'pointer', background: isSel ? C.blueDim : 'transparent', borderLeft: `3px solid ${isSel ? C.blue : 'transparent'}`, transition: 'all 0.12s' }}
                    onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLDivElement).style.background = 'rgba(79,125,255,0.05)'; }}
                    onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ padding: '1px 7px', borderRadius: 6, background: isSel ? C.blue : C.surfaceDeep, color: isSel ? C.white : C.textMuted, fontSize: 10, fontWeight: 700, fontFamily: "'DM Sans', system-ui, sans-serif" }}>#{job.id}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: isSel ? C.blue : C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                        {highlightMatch(job.title, norm)}
                      </span>
                      {isSel && <CheckCircle size={13} style={{ color: C.blue, marginLeft: 'auto', flexShrink: 0 }} />}
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: skills.length ? 6 : 0 }}>
                      {job.location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: C.textMuted, fontFamily: "'DM Sans', system-ui, sans-serif" }}><MapPin size={9} />{job.location}</span>}
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: C.textMuted, fontFamily: "'DM Sans', system-ui, sans-serif" }}><TrendingUp size={9} />{job.experience_required}y+ exp</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: job.is_active ? C.teal : C.textFaint, fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: job.is_active ? C.teal : C.textFaint }} />{job.is_active ? 'Active' : 'Closed'}
                      </span>
                    </div>
                    {skills.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {skills.map((s, si) => (
                          <span key={si} style={{ padding: '2px 7px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: C.blueDim, color: C.blue, border: `1px solid ${C.blue}20`, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{s}</span>
                        ))}
                        {extra > 0 && <span style={{ padding: '2px 7px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: C.surfaceDeep, color: C.textMuted, fontFamily: "'DM Sans', system-ui, sans-serif" }}>+{extra}</span>}
                      </div>
                    )}
                  </div>
                );
              })
          }
        </div>
      )}
    </div>
  );
};

/* ─── Polling Banner ─────────────────────────────────────────────────────── */
const PollingBanner: React.FC<{ attempt: number; maxAttempts: number }> = ({ attempt, maxAttempts }) => {
  const pct = Math.round((attempt / maxAttempts) * 100);
  return (
    <div style={{
      background: C.blueDim, border: `1px solid ${C.blue}25`,
      borderRadius: 12, padding: '12px 16px',
      animation: 'fadeUp 0.3s cubic-bezier(0.22,1,0.36,1) both',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.blue, animation: 'pulseGlow 1.5s ease infinite', flexShrink: 0 }} />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: C.blue, fontFamily: "'DM Sans', system-ui, sans-serif" }}>Sourcing in progress</span>
        <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 'auto', fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif" }}>Poll {attempt}/{maxAttempts}</span>
      </div>
      <div style={{ height: 3, background: C.surfaceDeep, borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${C.blue}, ${C.teal})`, borderRadius: 99, transition: 'width 0.5s ease' }} />
      </div>
      <p style={{ fontSize: 11, color: C.textMuted, margin: '7px 0 0', lineHeight: 1.5, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        Scanning internal DB + external boards — typically 2–3 min.
      </p>
    </div>
  );
};

/* ══════════════════════ CANDIDATE CARD ══════════════════════════════════════ */
const CandidateCard: React.FC<{
  candidate:     SourcingCandidate;
  jobId:         number;
  jobIsOpen:     boolean;
  index:         number;
  searchQuery:   string;
  onShortlisted: (id: number) => void;
}> = ({ candidate, jobId, jobIsOpen, index, searchQuery, onShortlisted }) => {
  const [expanded,   setExpanded]   = useState(false);
  const [hovered,    setHovered]    = useState(false);
  const [downloading,setDownloading]= useState(false);
  const { shortlist, isShortlisting } = useShortlist();

  const tagMeta = TAG_META[candidate.source_tag] ?? {
    label: candidate.source_tag, bg: C.blueDim, text: C.textMuted, dot: C.textFaint,
    actionPolicy: 'shortlist' as const, hasResume: false,
  };

  const isAlreadyShortlisted =
    candidate.source_tag === 'applied_shortlisted' || tagMeta.actionPolicy === 'none';

  const shortlisting = isShortlisting(candidate.candidate_id);
  const handleShortlist = () => shortlist(candidate.candidate_id, jobId, onShortlisted);

  const handleDownloadResume = async () => {
    if (!tagMeta.hasResume) return;
    setDownloading(true);
    const url = await sourcingService.getResumeDownloadUrl(candidate.candidate_id);
    setDownloading(false);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const isTop        = candidate.rank <= 3;
  const avatarColors = [C.blue, C.indigo, C.teal, C.amber, C.blueLight];
  const avatarColor  = avatarColors[candidate.candidate_id % avatarColors.length];
  const initials     = candidate.name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');

  const profileLink = !tagMeta.hasResume && candidate.source_url
    ? <GhostBtn icon={<ExternalLink size={11} />} label="Profile" href={candidate.source_url} />
    : null;

  const downloadBtn = tagMeta.hasResume
    ? <GhostBtn icon={<FileDown size={11} />} label="Resume" onClick={handleDownloadResume} loading={downloading} disabled={downloading} />
    : null;

  const shortlistedPill = (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 9,
      background: C.tealDim, border: `1px solid ${C.tealBorder}`, color: C.teal, fontSize: 12, fontWeight: 700,
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <Star size={11} /> Shortlisted
    </span>
  );

  const renderActions = () => {
    if (!jobIsOpen) return (
      <>
        {profileLink}{downloadBtn}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 9, background: C.surfaceDeep, border: `1px solid ${C.border}`, color: C.textFaint, fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          <Clock size={11} /> Job Closed
        </span>
      </>
    );
    if (isAlreadyShortlisted) return <>{profileLink}{downloadBtn}{shortlistedPill}</>;
    if (tagMeta.actionPolicy === 'pipeline') return (
      <>
        {profileLink}{downloadBtn}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 9, background: C.blueDim, border: `1px solid ${C.blue}28`, color: C.blue, fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          <CheckCircle size={11} /> In Pipeline
        </span>
      </>
    );
    return (
      <>
        {profileLink}{downloadBtn}
        <button onClick={handleShortlist} disabled={shortlisting} style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 9,
          background: shortlisting ? C.surfaceDeep : `linear-gradient(135deg, ${C.teal}, ${C.tealLight})`,
          color: shortlisting ? C.textMuted : C.white,
          border: `1px solid ${shortlisting ? C.border : 'transparent'}`,
          fontSize: 12, fontWeight: 700, cursor: shortlisting ? 'not-allowed' : 'pointer',
          boxShadow: shortlisting ? 'none' : C.shadowTeal, transition: 'all 0.18s', fontFamily: "'DM Sans', system-ui, sans-serif",
        }}>
          {shortlisting ? <><Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> Shortlisting…</> : <><Star size={11} /> Shortlist</>}
        </button>
      </>
    );
  };

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? C.white : 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(18px)',
        border: `1px solid ${hovered ? C.borderHov : C.border}`,
        borderRadius: 18, overflow: 'hidden',
        boxShadow: hovered ? C.shadowHov : C.shadow,
        transition: 'all 0.28s cubic-bezier(0.22,1,0.36,1)',
        transform: hovered ? 'translateY(-3px)' : 'none',
        animationName: 'fadeUp', animationDuration: '0.5s',
        animationTimingFunction: 'cubic-bezier(0.22,1,0.36,1)',
        animationDelay: `${index * 0.06}s`, animationFillMode: 'both',
        position: 'relative',
      }}
    >
      {/* Top accent */}
      {isTop && <div style={{ height: 3, background: `linear-gradient(90deg, ${C.blue}, ${C.teal})` }} />}

      <div style={{ padding: '18px 22px', display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap', position: 'relative' }}>
        {/* Rank */}
        <div style={{
          width: 30, height: 30, borderRadius: 9, flexShrink: 0, marginTop: 18,
          background: isTop ? C.blueDim : C.surfaceDeep,
          border: `1px solid ${isTop ? C.blue + '35' : C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, color: isTop ? C.blue : C.textMuted,
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}>
          {isTop ? '★' : candidate.rank}
        </div>

        {/* Avatar */}
        <div style={{
          width: 46, height: 46, borderRadius: 13, flexShrink: 0,
          background: `${avatarColor}12`, border: `1.5px solid ${avatarColor}28`,
          color: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700, fontFamily: "'DM Sans', system-ui, sans-serif",
          boxShadow: hovered ? `0 0 18px ${avatarColor}28` : 'none', transition: 'box-shadow 0.25s',
        }}>
          {initials}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.text, letterSpacing: '-0.2px', fontFamily: "'Fraunces', Georgia, serif" }}>
              {searchQuery ? highlightMatch(candidate.name, searchQuery) : candidate.name}
            </span>
            <TagBadge tag={isAlreadyShortlisted && candidate.source_tag !== 'applied_shortlisted' ? 'applied_shortlisted' : candidate.source_tag} />
            {isTop && (
              <span style={{ padding: '2px 9px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: C.blueDim, color: C.blue, border: `1px solid ${C.blue}22`, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                TOP {candidate.rank}
              </span>
            )}
          </div>
          {candidate.fit_summary && (
            <p style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.7, marginBottom: 11, maxWidth: 480, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              {searchQuery ? highlightMatch(candidate.fit_summary, searchQuery) : candidate.fit_summary}
            </p>
          )}
          <div style={{ display: 'flex', gap: 16, maxWidth: 400 }}>
            <ScoreBar value={candidate.semantic_score} color={C.blue} label="Semantic" />
            <ScoreBar value={candidate.rule_score}     color={C.teal} label="Rule"     />
          </div>
        </div>

        {/* Score + actions */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0, marginLeft: 'auto' }}>
          <ScoreRing score={candidate.final_score} />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {renderActions()}
            <button onClick={() => setExpanded(v => !v)}
              style={{
                width: 32, height: 32, borderRadius: 9,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${C.border}`, background: C.white,
                cursor: 'pointer', color: C.textMuted, transition: 'all 0.15s',
              }}
              onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = C.borderHov; b.style.color = C.blue; b.style.boxShadow = C.shadowBlue; }}
              onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = C.border; b.style.color = C.textMuted; b.style.boxShadow = 'none'; }}
            >
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          borderTop: `1px solid ${C.border}`, padding: '14px 22px 18px',
          background: C.surface, animation: 'fadeUp 0.2s cubic-bezier(0.22,1,0.36,1) both',
        }}>
          {candidate.quality_note && (
            <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: C.blueDim, border: `1px solid ${C.blue}22` }}>
              <span style={{ fontSize: 11, color: C.blue, fontWeight: 700, fontFamily: "'DM Sans', system-ui, sans-serif" }}>Quality note · </span>
              <span style={{ fontSize: 12.5, color: C.textMuted, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{candidate.quality_note}</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            {([
              { label: 'Candidate ID', value: `#${candidate.candidate_id}` },
              { label: 'Final Score',  value: `${(candidate.final_score * 100).toFixed(1)}%` },
              { label: 'Source',       value: isAlreadyShortlisted ? 'Shortlisted' : tagMeta.label },
              { label: 'Rank',         value: `#${candidate.rank}` },
            ] as { label: string; value: string }[]).map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 10, color: C.textFaint, marginBottom: 3, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', fontFamily: "'DM Sans', system-ui, sans-serif" }}>{label}</div>
                <div style={{ fontSize: 14, color: C.text, fontWeight: 800, fontFamily: "'Fraunces', Georgia, serif" }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════ EMPTY / LOADING STATES ══════════════════════════════ */
const EmptyState: React.FC<{ triggering: boolean; hasRun: boolean }> = ({ triggering, hasRun }) => (
  <Card style={{ padding: '64px 32px', textAlign: 'center' }}>
    <div style={{ marginBottom: 20 }}>
      {triggering ? (
        <div style={{ position: 'relative', width: 72, height: 72, margin: '0 auto' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2.5px solid ${C.blueDim}`, borderTop: `2.5px solid ${C.blue}`, animation: 'spin 1s linear infinite' }} />
          <div style={{ position: 'absolute', inset: 10, borderRadius: '50%', background: C.blueDim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={24} style={{ color: C.blue }} />
          </div>
        </div>
      ) : (
        <div style={{ width: 72, height: 72, borderRadius: '50%', margin: '0 auto', background: C.surfaceDeep, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Users size={28} style={{ color: C.textFaint }} />
        </div>
      )}
    </div>
    <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8, fontFamily: "'Fraunces', Georgia, serif" }}>
      {triggering ? 'AI sourcing in progress…' : hasRun ? 'No candidates match your filter' : 'Ready to source candidates'}
    </div>
    <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.7, maxWidth: 340, margin: '0 auto', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {triggering
        ? 'Scanning internal DB and external boards. Results stream in automatically — usually 2–3 minutes.'
        : hasRun
        ? 'Try adjusting your search or tag filter to see more results.'
        : 'Configure your sourcing run on the left panel, then click Start Sourcing.'}
    </div>
  </Card>
);

/* ══════════════════════ MAIN PAGE ══════════════════════════════════════════ */
const SourcingPage: React.FC = () => {
  const { user } = useSelector((s: RootState) => s.auth);

  const [jobs,        setJobs]        = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [mode,        setMode]        = useState<'internal' | 'external' | 'both'>('both');
  const [count,       setCount]       = useState(10);

  /* ── Hooks ── */
  const history    = useSourcingHistory();
  const candidates = useSourcingCandidates();
  const filter     = useCandidateFilter(candidates.candidates);

  const trigger = useSourcingTrigger({
    onQueued: (sourcingId) => {
      candidates.reset();
      candidates.setActiveSourcingId?.(sourcingId);
    },
    onComplete: async (newCandidates, sourcingId) => {
      if (selectedJob) await history.fetchHistory(selectedJob.id);
      if (selectedJob) await candidates.fetchCandidates(sourcingId, selectedJob.id);
    },
    onTimeout: () => {},
  });

  const selectedJobIsOpen = selectedJob?.is_active === true;

  /* ── Bootstrap ── */
  useEffect(() => {
    jobService.listJobs().then(data => {
      setJobs(data);
      if (data.length > 0) setSelectedJob(data[0]);
    }).catch(console.error);
    return () => trigger.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Job change ── */
  useEffect(() => {
    if (!selectedJob) return;
    candidates.reset();
    filter.clearAll();
    history.reset();
    history.fetchHistory(selectedJob.id).then(resp => {
      if (resp && resp.sourced && resp.runs.length > 0) {
        candidates.fetchCandidates(resp.runs[0].sourcing_id, selectedJob.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJob?.id]);

  const loadRun = useCallback((sourcingId: number) => {
    candidates.fetchCandidates(sourcingId, selectedJob?.id);
    filter.clearAll();
  }, [candidates, filter, selectedJob?.id]);

  const handleTrigger = () => {
    if (!selectedJob) return;
    trigger.trigger({ job_id: selectedJob.id, count, mode });
  };

  /* ── Access guard ── */
  if (user?.role !== 'recruiter' && user?.role !== 'admin'

  ) return (
    <div style={{ maxWidth: 400, margin: '80px auto', textAlign: 'center', fontFamily: "'DM Sans', system-ui, sans-serif", padding: 24 }}>
      <Card style={{ padding: 48 }}>
        <AlertCircle size={36} style={{ color: C.danger, display: 'block', margin: '0 auto 14px' }} />
        <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: '0 0 6px', fontFamily: "'Fraunces', Georgia, serif" }}>Access Restricted</p>
        <p style={{ fontSize: 13, color: C.textMuted, margin: 0, fontFamily: "'DM Sans', system-ui, sans-serif" }}>This page is restricted to recruiters only.</p>
      </Card>
    </div>
  );

  return (
    <div style={{
      fontFamily: "'DM Sans', system-ui, sans-serif",
      minHeight: '100vh', background: C.bg, padding: 24, position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,600&display=swap');

        @keyframes fadeUp    { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dropIn    { from{opacity:0;transform:translateY(-8px) scale(0.97)} to{opacity:1;transform:none} }
        @keyframes spin      { to{transform:rotate(360deg)} }
        @keyframes orbFloat1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-40px,30px)} }
        @keyframes orbFloat2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(50px,-35px)} }
        @keyframes orbFloat3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-25px,20px)} }
        @keyframes pulseGlow { 0%,100%{opacity:1} 50%{opacity:0.35} }

        * { box-sizing: border-box; }
        ::selection { background: rgba(79,125,255,0.18); color: #0d1b3e; }
        input::placeholder { color: #8fa3c8; font-weight: 400; }
        input:focus { outline: none; }
        input[type=range] { -webkit-appearance:none; height:3px; background: rgba(79,125,255,0.15); border-radius:99px; cursor:pointer; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:18px; height:18px; border-radius:50%; background: linear-gradient(135deg,#2a4fff,#6b93ff); border:2.5px solid white; box-shadow:0 2px 10px rgba(79,125,255,0.35); cursor:pointer; transition:transform 0.15s; }
        input[type=range]::-webkit-slider-thumb:hover { transform:scale(1.2); }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(79,125,255,0.18); border-radius:99px; }

        .sourcing-grid { display:grid; grid-template-columns:310px 1fr; gap:20px; align-items:start; position:relative; z-index:2; }
        .stat-grid     { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; }
        @media(max-width:1024px){ .sourcing-grid{grid-template-columns:1fr} .stat-grid{grid-template-columns:repeat(3,1fr)} }
        @media(max-width:560px){ .stat-grid{grid-template-columns:repeat(2,1fr)} }
      `}</style>

      <BgPattern />

      {/* ── Page header ── */}
      <div style={{ marginBottom: 26, position: 'relative', zIndex: 2, animationName: 'fadeUp', animationDuration: '0.5s', animationTimingFunction: 'cubic-bezier(0.22,1,0.36,1)', animationFillMode: 'both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{
            width: 50, height: 50, borderRadius: 15,
            background: C.gradBlue, boxShadow: C.shadowBlue,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, letterSpacing: '-0.6px', margin: 0, lineHeight: 1.1, fontFamily: "'Fraunces', Georgia, serif" }}>
              Candidate Sourcing
            </h1>
            <p style={{ fontSize: 13, color: C.textMuted, fontWeight: 500, margin: '3px 0 0', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              AI-powered talent discovery · Internal DB + external boards
            </p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 99,
              background: C.tealDim, border: `1px solid ${C.tealBorder}`,
              fontSize: 12, fontWeight: 700, color: C.teal,
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.teal, animation: 'pulseGlow 2s ease infinite', display: 'inline-block' }} />
              AI Engine Online
            </span>
            {jobs.length > 0 && (
              <span style={{
                padding: '6px 13px', borderRadius: 99,
                background: 'rgba(255,255,255,0.80)',
                border: `1px solid ${C.border}`, fontSize: 12, fontWeight: 600, color: C.textMuted,
                fontFamily: "'DM Sans', system-ui, sans-serif",
              }}>
                {jobs.length} position{jobs.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="sourcing-grid">

        {/* ════ LEFT PANEL ════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Trigger card */}
          <Card delay={0.05}>
            <div style={{ padding: '16px 20px 14px', borderBottom: `1px solid ${C.border}`, background: `linear-gradient(135deg, ${C.blueDim}, transparent)` }}>
              <SectionHeader icon={<Target size={15} />} title="New Sourcing Run" subtitle="Configure and launch AI talent search" color={C.blue} />
            </div>
            <div style={{ padding: '18px 20px 22px' }}>

              {/* Job selection */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 10.5, color: C.textFaint, display: 'block', marginBottom: 7, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                  Job Position
                </label>
                <JobSearchCombobox jobs={jobs} selected={selectedJob} onSelect={setSelectedJob} />

                {selectedJob && (
                  <div style={{ marginTop: 10, padding: '10px 13px', borderRadius: 11, background: C.blueDim, border: `1px solid ${C.blue}22`, animationName: 'fadeUp', animationDuration: '0.2s', animationFillMode: 'both' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                      <span style={{ padding: '2px 7px', borderRadius: 6, background: C.gradBlue, color: C.white, fontSize: 10, fontWeight: 700, fontFamily: "'DM Sans', system-ui, sans-serif" }}>#{selectedJob.id}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.blue, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Fraunces', Georgia, serif" }}>
                        {selectedJob.title}
                      </span>
                      <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 700, color: selectedJobIsOpen ? C.teal : C.textFaint, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: selectedJobIsOpen ? C.teal : C.textFaint }} />
                        {selectedJobIsOpen ? 'Open' : 'Closed'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {parseSkills(selectedJob.skills_required).slice(0, 4).map((s, si) => (
                        <span key={si} style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: 'rgba(255,255,255,0.85)', color: C.blue, border: `1px solid ${C.blue}22`, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{s}</span>
                      ))}
                      <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: C.indigoDim, color: C.indigo, border: `1px solid ${C.indigo}22`, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                        {selectedJob.experience_required}y+ exp
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <Divider />

              {/* Mode */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 10.5, color: C.textFaint, display: 'block', marginBottom: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', fontFamily: "'DM Sans', system-ui, sans-serif" }}>Source Mode</label>
                <div style={{ display: 'flex', gap: 7 }}>
                  <ModeBtn label="Internal" desc="DB only"     icon={<Database size={14}/>} active={mode==='internal'} onClick={() => setMode('internal')} />
                  <ModeBtn label="Both"     desc="Recommended" icon={<Zap size={14}/>}      active={mode==='both'}     onClick={() => setMode('both')}     />
                  <ModeBtn label="External" desc="Boards only" icon={<Globe size={14}/>}    active={mode==='external'} onClick={() => setMode('external')} />
                </div>
                <div style={{ marginTop: 10, padding: '9px 12px', borderRadius: 10, background: C.surfaceDeep, border: `1px solid ${C.border}`, fontSize: 12, color: C.textMuted, lineHeight: 1.6, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                  {mode === 'internal' && '🗄️ Searches your existing candidate database only'}
                  {mode === 'external' && '🌐 Scrapes external job boards (postjobfree)'}
                  {mode === 'both'     && '⚡ Internal-first — external fills any shortfall'}
                </div>
              </div>

              <Divider />

              {/* Count slider */}
              <div style={{ marginBottom: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 }}>
                  <label style={{ fontSize: 10.5, color: C.textFaint, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', fontFamily: "'DM Sans', system-ui, sans-serif" }}>Candidates to Find</label>
                  <span style={{ padding: '2px 11px', borderRadius: 99, background: C.gradBlue, color: C.white, fontSize: 13, fontWeight: 800, boxShadow: C.shadowBlue, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{count}</span>
                </div>
                <input type="range" min={5} max={50} step={5} value={count} onChange={e => setCount(parseInt(e.target.value))} style={{ width: '100%' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: C.textFaint, marginTop: 5, fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                  <span>5 min</span><span>50 max</span>
                </div>
              </div>

              {/* Closed-job warning */}
              {selectedJob && !selectedJobIsOpen && (
                <div style={{ marginBottom: 14, padding: '10px 13px', borderRadius: 10, background: C.amberDim, border: `1px solid ${C.amberBorder}`, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <AlertCircle size={14} style={{ color: C.amber, flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 12, color: C.amber, lineHeight: 1.6, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                    This job is <strong>closed</strong>. Sourcing will surface candidates from your DB history. No actions are available on closed jobs.
                  </span>
                </div>
              )}

              {/* CTA */}
              <button onClick={handleTrigger} disabled={trigger.triggering || !selectedJob}
                style={{
                  width: '100%', padding: '12px',
                  background: trigger.triggering || !selectedJob ? C.surfaceDeep : C.gradBlue,
                  color: trigger.triggering || !selectedJob ? C.textFaint : C.white,
                  border: `1px solid ${trigger.triggering || !selectedJob ? C.border : 'transparent'}`,
                  borderRadius: 12, fontSize: 13.5, fontWeight: 700,
                  cursor: trigger.triggering || !selectedJob ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: trigger.triggering || !selectedJob ? 'none' : C.shadowBlue,
                  transition: 'all 0.2s cubic-bezier(0.22,1,0.36,1)', fontFamily: "'DM Sans', system-ui, sans-serif",
                }}
                onMouseEnter={e => { if (!trigger.triggering && selectedJob) { (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; } }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; (e.currentTarget as HTMLButtonElement).style.transform = 'none'; }}
              >
                {trigger.triggering
                  ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Sourcing in progress…</>
                  : <><Play size={14} fill="currentColor" /> Start Sourcing</>}
              </button>

              {trigger.triggering && trigger.pollAttempt > 0 && (
                <div style={{ marginTop: 12 }}>
                  <PollingBanner attempt={trigger.pollAttempt} maxAttempts={trigger.maxPolls} />
                </div>
              )}
            </div>
          </Card>

          {/* History card */}
          <Card delay={0.1}>
            <div style={{ padding: '16px 20px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <SectionHeader icon={<History size={14} />} title="Sourcing History" subtitle={`${history.runs.length} past run${history.runs.length !== 1 ? 's' : ''} for this job`} color={C.teal} />
              {history.loading && <Loader2 size={14} style={{ color: C.textFaint, animation: 'spin 1s linear infinite' }} />}
            </div>
            <div style={{ padding: '12px 14px 16px' }}>
              {history.runs.length === 0 ? (
                <div style={{ fontSize: 13, color: C.textFaint, textAlign: 'center', padding: '24px 0', fontWeight: 500, fontFamily: "'DM Sans', system-ui, sans-serif" }}>No runs yet for this position</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {history.runs.slice(0, 8).map(run => {
                    const isActive = candidates.activeSourcingId === run.sourcing_id;
                    return (
                      <button key={String(run.sourcing_id)} onClick={() => loadRun(run.sourcing_id)}
                        style={{
                          width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: 11,
                          border: `1.5px solid ${isActive ? C.blue + '45' : C.border}`,
                          background: isActive ? C.blueDim : 'transparent',
                          cursor: 'pointer', transition: 'all 0.18s', display: 'flex', alignItems: 'center', gap: 10, fontFamily: "'DM Sans', system-ui, sans-serif",
                          boxShadow: isActive ? `0 2px 14px ${C.blue}18` : 'none',
                        }}
                        onMouseEnter={e => { if (!isActive) { const b = e.currentTarget as HTMLButtonElement; b.style.background = C.surface; b.style.borderColor = `${C.blue}28`; } }}
                        onMouseLeave={e => { if (!isActive) { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'transparent'; b.style.borderColor = C.border; } }}
                      >
                        <div style={{
                          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                          background: isActive ? C.gradBlue : C.surfaceDeep,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9.5, fontWeight: 800, color: isActive ? C.white : C.textMuted,
                          boxShadow: isActive ? C.shadowBlue : 'none',
                          fontFamily: "'DM Sans', system-ui, sans-serif",
                        }}>#{run.sourcing_id}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: isActive ? C.blue : C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'DM Sans', system-ui, sans-serif" }}>{run.role}</div>
                          <div style={{ fontSize: 10.5, color: C.textFaint, marginTop: 1, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{formatDate(run.created_at)}</div>
                        </div>
                        {isActive && <ChevronRight size={12} style={{ color: C.blue, flexShrink: 0 }} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ════ RIGHT PANEL ════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Stats */}
          {candidates.candidates.length > 0 && (
            <div className="stat-grid">
              <StatCard label="Total found" value={filter.stats.total}     icon={<Users size={14}/>}     color={C.blue}   delay={0}    />
              <StatCard label="Internal"    value={filter.stats.internal}  icon={<Database size={14}/>}  color={C.indigo} delay={0.05} />
              <StatCard label="External"    value={filter.stats.external}  icon={<Globe size={14}/>}     color={C.danger} delay={0.1}  />
              <StatCard label="Avg score"   value={`${filter.stats.avg}%`} icon={<BarChart3 size={14}/>} color={C.teal}   delay={0.15} />
              <StatCard label="Top score"   value={`${filter.stats.top}%`} icon={<Award size={14}/>}     color={C.amber}  delay={0.2}  />
            </div>
          )}

          {/* Search + filter */}
          {candidates.candidates.length > 0 && (
            <Card style={{ padding: '12px 14px' }} delay={0.22}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: C.textFaint }} />
                  <input placeholder="Search candidates…" value={filter.searchTerm} onChange={e => filter.setSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '8px 32px 8px 33px', border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 13, color: C.text, background: C.surface, fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 500, transition: 'border-color 0.16s' }}
                    onFocus={e => { e.target.style.borderColor = C.borderFocus; (e.target as HTMLInputElement).style.boxShadow = `0 0 0 3px ${C.blue}14`; }}
                    onBlur={e  => { e.target.style.borderColor = C.border; (e.target as HTMLInputElement).style.boxShadow = 'none'; }}
                  />
                  {filter.searchTerm && (
                    <button onClick={filter.clearSearch} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.textFaint, padding: 0, display: 'flex' }}>
                      <X size={13} />
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Filter size={13} style={{ color: C.textFaint, flexShrink: 0 }} />
                  {filter.allTags.map(tag => (
                    <button key={tag} onClick={() => filter.setTagFilter(tag)}
                      style={{
                        padding: '5px 12px', borderRadius: 8,
                        border: `1px solid ${filter.tagFilter === tag ? C.blue : C.border}`,
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        background: filter.tagFilter === tag ? C.blueDim : C.white,
                        color: filter.tagFilter === tag ? C.blue : C.textMuted,
                        transition: 'all 0.18s', fontFamily: "'DM Sans', system-ui, sans-serif",
                        boxShadow: filter.tagFilter === tag ? `0 0 10px ${C.blue}18` : 'none',
                      }}
                      onMouseEnter={e => { if (filter.tagFilter !== tag) { const b = e.currentTarget as HTMLButtonElement; b.style.background = C.blueDim; b.style.borderColor = `${C.blue}35`; } }}
                      onMouseLeave={e => { if (filter.tagFilter !== tag) { const b = e.currentTarget as HTMLButtonElement; b.style.background = C.white; b.style.borderColor = C.border; } }}
                    >
                      {tag === 'all' ? 'All' : TAG_META[tag]?.label ?? tag}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Result count */}
          {filter.filtered.length > 0 && (
            <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, padding: '0 2px', position: 'relative', zIndex: 2, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              Showing <strong style={{ color: C.text }}>{filter.filtered.length}</strong> candidate{filter.filtered.length !== 1 ? 's' : ''}
              {filter.tagFilter !== 'all' && ` · ${TAG_META[filter.tagFilter]?.label ?? filter.tagFilter}`}
              {filter.searchTerm && ` · matching "${filter.searchTerm}"`}
            </div>
          )}

          {/* Candidate list */}
          {candidates.loading ? (
            <Card style={{ padding: '56px 24px', textAlign: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', margin: '0 auto 14px', border: `2.5px solid ${C.blueDim}`, borderTop: `2.5px solid ${C.blue}`, animation: 'spin 1s linear infinite' }} />
              <p style={{ fontSize: 13, color: C.textMuted, fontWeight: 500, margin: 0, fontFamily: "'DM Sans', system-ui, sans-serif" }}>Loading candidates…</p>
            </Card>

          ) : history.neverSourced ? (
            <Card style={{ padding: '60px 32px', textAlign: 'center', border: `1.5px dashed ${C.borderMid}` }}>
              <div style={{ width: 68, height: 68, borderRadius: '50%', margin: '0 auto 18px', background: C.amberDim, border: `1px solid ${C.amberBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={28} style={{ color: C.amber }} />
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 8, fontFamily: "'Fraunces', Georgia, serif" }}>Not sourced yet</div>
              <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.7, maxWidth: 320, margin: '0 auto 20px', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                No sourcing runs have been triggered for <strong style={{ color: C.text }}>{selectedJob?.title}</strong>. Configure a run on the left and click Start Sourcing.
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 99, background: C.blueDim, border: `1px solid ${C.blue}22`, fontSize: 12, color: C.blue, fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                <Play size={11} fill="currentColor" /> Click "Start Sourcing" to find candidates
              </div>
            </Card>

          ) : filter.filtered.length === 0 ? (
            <EmptyState triggering={trigger.triggering} hasRun={!!candidates.activeSourcingId} />

          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filter.filtered.map((c, i) => (
                <CandidateCard
                  key={String(c.candidate_id)}
                  candidate={c}
                  jobId={selectedJob?.id ?? 0}
                  jobIsOpen={selectedJobIsOpen}
                  index={i}
                  searchQuery={filter.searchTerm}
                  onShortlisted={candidates.markShortlisted}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SourcingPage;