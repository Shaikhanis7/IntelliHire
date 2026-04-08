// features/dashboard/components/candidate/CandidateComponents.tsx
// Light frosted-glass — Fraunces + DM Sans

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase, Star, Award, BarChart3,
  ChevronRight, Sparkles, ArrowRight, FileText,
} from 'lucide-react';
import {
  C, F, Card, SectionHeader, FilterPill, ProgressRow,
  LoadingSpinner, EmptyState,
} from '../shared/DashboardShared';
import ApplicationCard from '../../../candidate/components/ApplicationCard';
import type { CandidateProfile, MyApplication, ApplicationStats } from '../../types/dashboard.types';

/* ═══════════════════════════════════════════════════════════════════════════
   STAT CARD — candidate variant (gradient top bar, large number)
═══════════════════════════════════════════════════════════════════════════ */
export const CandidateStatCard: React.FC<{
  label:    string;
  value:    number;
  icon:     React.ReactNode;
  gradient: string;
  accent:   string;
  delay?:   number;
}> = ({ label, value, icon, gradient, accent, delay = 0 }) => (
  <div style={{
    background:'rgba(255,255,255,0.82)', backdropFilter:'blur(20px) saturate(1.5)',
    border:`1px solid ${C.border}`, borderRadius:16, padding:'20px 22px',
    cursor:'default', position:'relative', overflow:'hidden',
    boxShadow:C.shadow,
    animationName:'dbFadeUp', animationDuration:'0.5s',
    animationDelay:`${delay}s`, animationFillMode:'both',
    transition:'transform 0.25s, box-shadow 0.25s',
  }}
    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 36px ${accent}20`; }}
    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = C.shadow; }}
  >
    {/* Gradient top bar */}
    <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:gradient, opacity:0.85 }} />
    <div style={{
      width:38, height:38, borderRadius:11, marginBottom:14,
      background:`${accent}12`, border:`1px solid ${accent}28`,
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      <span style={{ color:accent, display:'flex' }}>{icon}</span>
    </div>
    <div style={{ fontSize:30, fontWeight:800, color:C.text, letterSpacing:'-1.5px', lineHeight:1, fontFamily:F.display }}>{value}</div>
    <div style={{ fontSize:12.5, color:C.textMuted, marginTop:5, fontWeight:500, fontFamily:F.body }}>{label}</div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   OVERVIEW PANEL (left column progress bars)
═══════════════════════════════════════════════════════════════════════════ */
export const OverviewPanel: React.FC<{
  stats: ApplicationStats;
  delay?: number;
}> = ({ stats, delay = 0 }) => (
  <Card delay={delay} style={{ padding:'20px 22px' }}>
    <SectionHeader icon={<BarChart3 size={13} />} title="Overview" accent={C.blue} />
    <ProgressRow label="Pending review" count={stats.pending}     total={stats.total} accent={C.amber}  />
    <ProgressRow label="Scored"         count={stats.scored}      total={stats.total} accent={C.blue}   />
    <ProgressRow label="Shortlisted"    count={stats.shortlisted} total={stats.total} accent={C.indigo} />
    <ProgressRow label="Selected"       count={stats.selected}    total={stats.total} accent={C.teal}   />
    <ProgressRow label="Not selected"   count={stats.rejected}    total={stats.total} accent={C.danger} />
  </Card>
);

/* ═══════════════════════════════════════════════════════════════════════════
   TIPS PANEL
═══════════════════════════════════════════════════════════════════════════ */
const TIPS = [
  'Upload a detailed resume with clear skill keywords',
  'Apply early — scoring runs automatically',
  'Keep your profile location & skills up to date',
];

export const TipsPanel: React.FC<{ delay?: number }> = ({ delay = 0 }) => (
  <div style={{
    borderRadius:16, padding:'20px 22px',
    background:`linear-gradient(135deg, ${C.blueDim}, ${C.indigoDim})`,
    border:`1px solid ${C.borderMid}`,
    backdropFilter:'blur(16px)',
    boxShadow:C.shadow,
    animationName:'dbFadeUp', animationDuration:'0.5s',
    animationDelay:`${delay}s`, animationFillMode:'both',
  }}>
    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:14 }}>
      <Sparkles size={13} color={C.blue} />
      <span style={{ fontSize:12.5, fontWeight:700, color:C.blue, fontFamily:F.body }}>Tips to stand out</span>
    </div>
    {TIPS.map((tip, i) => (
      <div key={i} style={{ display:'flex', gap:8, marginBottom: i < TIPS.length - 1 ? 10 : 0, fontSize:12.5, color:C.textMuted, lineHeight:1.6, fontFamily:F.body }}>
        <ChevronRight size={12} style={{ color:C.blue, flexShrink:0, marginTop:2 }} />
        {tip}
      </div>
    ))}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   APPLICATIONS LIST PANEL
═══════════════════════════════════════════════════════════════════════════ */
const FILTERS = [
  { key:'all',         label:'All'         },
  { key:'pending',     label:'Pending'     },
  { key:'scored',      label:'Scored'      },
  { key:'shortlisted', label:'Shortlisted' },
  { key:'selected',    label:'Selected'    },
  { key:'rejected',    label:'Rejected'    },
] as const;

export const ApplicationsList: React.FC<{
  applications: MyApplication[];
  stats:        ApplicationStats;
  statusFilter: string;
  onFilter:     (key: string) => void;
  delay?:       number;
}> = ({ applications, stats, statusFilter, onFilter, delay = 0 }) => {
  const navigate  = useNavigate();
  const filtered  = statusFilter === 'all'
    ? applications
    : applications.filter(a => a.status === statusFilter);

  const countFor = (key: string) => key === 'all' ? stats.total : stats[key as keyof typeof stats] ?? 0;

  return (
    <Card delay={delay} style={{ padding:'20px 22px' }}>
      <SectionHeader
        icon={<FileText size={13} />}
        title="My Applications"
        accent={C.blue}
        right={<span style={{ fontSize:12, color:C.textFaint, fontWeight:600, fontFamily:F.body }}>{applications.length} total</span>}
      />

      {/* Filter pills */}
      {applications.length > 0 && (
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:18 }}>
          {FILTERS.map(f => (
            <FilterPill
              key={f.key}
              label={f.label}
              count={countFor(f.key)}
              active={statusFilter === f.key}
              onClick={() => onFilter(f.key)}
            />
          ))}
        </div>
      )}

      {/* Content */}
      {applications.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={24} />}
          title="No applications yet"
          desc="Start exploring open positions and apply to roles that match your skills."
          color={C.blue}
          action={
            <button
              onClick={() => navigate('/jobs')}
              style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:10, background:C.gradBlue, border:'none', color:C.white, fontSize:13.5, fontWeight:700, cursor:'pointer', fontFamily:F.body, boxShadow:C.shadowBlue }}
            >
              Browse open jobs <ArrowRight size={14} />
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'28px 0', fontSize:13.5, color:C.textMuted, fontWeight:500, fontFamily:F.body }}>
          No applications with status "{statusFilter}"
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filtered.map((app, i) => (
            <div key={app.id} style={{ animationName:'dbFadeUp', animationDuration:'0.4s', animationDelay:`${i * 0.05}s`, animationFillMode:'both' }}>
              <ApplicationCard app={app} index={i} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   STAT STRIP — 3 summary cards row
═══════════════════════════════════════════════════════════════════════════ */
export const CandidateStatStrip: React.FC<{
  stats: ApplicationStats;
}> = ({ stats }) => (
  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
    <CandidateStatCard
      label="Total applied" value={stats.total}
      icon={<Briefcase size={14} />}
      gradient={`linear-gradient(135deg, #2a4fff, #4f7dff)`}
      accent={C.blue} delay={0}
    />
    <CandidateStatCard
      label="Shortlisted" value={stats.shortlisted}
      icon={<Star size={14} />}
      gradient={`linear-gradient(135deg, #7c3aed, #9b6dff)`}
      accent={C.indigo} delay={0.06}
    />
    <CandidateStatCard
      label="Selected" value={stats.selected}
      icon={<Award size={14} />}
      gradient={`linear-gradient(135deg, #06d6b0, #0891b2)`}
      accent={C.teal} delay={0.12}
    />
  </div>
);