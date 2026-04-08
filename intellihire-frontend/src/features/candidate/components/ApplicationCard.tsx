import React, { useState } from 'react';
import {
  Briefcase, MapPin, ChevronDown, ChevronUp,
  Clock, CheckCircle, Star, Award, XCircle, BarChart3,
  ExternalLink, TrendingUp,
} from 'lucide-react';
import type { AppStatus, MyApplication } from '../services/candidate.service';


/* ─── Design tokens (matches parent theme) ───────────────────────────────────── */
const T = {
  primary:       '#1a56db',
  primaryLight:  '#eff6ff',
  primaryMid:    '#dbeafe',
  success:       '#059669',
  successLight:  '#ecfdf5',
  warning:       '#d97706',
  warningLight:  '#fffbeb',
  danger:        '#dc2626',
  dangerLight:   '#fef2f2',
  purple:        '#7c3aed',
  purpleLight:   '#f5f3ff',
  gray50:        '#f8fafc',
  gray100:       '#f1f5f9',
  gray200:       '#e2e8f0',
  gray500:       '#64748b',
  gray700:       '#334155',
  gray900:       '#0f172a',
  white:         '#ffffff',
  border:        '#e2e8f0',
  borderFocus:   '#93c5fd',
  shadowSm:      '0 1px 3px rgba(0,0,0,0.06)',
  shadowMd:      '0 4px 12px rgba(0,0,0,0.07)',
};

/* ─── Status config ──────────────────────────────────────────────────────────── */
const STATUS_CFG: Record<AppStatus, {
  label: string; color: string; bg: string;
  icon: React.ReactNode; border: string;
}> = {
  pending:     { label: 'Under review',  color: T.warning,  bg: T.warningLight,  border: `${T.warning}30`,  icon: <Clock size={11} strokeWidth={2.5}/> },
  scored:      { label: 'Scored',        color: T.primary,  bg: T.primaryLight,  border: `${T.primary}30`,  icon: <BarChart3 size={11} strokeWidth={2.5}/> },
  shortlisted: { label: 'Shortlisted',   color: T.purple,   bg: T.purpleLight,   border: `${T.purple}30`,   icon: <Star size={11} strokeWidth={2.5} fill="currentColor"/> },
  selected:    { label: 'Selected! 🎉',  color: T.success,  bg: T.successLight,  border: `${T.success}30`,  icon: <Award size={11} strokeWidth={2.5}/> },
  rejected:    { label: 'Not selected',  color: T.danger,   bg: T.dangerLight,   border: `${T.danger}30`,   icon: <XCircle size={11} strokeWidth={2.5}/> },
};

/* ─── Default status config for unknown statuses ─────────────────────────────── */
const DEFAULT_STATUS_CFG = {
  label: 'Unknown',
  color: T.gray500,
  bg: T.gray100,
  border: `${T.gray500}30`,
  icon: <Clock size={11} strokeWidth={2.5}/>,
};

/* ─── Helper function to safely get status config ────────────────────────────── */
const getStatusConfig = (status: AppStatus) => {
  return STATUS_CFG[status] || DEFAULT_STATUS_CFG;
};

/* ─── Score mini-bar ─────────────────────────────────────────────────────────── */
const MiniBar: React.FC<{ value: number; color: string; label: string }> = ({ value, color, label }) => (
  <div style={{ flex: 1 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.gray500, marginBottom: 3, fontWeight: 600 }}>
      <span>{label}</span><span>{Math.round(value * 100)}%</span>
    </div>
    <div style={{ height: 3, background: T.gray100, borderRadius: 99, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.round(value * 100)}%`, background: color, borderRadius: 99, transition: 'width 0.7s ease' }} />
    </div>
  </div>
);

/* ─── Score badge ────────────────────────────────────────────────────────────── */
const ScoreBadge: React.FC<{ score: number }> = ({ score }) => {
  const pct   = Math.round(score * 100);
  const color = pct >= 80 ? T.success : pct >= 60 ? T.warning : T.danger;
  const bg    = pct >= 80 ? T.successLight : pct >= 60 ? T.warningLight : T.dangerLight;
  return (
    <div style={{
      width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
      background: bg, border: `2px solid ${color}30`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: 14, fontWeight: 800, color, lineHeight: 1 }}>{pct}</span>
      <span style={{ fontSize: 8, color: `${color}80`, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase', marginTop: 1 }}>score</span>
    </div>
  );
};

/* ─── Format date ────────────────────────────────────────────────────────────── */
const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/* ─── Main component ─────────────────────────────────────────────────────────── */
export const ApplicationCard: React.FC<{
  app:   MyApplication;
  index: number;
}> = ({ app, index }) => {
  const [expanded, setExpanded] = useState(false);
  const [hov, setHov]           = useState(false);

  // Safely get status config with fallback
  const cfg = getStatusConfig(app.status);
  const hasScore = app.score != null;
  const skills   = (app.job?.skills_required ?? '')
    .split(',').map((s: string) => s.trim()).filter(Boolean).slice(0, 4);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: T.white,
        border: `1px solid ${hov ? T.borderFocus : T.border}`,
        borderRadius: 14, overflow: 'hidden',
        boxShadow: hov ? T.shadowMd : T.shadowSm,
        transition: 'all 0.22s ease',
        transform: hov ? 'translateY(-2px)' : 'none',
        animation: `fadeUp 0.4s ease ${index * 0.07}s both`,
      }}
    >
      {/* Status top bar */}
      <div style={{ height: 3, background: cfg.color, opacity: 0.7 }} />

      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* Job icon */}
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: T.primaryLight, border: `1.5px solid ${T.primary}20`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Briefcase size={19} color={T.primary} strokeWidth={1.8} />
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: T.gray900, letterSpacing: '-0.2px' }}>
                {app.job?.title ?? `Job #${app.job_id}`}
              </span>

              {/* Status badge */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 9px', borderRadius: 99,
                background: cfg.bg, color: cfg.color,
                fontSize: 11, fontWeight: 600,
                border: `1px solid ${cfg.border}`,
              }}>
                {cfg.icon} {cfg.label}
              </span>
            </div>

            {/* Meta */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 8 }}>
              {app.job?.location && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: T.gray500, fontWeight: 500 }}>
                  <MapPin size={11} /> {app.job.location}
                </span>
              )}
              {app.job?.experience_required != null && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: T.gray500, fontWeight: 500 }}>
                  <TrendingUp size={11} /> {app.job.experience_required}y+ exp required
                </span>
              )}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: T.gray500, fontWeight: 500 }}>
                <Clock size={11} /> Applied {fmtDate(app.applied_at)}
              </span>
            </div>

            {/* Skill chips */}
            {skills.length > 0 && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {skills.map((s: string, i: React.Key | null | undefined) => (
                  <span key={i} style={{
                    padding: '2px 8px', borderRadius: 99, fontSize: 10.5, fontWeight: 600,
                    background: T.primaryLight, color: T.primary, border: `1px solid ${T.primary}20`,
                  }}>{s}</span>
                ))}
              </div>
            )}
          </div>

          {/* Score + expand */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
            {hasScore && <ScoreBadge score={app.score!} />}
            <button
              onClick={() => setExpanded(e => !e)}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 30, height: 30, borderRadius: 8,
                border: `1px solid ${T.border}`,
                background: T.gray50, cursor: 'pointer', color: T.gray500,
                transition: 'all 0.16s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.gray100; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = T.gray50; }}
            >
              {expanded ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
            </button>
          </div>
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div style={{
            marginTop: 14, padding: '14px 16px', borderRadius: 10,
            background: T.gray50, border: `1px solid ${T.border}`,
            animation: 'fadeUp 0.18s ease both',
          }}>
            {/* Score breakdown */}
            {(app.semantic_score != null || app.rule_score != null) && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: T.gray500, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>
                  Score breakdown
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  {app.semantic_score != null && (
                    <MiniBar value={app.semantic_score} color={T.primary} label="Semantic" />
                  )}
                  {app.rule_score != null && (
                    <MiniBar value={app.rule_score} color={T.success} label="Rule-based" />
                  )}
                </div>
              </div>
            )}

            {/* Details grid */}
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {[
                { label: 'Application ID', val: `#${app.id}`              },
                { label: 'Job ID',         val: `#${app.job_id}`           },
                { label: 'Status',         val: cfg.label                  },
                { label: 'Applied',        val: fmtDate(app.applied_at)   },
              ].map(({ label, val }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: T.gray500, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 13.5, color: T.gray900, fontWeight: 700 }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationCard;