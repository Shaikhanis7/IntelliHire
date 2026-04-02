/**
 * pages/ApplicationsPage.tsx — RECRUITER ONLY
 * ─────────────────────────────────────────────
 * Theme : SourcingPage light-blue professional
 *         (DM Sans + Fraunces · frosted glass cards ·
 *          animated orb background · dot-grid overlay)
 *
 * Imports hooks / service / types from feature folder.
 * All UI sub-components live below the imports section.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  Users, Star, Search, Clock,
  CheckCircle, XCircle, Mail, MapPin, Briefcase,
  Calendar, ChevronDown, ChevronUp,
  ExternalLink, UserCheck, UserX, Loader2,
  AlertCircle, X, Award, Layers, RefreshCw,
  BarChart3, Filter, Sparkles,
} from 'lucide-react';

import type { RootState } from '../app/store';
import type { Application, AppStatus, Job } from '../features/application/types/application.types';
import { applicationService } from '../features/application/services/application.service';
import {
  useJobs,
  useRecruiterApplications,
  useApplicationStatus,
  useRecruiterFilter,
} from '../features/application/hooks/useRecruiterApplications';

/* ═══════════════════════════════════════════════════════════════
   DESIGN TOKENS  — identical to SourcingPage
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
  indigoLight:  '#b899ff',
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

const STATUS_META: Record<AppStatus, { label: string; color: string; bg: string; border: string }> = {
  applied:         { label: 'Applied',     color: C.textMuted, bg: C.surfaceDeep, border: C.border          },
  scored:          { label: 'Scored',      color: C.blue,      bg: C.blueDim,     border: `${C.blue}35`     },
  shortlisted:     { label: 'Shortlisted', color: C.teal,      bg: C.tealDim,     border: C.tealBorder      },
  rejected:        { label: 'Rejected',    color: C.danger,    bg: C.dangerDim,   border: C.dangerBorder    },
  hired:           { label: 'Hired',       color: C.indigo,    bg: C.indigoDim,   border: `${C.indigo}35`   },
  sourced_invited: { label: 'Invited',     color: C.amber,     bg: C.amberDim,    border: C.amberBorder     },
};

const fmt = (v: string | null | undefined) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const parseSkills = (s: string | string[] | null | undefined): string[] => {
  if (!s) return [];
  if (Array.isArray(s)) return s;
  return s.split(',').map(x => x.trim()).filter(Boolean);
};

const scoreColor = (n: number) => n >= 80 ? C.teal : n >= 65 ? C.amber : C.danger;

/* ═══════════════════════════════════════════════════════════════
   BACKGROUND
   ═══════════════════════════════════════════════════════════════ */
const BgPattern: React.FC = () => (
  <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: 680, height: 560, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(79,125,255,0.13) 0%, rgba(79,125,255,0.04) 50%, transparent 75%)', filter: 'blur(64px)', animation: 'orbFloat1 18s ease-in-out infinite' }} />
    <div style={{ position: 'absolute', bottom: '-8%', left: '-4%', width: 560, height: 480, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(6,214,176,0.10) 0%, rgba(6,214,176,0.03) 50%, transparent 75%)', filter: 'blur(72px)', animation: 'orbFloat2 22s ease-in-out infinite' }} />
    <div style={{ position: 'absolute', top: '40%', left: '30%', width: 440, height: 360, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(155,109,255,0.07) 0%, transparent 70%)', filter: 'blur(60px)', animation: 'orbFloat3 26s ease-in-out infinite' }} />
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.38 }}>
      <defs>
        <pattern id="rapp-dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.85" fill="rgba(79,125,255,0.20)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#rapp-dots)" />
    </svg>
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, transparent 0%, #4f7dff 30%, #06d6b0 60%, transparent 100%)', opacity: 0.6 }} />
  </div>
);

/* ── Card ────────────────────────────────────────────────────── */
const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; delay?: number }> = ({ children, style, delay = 0 }) => (
  <div style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(20px) saturate(1.5)', border: `1px solid ${C.border}`, borderRadius: 18, boxShadow: C.shadow, animationName: 'fadeUp', animationDuration: '0.5s', animationTimingFunction: 'cubic-bezier(0.22,1,0.36,1)', animationDelay: `${delay}s`, animationFillMode: 'both', ...style }}>
    {children}
  </div>
);

/* ── Stat card ───────────────────────────────────────────────── */
const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color: string; delay?: number }> = ({ label, value, icon, color, delay = 0 }) => {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{ background: hov ? C.white : 'rgba(255,255,255,0.80)', backdropFilter: 'blur(16px)', border: `1px solid ${hov ? `${color}35` : C.border}`, borderRadius: 16, padding: '16px 18px', boxShadow: hov ? `0 8px 32px ${color}18` : C.shadow, transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)', transform: hov ? 'translateY(-3px)' : 'none', cursor: 'default', animationName: 'fadeUp', animationDuration: '0.5s', animationTimingFunction: 'cubic-bezier(0.22,1,0.36,1)', animationDelay: `${delay}s`, animationFillMode: 'both' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, marginBottom: 12, background: `${color}12`, border: `1px solid ${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: hov ? `0 0 16px ${color}30` : 'none', transition: 'box-shadow 0.25s' }}>
        <span style={{ color, display: 'flex' }}>{icon}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: '-1px', lineHeight: 1, fontFamily: "'Fraunces', Georgia, serif" }}>{value}</div>
      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4, fontWeight: 500, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{label}</div>
    </div>
  );
};

/* ── Status badge ────────────────────────────────────────────── */
const StatusBadge: React.FC<{ status: AppStatus }> = ({ status }) => {
  const m = STATUS_META[status] ?? STATUS_META.applied;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 99, background: m.bg, color: m.color, border: `1px solid ${m.border}`, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.2, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
      {m.label}
    </span>
  );
};

/* ── Sourcing badge ──────────────────────────────────────────── */
const SourcingBadge: React.FC<{ rank: number }> = ({ rank }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, background: C.indigoDim, border: `1px solid ${C.indigo}25`, fontSize: 10.5, fontWeight: 700, color: C.indigo, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
    <Layers size={9} /> Sourced #{rank}
  </span>
);

/* ── Score ring ──────────────────────────────────────────────── */
const ScoreRing: React.FC<{ score: number; size?: number }> = ({ score, size = 62 }) => {
  const v = Math.min(100, Math.max(0, Math.round(score)));
  const color = scoreColor(v);
  const r = size / 2 - 5, circ = 2 * Math.PI * r, dash = (v / 100) * circ;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: C.white, border: `1px solid ${C.border}`, boxShadow: C.shadow, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${color}18`} strokeWidth="3.5" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3.5" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 3px ${color}70)` }} />
      </svg>
      <span style={{ fontSize: size * 0.225, fontWeight: 800, color, lineHeight: 1, zIndex: 1, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{v}</span>
      <span style={{ fontSize: size * 0.115, color: `${color}90`, fontWeight: 700, letterSpacing: 0.3, zIndex: 1, textTransform: 'uppercase', fontFamily: "'DM Sans', system-ui, sans-serif" }}>%</span>
    </div>
  );
};

/* ── Pending score ───────────────────────────────────────────── */
const PendingScore: React.FC = () => (
  <div style={{ width: 62, height: 62, borderRadius: '50%', flexShrink: 0, background: C.surfaceDeep, border: `1.5px dashed ${C.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
    <Clock size={14} style={{ color: C.textFaint }} />
    <span style={{ fontSize: 9, color: C.textFaint, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase', fontFamily: "'DM Sans', system-ui, sans-serif" }}>pending</span>
  </div>
);

/* ── Score bar ───────────────────────────────────────────────── */
const ScoreBar: React.FC<{ value: number; label: string; color: string }> = ({ value, label, color }) => {
  const v = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: C.textMuted, marginBottom: 4, fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <span>{label}</span><span style={{ color, fontWeight: 700 }}>{v}%</span>
      </div>
      <div style={{ height: 3, background: C.surfaceDeep, borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${v}%`, background: `linear-gradient(90deg, ${color}88, ${color})`, borderRadius: 99, transition: 'width .7s' }} />
      </div>
    </div>
  );
};

/* ── Action button ───────────────────────────────────────────── */
const ActionBtn: React.FC<{ onClick: () => void; disabled: boolean; bg: string; color: string; border?: string; shadow?: string; children: React.ReactNode }> = ({ onClick, disabled, bg, color, border, shadow, children }) => (
  <button onClick={onClick} disabled={disabled} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 13px', borderRadius: 9, background: bg, color, border: border ? `1px solid ${border}` : 'none', fontSize: 12, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", opacity: disabled ? .55 : 1, transition: 'all 0.15s', boxShadow: shadow ?? 'none' }}
    onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.opacity = '0.82'; }}
    onMouseLeave={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
  >{children}</button>
);

/* ── Job selector ────────────────────────────────────────────── */
const JobSelector: React.FC<{ jobs: Job[]; selected: Job | null; loading: boolean; onSelect: (j: Job | null) => void }> = ({ jobs, selected, loading, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) { setOpen(false); setQuery(''); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const norm = query.replace(/^#/, '').trim().toLowerCase();
  const filtered = norm ? jobs.filter(j => String(j.id).startsWith(norm) || j.title.toLowerCase().includes(norm) || parseSkills(j.skills_required).some(s => s.toLowerCase().includes(norm))) : jobs;
  const handleSelect = (j: Job) => { onSelect(j); setOpen(false); setQuery(''); };
  const display = open ? query : selected ? `#${selected.id} · ${selected.title}` : '';

  return (
    <div ref={containerRef} style={{ position: 'relative', minWidth: 280 }}>
      <div onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', border: `1.5px solid ${focused ? C.borderFocus : C.border}`, borderRadius: 11, background: C.white, cursor: 'text', boxShadow: focused ? `0 0 0 3px ${C.blue}14` : C.shadow, transition: 'all .18s' }}>
        <Search size={13} style={{ color: C.textFaint, flexShrink: 0 }} />
        <input ref={inputRef} value={display} placeholder={loading ? 'Loading jobs…' : 'Search #ID, title, skill…'} onChange={e => { setQuery(e.target.value); setOpen(true); }} onFocus={() => { setFocused(true); setOpen(true); setQuery(''); }} onBlur={() => setFocused(false)} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: C.text, fontWeight: 500, fontFamily: "'DM Sans', system-ui, sans-serif" }} />
        {selected && !open && <button onClick={e => { e.stopPropagation(); onSelect(null); setQuery(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textFaint, display: 'flex', padding: 0 }}><X size={12} /></button>}
        <ChevronDown size={13} style={{ color: C.textFaint, flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </div>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 50, background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(20px)', border: `1px solid ${C.borderMid}`, borderRadius: 14, boxShadow: C.shadowHov, maxHeight: 320, overflowY: 'auto', animationName: 'dropIn', animationDuration: '0.15s', animationTimingFunction: 'cubic-bezier(0.22,1,0.36,1)', animationFillMode: 'both' }}>
          {filtered.length === 0
            ? <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: C.textFaint, fontFamily: "'DM Sans', system-ui, sans-serif" }}>No jobs match "{query}"</div>
            : filtered.map(j => {
              const isSel = selected?.id === j.id;
              const skills = parseSkills(j.skills_required).slice(0, 3);
              const extra = parseSkills(j.skills_required).length - 3;
              return (
                <div key={j.id} onMouseDown={e => { e.preventDefault(); handleSelect(j); }} style={{ padding: '10px 14px', cursor: 'pointer', background: isSel ? C.blueDim : 'transparent', borderLeft: `3px solid ${isSel ? C.blue : 'transparent'}`, transition: 'all .12s' }}
                  onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLDivElement).style.background = 'rgba(79,125,255,0.05)'; }}
                  onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ padding: '1px 7px', borderRadius: 6, background: isSel ? C.blue : C.surfaceDeep, color: isSel ? C.white : C.textMuted, fontSize: 10, fontWeight: 700, fontFamily: "'DM Sans', system-ui, sans-serif" }}>#{j.id}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: isSel ? C.blue : C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'DM Sans', system-ui, sans-serif" }}>{j.title}</span>
                    {isSel && <CheckCircle size={13} style={{ color: C.blue, marginLeft: 'auto', flexShrink: 0 }} />}
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: skills.length ? 6 : 0 }}>
                    <span style={{ fontSize: 11, color: C.textMuted, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{j.experience_required}y+ exp</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: j.is_active ? C.teal : C.textFaint, fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: j.is_active ? C.teal : C.textFaint }} />{j.is_active ? 'Active' : 'Closed'}
                    </span>
                  </div>
                  {skills.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {skills.map((s, si) => <span key={si} style={{ padding: '2px 7px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: C.blueDim, color: C.blue, border: `1px solid ${C.blue}20`, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{s}</span>)}
                      {extra > 0 && <span style={{ padding: '2px 7px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: C.surfaceDeep, color: C.textMuted, fontFamily: "'DM Sans', system-ui, sans-serif" }}>+{extra}</span>}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

/* ── Candidate card ──────────────────────────────────────────── */
const CandidateCard: React.FC<{ app: Application; rank: number; onStatus: (id: number, status: AppStatus) => void; statusLoading: number | null }> = ({ app, rank, onStatus, statusLoading }) => {
  const [expanded, setExpanded] = useState(false);
  const [localLoading, setLocalLoading] = useState<AppStatus | null>(null);
  const [hovered, setHovered] = useState(false);

  const status = (app.status ?? 'applied') as AppStatus;
  const isTop = rank <= 3, hasScore = app.final_score != null;
  const name = app.candidate?.name?.trim() || `Applicant #${app.candidate_id}`;
  const initials = name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
  const skills = parseSkills(app.candidate?.skills);
  const palette = [C.blue, C.indigo, C.teal, C.amber, C.blueLight, C.danger];
  const aColor = palette[app.candidate_id % palette.length];
  const isLoading = statusLoading === app.id;

  const act = (s: AppStatus) => { setLocalLoading(s); onStatus(app.id, s); setTimeout(() => setLocalLoading(null), 600); };

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? C.white : 'rgba(255,255,255,0.82)', backdropFilter: 'blur(18px)', border: `1px solid ${hovered ? C.borderHov : C.border}`, borderRadius: 18, overflow: 'hidden', boxShadow: hovered ? C.shadowHov : C.shadow, transition: 'all 0.28s cubic-bezier(0.22,1,0.36,1)', transform: hovered ? 'translateY(-3px)' : 'none', position: 'relative' }}>
      {isTop && <div style={{ height: 3, background: `linear-gradient(90deg, ${C.blue}, ${C.teal})` }} />}

      <div style={{ padding: '18px 22px', display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
        {/* Rank */}
        <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, marginTop: 18, background: isTop ? C.blueDim : C.surfaceDeep, border: `1px solid ${isTop ? `${C.blue}35` : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: isTop ? C.blue : C.textFaint, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          {isTop ? '★' : rank}
        </div>

        {/* Avatar */}
        <div style={{ width: 46, height: 46, borderRadius: 13, flexShrink: 0, background: `${aColor}12`, border: `1.5px solid ${aColor}28`, color: aColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, fontFamily: "'DM Sans', system-ui, sans-serif", boxShadow: hovered ? `0 0 18px ${aColor}28` : 'none', transition: 'box-shadow 0.25s' }}>
          {initials}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.text, letterSpacing: '-0.2px', fontFamily: "'Fraunces', Georgia, serif" }}>{name}</span>
            <StatusBadge status={status} />
            {app.sourcing_rank != null && <SourcingBadge rank={app.sourcing_rank} />}
            {isTop && <span style={{ padding: '2px 9px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: C.blueDim, color: C.blue, border: `1px solid ${C.blue}22`, fontFamily: "'DM Sans', system-ui, sans-serif" }}>TOP {rank}</span>}
          </div>

          {app.fit_summary && <p style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.7, margin: '0 0 10px', maxWidth: 480, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{app.fit_summary}</p>}

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 9 }}>
            {app.candidate?.email && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: C.textMuted, fontWeight: 500, fontFamily: "'DM Sans', system-ui, sans-serif" }}><Mail size={10} style={{ color: C.textFaint }} />{app.candidate.email}</span>}
            {app.candidate?.location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: C.textMuted, fontWeight: 500, fontFamily: "'DM Sans', system-ui, sans-serif" }}><MapPin size={10} style={{ color: C.textFaint }} />{app.candidate.location}</span>}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: C.textMuted, fontWeight: 500, fontFamily: "'DM Sans', system-ui, sans-serif" }}><Calendar size={10} style={{ color: C.textFaint }} />{fmt(app.created_at)}</span>
          </div>

          {skills.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 11 }}>
              {skills.slice(0, 5).map((s, i) => <span key={i} style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: C.blueDim, color: C.blue, border: `1px solid ${C.blue}20`, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{s}</span>)}
              {skills.length > 5 && <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: C.surfaceDeep, color: C.textFaint, fontFamily: "'DM Sans', system-ui, sans-serif" }}>+{skills.length - 5}</span>}
            </div>
          )}

          {/* Score bars — recruiter only */}
          {hasScore && (
            <div style={{ display: 'flex', gap: 14, maxWidth: 380 }}>
              <ScoreBar value={app.semantic_score ?? 0} label="Semantic" color={C.blue} />
              <ScoreBar value={app.rule_score ?? 0}     label="Rule"     color={C.teal} />
            </div>
          )}
        </div>

        {/* Score ring + actions */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0, marginLeft: 'auto' }}>
          {hasScore ? <ScoreRing score={app.final_score!} /> : <PendingScore />}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {(status === 'applied' || status === 'scored') && (
              <>
                <ActionBtn onClick={() => act('shortlisted')} disabled={isLoading} bg={C.gradBlue} color={C.white} shadow={C.shadowBlue}>
                  {localLoading === 'shortlisted' ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Star size={11} fill="currentColor" />} Shortlist
                </ActionBtn>
                <ActionBtn onClick={() => act('rejected')} disabled={isLoading} bg={C.dangerDim} color={C.danger} border={C.dangerBorder}>
                  {localLoading === 'rejected' ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <XCircle size={11} />} Reject
                </ActionBtn>
              </>
            )}
            {status === 'shortlisted' && (
              <>
                <ActionBtn onClick={() => act('hired')} disabled={isLoading} bg={`linear-gradient(135deg, ${C.indigo}, ${C.indigoLight})`} color={C.white} shadow="0 4px 16px rgba(155,109,255,0.32)">
                  {localLoading === 'hired' ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <UserCheck size={11} />} Hire
                </ActionBtn>
                <ActionBtn onClick={() => act('rejected')} disabled={isLoading} bg={C.dangerDim} color={C.danger} border={C.dangerBorder}>
                  {localLoading === 'rejected' ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <UserX size={11} />} Pass
                </ActionBtn>
              </>
            )}
            {status === 'rejected' && (
              <ActionBtn onClick={() => act('applied')} disabled={isLoading} bg={C.amberDim} color={C.amber} border={C.amberBorder}>
                {localLoading === 'applied' ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={11} />} Reconsider
              </ActionBtn>
            )}
            {status === 'hired' && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 13px', borderRadius: 9, background: C.indigoDim, border: `1px solid ${C.indigo}35`, color: C.indigo, fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                <CheckCircle size={11} /> Hired
              </span>
            )}
            {app.source_url && (
              <a href={app.source_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 11px', borderRadius: 9, border: `1px solid ${C.border}`, background: C.white, color: C.textMuted, fontSize: 12, fontWeight: 600, textDecoration: 'none', transition: 'all 0.15s', fontFamily: "'DM Sans', system-ui, sans-serif", boxShadow: C.shadow }}
                onMouseEnter={e => { const a = e.currentTarget as HTMLAnchorElement; a.style.borderColor = C.borderFocus; a.style.color = C.blue; }}
                onMouseLeave={e => { const a = e.currentTarget as HTMLAnchorElement; a.style.borderColor = C.border; a.style.color = C.textMuted; }}>
                <ExternalLink size={10} /> Profile
              </a>
            )}
            <button onClick={() => setExpanded(v => !v)} style={{ width: 32, height: 32, borderRadius: 9, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${C.border}`, background: C.white, color: C.textMuted, cursor: 'pointer', transition: 'all 0.15s', boxShadow: C.shadow }}
              onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = C.borderHov; b.style.color = C.blue; b.style.boxShadow = C.shadowBlue; }}
              onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = C.border; b.style.color = C.textMuted; b.style.boxShadow = C.shadow; }}>
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px 22px 18px', background: C.surface, display: 'flex', gap: 28, flexWrap: 'wrap', animationName: 'fadeUp', animationDuration: '0.2s', animationTimingFunction: 'cubic-bezier(0.22,1,0.36,1)', animationFillMode: 'both' }}>
          {[
            { label: 'Candidate ID',  value: `#${app.candidate_id}` },
            { label: 'Final score',   value: hasScore ? `${Math.round(app.final_score!)}%` : 'Pending' },
            { label: 'Sourcing rank', value: app.sourcing_rank != null ? `#${app.sourcing_rank}` : 'Not sourced' },
            { label: 'Source',        value: app.source_tag ?? 'Direct apply' },
            { label: 'Applied',       value: fmt(app.created_at) },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 10, color: C.textFaint, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 3, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{label}</div>
              <div style={{ fontSize: 14, color: C.text, fontWeight: 800, fontFamily: "'Fraunces', Georgia, serif" }}>{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */
const ApplicationsPage: React.FC = () => {
  const { user } = useSelector((s: RootState) => s.auth);
  const { jobs, loading: loadingJobs } = useJobs();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  useEffect(() => { if (jobs.length > 0 && !selectedJob) setSelectedJob(jobs[0]); }, [jobs]);

  const { apps, loading, refresh, updateLocalStatus } = useRecruiterApplications(selectedJob?.id ?? null);
  const { statusLoading, updateStatus } = useApplicationStatus(updateLocalStatus);
  const filter = useRecruiterFilter(apps);

  const handleJobSelect = (j: Job | null) => { setSelectedJob(j); filter.clearFilters(); };

  if (user?.role !== 'recruiter') return (
    <div style={{ maxWidth: 400, margin: '80px auto', textAlign: 'center', fontFamily: "'DM Sans', system-ui, sans-serif", padding: 24 }}>
      <Card style={{ padding: 48 }}>
        <AlertCircle size={36} style={{ color: C.danger, display: 'block', margin: '0 auto 14px' }} />
        <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: '0 0 6px', fontFamily: "'Fraunces', Georgia, serif" }}>Access Restricted</p>
        <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>This page is for recruiters only.</p>
      </Card>
    </div>
  );

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", minHeight: '100vh', background: C.bg, padding: 24, position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=Fraunces:opsz,wght@9..144,600;9..144,700;9..144,800&display=swap');
        @keyframes fadeUp    { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dropIn    { from{opacity:0;transform:translateY(-8px) scale(0.97)} to{opacity:1;transform:none} }
        @keyframes spin      { to{transform:rotate(360deg)} }
        @keyframes orbFloat1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-40px,30px)} }
        @keyframes orbFloat2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(50px,-35px)} }
        @keyframes orbFloat3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-25px,20px)} }
        @keyframes pulseGlow { 0%,100%{opacity:1} 50%{opacity:0.35} }
        *{box-sizing:border-box} ::selection{background:rgba(79,125,255,0.18);color:#0d1b3e}
        input::placeholder{color:#8fa3c8;font-weight:400} input:focus{outline:none}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:rgba(79,125,255,0.18);border-radius:99px}
        .rapp-stat-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:10px}
        @media(max-width:1100px){.rapp-stat-grid{grid-template-columns:repeat(4,1fr)}}
        @media(max-width:640px){.rapp-stat-grid{grid-template-columns:repeat(2,1fr)}}
      `}</style>
      <BgPattern />

      {/* Header */}
      <div style={{ marginBottom: 26, position: 'relative', zIndex: 2, animationName: 'fadeUp', animationDuration: '0.5s', animationTimingFunction: 'cubic-bezier(0.22,1,0.36,1)', animationFillMode: 'both' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 50, height: 50, borderRadius: 15, background: C.gradBlue, boxShadow: C.shadowBlue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={22} color={C.white} />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, letterSpacing: '-0.6px', margin: 0, lineHeight: 1.1, fontFamily: "'Fraunces', Georgia, serif" }}>Applications</h1>
              <p style={{ fontSize: 13, color: C.textMuted, fontWeight: 500, margin: '3px 0 0' }}>{selectedJob ? `Reviewing candidates for ${selectedJob.title}` : 'Select a job to review applications'}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 99, background: C.tealDim, border: `1px solid ${C.tealBorder}`, fontSize: 12, fontWeight: 700, color: C.teal }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.teal, animation: 'pulseGlow 2s ease infinite', display: 'inline-block' }} /> Pipeline Active
            </span>
            <JobSelector jobs={jobs} selected={selectedJob} loading={loadingJobs} onSelect={handleJobSelect} />
          </div>
        </div>
        {parseSkills(selectedJob?.skills_required).length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 12 }}>
            <span style={{ fontSize: 11, color: C.textFaint, fontWeight: 600, alignSelf: 'center' }}>Required:</span>
            {parseSkills(selectedJob?.skills_required).map((s, i) => (
              <span key={i} style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: C.surfaceDeep, color: C.textMuted, border: `1px solid ${C.border}`, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{s}</span>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      {selectedJob && apps.length > 0 && (
        <div className="rapp-stat-grid" style={{ marginBottom: 20, position: 'relative', zIndex: 2 }}>
          <StatCard label="Total"       value={filter.stats.total}                                  color={C.blue}   icon={<Users size={14}/>}     delay={0}    />
          <StatCard label="Scored"      value={filter.stats.scored}                                 color={C.blue}   icon={<BarChart3 size={14}/>} delay={0.04} />
          <StatCard label="Sourced"     value={filter.stats.sourced}                                color={C.indigo} icon={<Layers size={14}/>}    delay={0.08} />
          <StatCard label="Shortlisted" value={filter.stats.shortlisted}                            color={C.teal}   icon={<Star size={14}/>}      delay={0.12} />
          <StatCard label="Hired"       value={filter.stats.hired}                                  color={C.indigo} icon={<UserCheck size={14}/>} delay={0.16} />
          <StatCard label="Rejected"    value={filter.stats.rejected}                               color={C.danger} icon={<XCircle size={14}/>}   delay={0.20} />
          <StatCard label="Avg score"   value={filter.stats.scored ? `${filter.stats.avg}%` : '—'} color={C.teal}   icon={<Award size={14}/>}     delay={0.24} />
        </div>
      )}

      {/* Filter bar */}
      {selectedJob && (
        <Card style={{ padding: '12px 14px', marginBottom: 14 }} delay={0.1}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: C.textFaint }} />
              <input value={filter.search} onChange={e => filter.setSearch(e.target.value)} placeholder="Search name, email, skills…"
                style={{ width: '100%', padding: '8px 32px 8px 33px', border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 13, color: C.text, background: C.surface, fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 500, transition: 'border-color 0.15s' }}
                onFocus={e => { e.target.style.borderColor = C.borderFocus; (e.target as HTMLInputElement).style.boxShadow = `0 0 0 3px ${C.blue}14`; }}
                onBlur={e  => { e.target.style.borderColor = C.border; (e.target as HTMLInputElement).style.boxShadow = 'none'; }} />
              {filter.search && <button onClick={() => filter.setSearch('')} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.textFaint, padding: 0, display: 'flex' }}><X size={13} /></button>}
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
              <Filter size={12} style={{ color: C.textFaint, flexShrink: 0 }} />
              {(['all', 'applied', 'scored', 'shortlisted', 'rejected', 'hired'] as const).map(s => {
                const active = filter.statusFilter === s;
                const meta = s === 'all' ? null : STATUS_META[s];
                return (
                  <button key={s} onClick={() => filter.setStatus(s)} style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${active ? (meta?.border ?? `${C.blue}40`) : C.border}`, background: active ? (meta?.bg ?? C.blueDim) : C.white, color: active ? (meta?.color ?? C.blue) : C.textMuted, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", transition: 'all .15s', boxShadow: active ? `0 0 10px ${meta?.color ?? C.blue}18` : 'none' }}
                    onMouseEnter={e => { if (!active) { const b = e.currentTarget as HTMLButtonElement; b.style.background = C.blueDim; b.style.borderColor = `${C.blue}35`; } }}
                    onMouseLeave={e => { if (!active) { const b = e.currentTarget as HTMLButtonElement; b.style.background = C.white; b.style.borderColor = C.border; } }}>
                    {s === 'all' ? 'All' : STATUS_META[s as AppStatus].label}
                    {s !== 'all' && <span style={{ marginLeft: 5, fontSize: 10, opacity: .65 }}>{apps.filter(a => a.status === s).length}</span>}
                  </button>
                );
              })}
            </div>
            <button onClick={refresh} disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 9, border: `1px solid ${C.border}`, background: C.white, color: C.textMuted, fontSize: 12, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", transition: 'all 0.15s', boxShadow: C.shadow }}
              onMouseEnter={e => { if (!loading) { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = C.borderFocus; b.style.color = C.blue; } }}
              onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = C.border; b.style.color = C.textMuted; }}>
              <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
            </button>
          </div>
        </Card>
      )}

      {filter.filtered.length > 0 && !loading && (
        <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, marginBottom: 10, padding: '0 2px', position: 'relative', zIndex: 2, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          Showing <strong style={{ color: C.text }}>{filter.filtered.length}</strong> application{filter.filtered.length !== 1 ? 's' : ''}
          {filter.statusFilter !== 'all' && ` · ${STATUS_META[filter.statusFilter as AppStatus]?.label}`}
          {filter.search && ` · "${filter.search}"`}
        </div>
      )}

      {/* List */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        {!selectedJob ? (
          <Card style={{ padding: '80px 32px', textAlign: 'center' }}>
            <div style={{ width: 68, height: 68, borderRadius: '50%', margin: '0 auto 16px', background: C.surfaceDeep, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Briefcase size={28} style={{ color: C.textFaint }} /></div>
            <p style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 6px', fontFamily: "'Fraunces', Georgia, serif" }}>Select a job</p>
            <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>Choose a position above to review its applications.</p>
          </Card>
        ) : loading ? (
          <Card style={{ padding: '60px 0', textAlign: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', margin: '0 auto 14px', border: `2.5px solid ${C.blueDim}`, borderTop: `2.5px solid ${C.blue}`, animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: 13, color: C.textMuted, fontWeight: 500, margin: 0 }}>Loading applications…</p>
          </Card>
        ) : filter.filtered.length === 0 ? (
          <Card style={{ padding: '60px 32px', textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', margin: '0 auto 14px', background: C.surfaceDeep, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={24} style={{ color: C.textFaint }} /></div>
            <p style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 6px', fontFamily: "'Fraunces', Georgia, serif" }}>{apps.length === 0 ? 'No applications yet' : 'No matches found'}</p>
            <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>{apps.length === 0 ? 'Candidates will appear here once they apply or sourcing runs.' : 'Try adjusting your search or filter.'}</p>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filter.filtered.map((app, i) => (
              <div key={app.id} style={{ animationName: 'fadeUp', animationDuration: '0.5s', animationTimingFunction: 'cubic-bezier(0.22,1,0.36,1)', animationDelay: `${i * 0.05}s`, animationFillMode: 'both' }}>
                <CandidateCard app={app} rank={i + 1} onStatus={updateStatus} statusLoading={statusLoading} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationsPage;