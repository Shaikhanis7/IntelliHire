// features/jobs/components/JobCard.tsx
// Design: mirrors SourcingPage exactly — #f0f5ff bg, blue/teal/indigo/amber
// Fonts: Fraunces (headings) + DM Sans (body)

import React, { useState } from 'react';
import {
  MapPin, Briefcase, Calendar, Star, Eye,
  Edit3, Trash2, ToggleLeft, ToggleRight,
  Zap, CheckCircle, Clock,
} from 'lucide-react';
import { formatDate } from '../../../utils/helpers';
import type { Job } from '../types/job.types';

/* ─── Design tokens — exact SourcingPage match ───────────────────────────────── */
const C = {
  bg:           '#f0f5ff',
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
  gradBlue:     'linear-gradient(135deg, #2a4fff 0%, #4f7dff 50%, #6b93ff 100%)',
  teal:         '#06d6b0',
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
  shadowDanger: '0 4px 14px rgba(239,68,68,0.22)',
};

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
const parseSkills = (s: string | string[] | null | undefined): string[] => {
  if (!s) return [];
  if (Array.isArray(s)) return s;
  return s.split(',').map(x => x.trim()).filter(Boolean);
};

const accentPalette = [C.blue, C.indigo, C.teal, C.amber, C.blueLight];
const getAccent = (id: number) => accentPalette[id % accentPalette.length];

/* ─── StatusBadge ────────────────────────────────────────────────────────────── */
const StatusBadge: React.FC<{ active: boolean }> = ({ active }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '3px 10px', borderRadius: 99,
    background: active ? C.tealDim : C.surfaceDeep,
    color: active ? C.teal : C.textFaint,
    border: `1px solid ${active ? C.tealBorder : C.border}`,
    fontSize: 10.5, fontWeight: 700, letterSpacing: 0.2,
    fontFamily: "'DM Sans', system-ui, sans-serif",
  }}>
    <span style={{ width: 5, height: 5, borderRadius: '50%', background: active ? C.teal : C.textFaint, flexShrink: 0 }} />
    {active ? 'Active' : 'Closed'}
  </span>
);

/* ─── SkillPill ──────────────────────────────────────────────────────────────── */
const SkillPill: React.FC<{ skill: string }> = ({ skill }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center',
    padding: '2px 9px', borderRadius: 99,
    fontSize: 10.5, fontWeight: 600,
    background: C.blueDim, color: C.blue,
    border: `1px solid ${C.blue}20`,
    fontFamily: "'DM Sans', system-ui, sans-serif",
  }}>
    {skill}
  </span>
);

/* ─── IconBtn ────────────────────────────────────────────────────────────────── */
const IconBtn: React.FC<{
  icon: React.ReactNode; title: string; onClick: () => void;
  hoverColor: string; hoverBg: string; hoverBorder: string;
}> = ({ icon, title, onClick, hoverColor, hoverBg, hoverBorder }) => {
  const [hov, setHov] = useState(false);
  return (
    <button
      title={title}
      onClick={e => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
        border: `1px solid ${hov ? hoverBorder : C.border}`,
        background: hov ? hoverBg : C.white,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        color: hov ? hoverColor : C.textMuted,
        transition: 'all 0.18s cubic-bezier(0.22,1,0.36,1)',
        boxShadow: hov ? `0 4px 14px ${hoverColor}22` : 'none',
      }}
    >
      {icon}
    </button>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   JobCard
═══════════════════════════════════════════════════════════════════════════════ */
export interface JobCardProps {
  job:          Job;
  index?:       number;
  onEdit?:      (job: Job)    => void;
  onDelete?:    (jobId: number) => void;
  onView?:      (job: Job)    => void;
  onToggle?:    (jobId: number, current: boolean) => void;
  showActions?: boolean;
  /** 'recruiter' shows edit/delete/toggle; 'candidate' shows apply/view only */
  role?:        'recruiter' | 'candidate';
  applied?:     boolean;
  applying?:    boolean;
  onApply?:     (jobId: number) => void;
}

export const JobCard: React.FC<JobCardProps> = ({
  job, index = 0,
  onEdit, onDelete, onView, onToggle,
  showActions = true,
  role = 'recruiter',
  applied = false, applying = false, onApply,
}) => {
  const [hov, setHov] = useState(false);
  const skills  = parseSkills(job.skills_required);
  const accent  = getAccent(job.id);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? C.white : 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(20px) saturate(1.5)',
        border: `1px solid ${hov ? C.borderHov : C.border}`,
        borderRadius: 18, overflow: 'hidden',
        boxShadow: hov ? C.shadowHov : C.shadow,
        transition: 'all 0.28s cubic-bezier(0.22,1,0.36,1)',
        transform: hov ? 'translateY(-3px)' : 'none',
        animationName: 'jFadeUp', animationDuration: '0.5s',
        animationTimingFunction: 'cubic-bezier(0.22,1,0.36,1)',
        animationDelay: `${index * 0.06}s`, animationFillMode: 'both',
        position: 'relative',
      }}
    >
      {/* Top accent bar */}
      <div style={{
        height: 3,
        background: job.is_active
          ? `linear-gradient(90deg, ${accent}, ${C.teal})`
          : `linear-gradient(90deg, ${C.textFaint}40, transparent)`,
        opacity: hov || job.is_active ? 1 : 0.5,
        transition: 'opacity 0.25s',
      }} />

      {/* Hover glow */}
      {hov && (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: 260, height: 260,
          background: `radial-gradient(circle, ${accent}07 0%, transparent 70%)`,
          pointerEvents: 'none', zIndex: 0,
        }} />
      )}

      <div style={{ padding: '18px 22px', position: 'relative', zIndex: 1 }}>
        {/* ── Header row ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
          {/* Icon */}
          <div style={{
            width: 46, height: 46, borderRadius: 13, flexShrink: 0,
            background: `${accent}12`, border: `1.5px solid ${accent}28`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: hov ? `0 0 18px ${accent}28` : 'none', transition: 'box-shadow 0.25s',
          }}>
            <Briefcase size={19} style={{ color: accent }} strokeWidth={1.8} />
          </div>

          {/* Title + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
              <h3 style={{
                fontSize: 15.5, fontWeight: 700,
                color: C.text, margin: 0,
                letterSpacing: '-0.3px', lineHeight: 1.2,
                fontFamily: "'Fraunces', Georgia, serif",
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                maxWidth: 280,
              }}>
                {job.title}
              </h3>
              <StatusBadge active={job.is_active} />
              <span style={{
                padding: '1px 7px', borderRadius: 6,
                background: C.surfaceDeep, color: C.textFaint,
                fontSize: 10, fontWeight: 700,
                fontFamily: "'DM Sans', system-ui, sans-serif",
              }}>
                #{job.id}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              {job.location && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: C.textMuted, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                  <MapPin size={10} style={{ color: C.textFaint }} /> {job.location}
                </span>
              )}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: C.textMuted, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                <Briefcase size={10} style={{ color: C.textFaint }} /> {job.experience_required}+ yrs
              </span>
              {job.created_at && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: C.textMuted, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                  <Calendar size={10} style={{ color: C.textFaint }} /> {formatDate(job.created_at)}
                </span>
              )}
            </div>
          </div>

          {/* Recruiter action buttons */}
          {showActions && role === 'recruiter' && (
            <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
              <IconBtn icon={<Eye size={13} />}          title="View"
                onClick={() => onView?.(job)}
                hoverColor={C.blue}   hoverBg={C.blueDim}   hoverBorder={`${C.blue}40`} />
              <IconBtn icon={<Edit3 size={13} />}        title="Edit"
                onClick={() => onEdit?.(job)}
                hoverColor={C.amber}  hoverBg={C.amberDim}  hoverBorder={C.amberBorder} />
              <IconBtn
                icon={job.is_active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                title={job.is_active ? 'Close job' : 'Reopen job'}
                onClick={() => onToggle?.(job.id, job.is_active)}
                hoverColor={C.teal}   hoverBg={C.tealDim}   hoverBorder={C.tealBorder} />
              <IconBtn icon={<Trash2 size={13} />}       title="Delete"
                onClick={() => { if (confirm(`Delete "${job.title}"?`)) onDelete?.(job.id); }}
                hoverColor={C.danger} hoverBg={C.dangerDim} hoverBorder={C.dangerBorder} />
            </div>
          )}
        </div>

        {/* ── Description ── */}
        {job.description && (
          <p style={{
            fontSize: 13, color: C.textMuted, lineHeight: 1.7,
            margin: '0 0 12px',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            fontFamily: "'DM Sans', system-ui, sans-serif",
          }}>
            {job.description}
          </p>
        )}

        {/* ── Skills ── */}
        {skills.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
            {skills.slice(0, 6).map(s => <SkillPill key={s} skill={s} />)}
            {skills.length > 6 && (
              <span style={{
                padding: '2px 9px', borderRadius: 99, fontSize: 10.5, fontWeight: 600,
                background: C.surfaceDeep, color: C.textFaint,
                border: `1px solid ${C.border}`,
                fontFamily: "'DM Sans', system-ui, sans-serif",
              }}>
                +{skills.length - 6} more
              </span>
            )}
          </div>
        )}

        {/* ── Candidate actions ── */}
        {showActions && role === 'candidate' && job.is_active && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => onView?.(job)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 9,
                border: `1px solid ${C.border}`, background: C.white,
                fontSize: 12, fontWeight: 600, color: C.textMuted,
                cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif",
                transition: 'all 0.16s',
              }}
              onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = C.borderFocus; b.style.color = C.blue; b.style.background = C.blueDim; }}
              onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = C.border; b.style.color = C.textMuted; b.style.background = C.white; }}
            >
              <Eye size={12} /> View details
            </button>

            {applied ? (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 9,
                background: C.tealDim, color: C.teal,
                border: `1px solid ${C.tealBorder}`,
                fontSize: 12, fontWeight: 700,
                fontFamily: "'DM Sans', system-ui, sans-serif",
              }}>
                <CheckCircle size={12} /> Applied
              </span>
            ) : (
              <button
                onClick={() => onApply?.(job.id)}
                disabled={applying}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '7px 18px', borderRadius: 9,
                  background: applying
                    ? C.surfaceDeep
                    : `linear-gradient(135deg, ${C.blueDark}, ${C.blue})`,
                  border: `1px solid ${applying ? C.border : 'transparent'}`,
                  color: applying ? C.textFaint : C.white,
                  fontSize: 12, fontWeight: 700,
                  cursor: applying ? 'not-allowed' : 'pointer',
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  boxShadow: applying ? 'none' : C.shadowBlue,
                  transition: 'all 0.18s',
                }}
              >
                <Zap size={12} /> {applying ? 'Checking…' : 'Quick Apply'}
              </button>
            )}
          </div>
        )}

        {/* Closed badge for candidate */}
        {showActions && role === 'candidate' && !job.is_active && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '6px 12px', borderRadius: 9,
            background: C.surfaceDeep, color: C.textFaint,
            border: `1px solid ${C.border}`,
            fontSize: 12, fontWeight: 600,
            fontFamily: "'DM Sans', system-ui, sans-serif",
          }}>
            <Clock size={11} /> Position Closed
          </span>
        )}
      </div>
    </div>
  );
};