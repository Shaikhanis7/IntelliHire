// features/dashboard/components/recruiter/RecruiterComponents.tsx
// Light frosted-glass — Fraunces + DM Sans

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase, Eye, Clock, MapPin,
  ChevronRight, Zap, ArrowUpRight,
  FileText, Star, Plus, Sparkles,
} from 'lucide-react';
import { C, F, Card, SectionHeader, LoadingSpinner, EmptyState } from '../shared/DashboardShared';
import { formatDate } from '../../../../utils/helpers';
import type { Job }  from '../../../jobs/types/job.types';
import type { RecruiterStats } from '../../types/dashboard.types';

/* ═══════════════════════════════════════════════════════════════════════════
   JOB ROW
═══════════════════════════════════════════════════════════════════════════ */
const PALETTE = [C.blue, C.indigo, C.teal, C.amber];

export const JobRow: React.FC<{
  job:     Job;
  index:   number;
  onClick: () => void;
}> = ({ job, index, onClick }) => {
  const [hov, setHov] = useState(false);
  const accent = PALETTE[job.id % PALETTE.length];

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      style={{
        padding:'12px 14px', borderRadius:11,
        border:`1px solid ${hov ? C.borderHov : C.border}`,
        background: hov ? C.blueDim : 'rgba(255,255,255,0.60)',
        backdropFilter:'blur(12px)',
        cursor:'pointer', transition:'all 0.18s ease',
        display:'flex', alignItems:'center', gap:12,
        animationName:'dbFadeUp', animationDuration:'0.45s',
        animationDelay:`${0.22 + index * 0.06}s`,
        animationFillMode:'both',
        position:'relative', overflow:'hidden',
      }}
    >
      {/* Active pip */}
      <div style={{
        position:'absolute', left:0, top:'20%', bottom:'20%', width:2.5,
        background: job.is_active ? C.teal : C.textFaint,
        borderRadius:'0 2px 2px 0',
        opacity: hov ? 1 : 0.5, transition:'opacity 0.2s',
      }} />

      <div style={{
        width:36, height:36, borderRadius:9, flexShrink:0,
        background:`${accent}12`, border:`1.5px solid ${accent}28`,
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow: hov ? `0 0 12px ${accent}25` : 'none', transition:'box-shadow 0.2s',
      }}>
        <Briefcase size={14} style={{ color:accent }} />
      </div>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontFamily:F.display }}>
          {job.title}
        </div>
        <div style={{ fontSize:11, color:C.textFaint, marginTop:2, display:'flex', alignItems:'center', gap:8, fontFamily:F.body }}>
          <span style={{ display:'flex', alignItems:'center', gap:3 }}>
            <Clock size={9} />{job.created_at ? formatDate(job.created_at) : 'Recently'}
          </span>
          {job.location && (
            <span style={{ display:'flex', alignItems:'center', gap:3 }}>
              <MapPin size={9} />{job.location}
            </span>
          )}
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:7, flexShrink:0 }}>
        <span style={{
          padding:'2px 9px', borderRadius:99, fontSize:10.5, fontWeight:700,
          background: job.is_active ? C.tealDim  : C.surfaceDeep,
          color:      job.is_active ? C.teal      : C.textFaint,
          border:    `1px solid ${job.is_active ? C.tealBorder : C.border}`,
          fontFamily:F.body,
        }}>
          {job.is_active ? 'Active' : 'Closed'}
        </span>
        <div style={{
          width:28, height:28, borderRadius:7,
          background: hov ? C.blueDim : C.surface,
          border:`1px solid ${hov ? C.borderHov : C.border}`,
          display:'flex', alignItems:'center', justifyContent:'center',
          transition:'all 0.18s',
        }}>
          <Eye size={11} style={{ color: hov ? C.blue : C.textFaint }} />
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   QUICK ACTION BUTTON
═══════════════════════════════════════════════════════════════════════════ */
export const QuickAction: React.FC<{
  icon:        React.ReactNode;
  label:       string;
  desc:        string;
  color:       string;
  onClick:     () => void;
  delay?:      number;
}> = ({ icon, label, desc, color, onClick, delay = 0 }) => {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width:'100%', textAlign:'left', cursor:'pointer',
        padding:'12px 14px', borderRadius:11,
        border:`1px solid ${hov ? color + '45' : C.border}`,
        background: hov ? `${color}09` : 'rgba(255,255,255,0.60)',
        backdropFilter:'blur(12px)',
        boxShadow: hov ? `0 4px 18px ${color}18` : 'none',
        transition:'all 0.2s ease',
        display:'flex', alignItems:'center', gap:12,
        fontFamily:F.body,
        animationName:'dbFadeUp', animationDuration:'0.45s',
        animationDelay:`${delay}s`, animationFillMode:'both',
      }}
    >
      <div style={{
        width:34, height:34, borderRadius:9, flexShrink:0,
        background: hov ? `${color}14` : C.surface,
        border:`1px solid ${hov ? color + '30' : C.border}`,
        display:'flex', alignItems:'center', justifyContent:'center',
        transition:'all 0.2s',
        boxShadow: hov ? `0 0 10px ${color}25` : 'none',
      }}>
        <span style={{ color: hov ? color : C.textFaint, display:'flex', transition:'color 0.2s' }}>{icon}</span>
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:700, color: hov ? C.text : C.textMid, transition:'color 0.2s', fontFamily:F.display }}>
          {label}
        </div>
        <div style={{ fontSize:11.5, color:C.textFaint, marginTop:1, fontFamily:F.body }}>{desc}</div>
      </div>
      <ChevronRight size={13} style={{ color: hov ? color : C.textFaint, transition:'all 0.2s', transform: hov ? 'translateX(2px)' : 'none', flexShrink:0 }} />
    </button>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   PIPELINE OVERVIEW
═══════════════════════════════════════════════════════════════════════════ */
export const PipelineOverview: React.FC<{
  stats: RecruiterStats;
  delay?: number;
}> = ({ stats, delay = 0 }) => (
  <Card delay={delay} style={{ padding:'18px 20px' }}>
    <div style={{ fontSize:11, fontWeight:700, color:C.textFaint, letterSpacing:0.6, textTransform:'uppercase', marginBottom:14, fontFamily:F.body }}>
      Pipeline overview
    </div>
    {[
      { label:'Applications', value:stats.totalApplications, color:C.blue    },
      { label:'Shortlisted',  value:stats.shortlisted,       color:C.indigo  },
      { label:'Active jobs',  value:stats.activeJobs,        color:C.teal    },
    ].map(row => (
      <div key={row.label} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:row.color, flexShrink:0 }} />
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:5, fontFamily:F.body }}>
            <span style={{ color:C.textMuted, fontWeight:500 }}>{row.label}</span>
            <span style={{ color:C.text, fontWeight:700 }}>{row.value}</span>
          </div>
          <div style={{ height:3, background:C.surfaceDeep, borderRadius:99, overflow:'hidden' }}>
            <div style={{
              height:'100%', borderRadius:99, background:row.color,
              transition:'width 0.8s ease',
              width: stats.totalJobs ? `${Math.min(100, (row.value / Math.max(stats.totalJobs, 1)) * 100)}%` : '0%',
              boxShadow:`0 0 6px ${row.color}50`,
            }} />
          </div>
        </div>
      </div>
    ))}
  </Card>
);

/* ═══════════════════════════════════════════════════════════════════════════
   AI STATUS PANEL
═══════════════════════════════════════════════════════════════════════════ */
export const AiStatusPanel: React.FC<{ delay?: number }> = ({ delay = 0 }) => {
  const navigate = useNavigate();
  return (
    <div style={{
      borderRadius:16, padding:'18px 20px',
      background:`linear-gradient(135deg, ${C.blueDim}, ${C.tealDim})`,
      border:`1px solid ${C.borderMid}`,
      backdropFilter:'blur(16px)',
      boxShadow:C.shadow,
      animationName:'dbFadeUp', animationDuration:'0.5s',
      animationDelay:`${delay}s`, animationFillMode:'both',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
        <span style={{
          width:8, height:8, borderRadius:'50%', background:C.teal,
          border:`2px solid ${C.tealBorder}`,
          animation:'dbPulse 2s ease infinite',
          display:'inline-block', flexShrink:0,
        }} />
        <span style={{ fontSize:12.5, fontWeight:700, color:C.teal, letterSpacing:0.3, fontFamily:F.body }}>
          AI Engine Online
        </span>
      </div>
      <p style={{ fontSize:12.5, color:C.textMuted, margin:'0 0 14px', lineHeight:1.65, fontFamily:F.body }}>
        Candidate sourcing, scoring &amp; shortlisting are ready. Run AI sourcing to discover your best talent instantly.
      </p>
      <button
        onClick={() => navigate('/sourcing')}
        style={{
          display:'inline-flex', alignItems:'center', gap:6,
          padding:'8px 16px', borderRadius:9,
          background:C.gradBlue, border:'none', color:C.white,
          fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:F.body,
          boxShadow:C.shadowBlue, transition:'opacity 0.18s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.84'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
      >
        <Zap size={12} /> Run AI Sourcing
      </button>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   RECENT JOBS CARD
═══════════════════════════════════════════════════════════════════════════ */
export const RecentJobsCard: React.FC<{
  jobs:    Job[];
  loading: boolean;
  delay?:  number;
}> = ({ jobs, loading, delay = 0 }) => {
  const navigate = useNavigate();
  return (
    <Card delay={delay} style={{ overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'17px 20px 14px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <SectionHeader icon={<Briefcase size={13} />} title="Recent Job Postings" accent={C.blue} />
        <button
          onClick={() => navigate('/jobs')}
          style={{
            display:'inline-flex', alignItems:'center', gap:4,
            padding:'5px 11px', borderRadius:8,
            border:`1px solid ${C.border}`, background:C.surface,
            fontSize:12, fontWeight:600, color:C.textMuted, cursor:'pointer',
            fontFamily:F.body, transition:'all 0.16s', flexShrink:0,
          }}
          onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = C.borderFocus; b.style.color = C.blue; }}
          onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = C.border; b.style.color = C.textMuted; }}
        >
          View all <ArrowUpRight size={11} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding:'14px 16px 18px' }}>
        {loading ? (
          <LoadingSpinner text="Loading jobs…" />
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={<Briefcase size={24} />}
            title="No jobs posted yet"
            desc="Create your first job posting to get started."
            color={C.blue}
            action={
              <button
                onClick={() => navigate('/jobs')}
                style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 18px', borderRadius:9, background:C.gradBlue, border:'none', color:C.white, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:F.body, boxShadow:C.shadowBlue }}
              >
                <Plus size={13} /> Get started
              </button>
            }
          />
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {jobs.map((job, i) => (
              <JobRow key={job.id} job={job} index={i} onClick={() => navigate(`/jobs/${job.id}`)} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};