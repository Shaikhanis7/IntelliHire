// pages/DashboardPage.tsx  — recruiter + admin
// Light frosted-glass · Fraunces + DM Sans · JobPostingsPage exact theme

import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase, Users, TrendingUp, Star,
  Plus, Activity, Zap,
} from 'lucide-react';

import type { RootState } from '../app/store';
import { useDashboard }   from '../features/dashboard/hooks/useDashboard';

import {
  BgPattern, DASH_CSS, C, F,
  StatCard, ErrorBanner,
} from '../features/dashboard/components/shared/DashboardShared';

import {
  RecentJobsCard,
  QuickAction,
  PipelineOverview,
  AiStatusPanel,
} from '../features/dashboard/components/recruiter/RecruiterComponents';

import { CreateRecruiterFAB } from '../features/dashboard/components/admin/CreateRecruiterModal';

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════════ */
const DashboardPage: React.FC = () => {
  const { user }                        = useSelector((s: RootState) => s.auth);
  const navigate                        = useNavigate();
  const { recentJobs, stats, loading, error } = useDashboard();

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const isAdmin  = user?.role === 'admin';

  const QUICK_ACTIONS = [
    { icon:<Plus size={15}/>,  label:'Post a New Job',      desc:'Create a new job listing',              color:C.blue,   path:'/jobs'         },
    { icon:<Users size={15}/>, label:'Review Applications', desc:'Check incoming candidate applications', color:C.indigo, path:'/applications' },
    { icon:<Zap size={15}/>,   label:'Source Candidates',   desc:'AI-powered talent discovery',           color:C.teal,   path:'/sourcing'     },
  ];

  const STAT_CARDS = [
    { label:'Total Jobs',    value:stats.totalJobs,         icon:<Briefcase size={15}/>,  color:C.blue,   delay:0    },
    { label:'Active Jobs',   value:stats.activeJobs,        icon:<TrendingUp size={15}/>, color:C.teal,   delay:0.06 },
    { label:'Applications',  value:stats.totalApplications, icon:<Users size={15}/>,      color:C.indigo, delay:0.12 },
    { label:'Shortlisted',   value:stats.shortlisted,       icon:<Star size={15}/>,       color:C.amber,  delay:0.18 },
  ];

  return (
    <div style={{ fontFamily:F.body, background:C.bg, padding:24, position:'relative', overflow:'hidden', minHeight:'100%' }}>
      <style>{DASH_CSS + `
        .dash-stats  { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
        .dash-bottom { display:grid; grid-template-columns:1fr 300px; gap:18px; align-items:start; }
        @media(max-width:1100px){ .dash-stats{grid-template-columns:repeat(2,1fr)} .dash-bottom{grid-template-columns:1fr} }
        @media(max-width:600px) { .dash-stats{grid-template-columns:repeat(2,1fr)} }
      `}</style>

      <BgPattern />

      <div style={{ position:'relative', zIndex:2 }}>

        {/* ── Header ── */}
        <div style={{ marginBottom:26, animationName:'dbFadeUp', animationDuration:'0.35s', animationFillMode:'both' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>

            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:52, height:52, borderRadius:15, background:C.gradBlue, boxShadow:C.shadowBlue, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, position:'relative' }}>
                <Activity size={23} color="#fff" />
                {/* Live dot */}
                <span style={{ position:'absolute', bottom:2, right:2, width:10, height:10, borderRadius:'50%', background:C.teal, border:`2px solid ${C.bg}`, animation:'dbPulse 2s ease infinite' }} />
              </div>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                  {isAdmin && (
                    <span style={{ fontSize:10.5, fontWeight:700, padding:'2px 8px', borderRadius:99, background:C.amberDim, color:C.amber, border:`1px solid ${C.amberBorder}`, fontFamily:F.body }}>
                      ADMIN
                    </span>
                  )}
                </div>
                <h1 style={{ fontSize:23, fontWeight:800, color:C.text, letterSpacing:'-0.5px', margin:0, lineHeight:1, fontFamily:F.display }}>
                  {greeting}, {user?.name?.split(' ')[0]}!
                </h1>
                <p style={{ fontSize:13, color:C.textMuted, margin:'3px 0 0', fontWeight:500, fontFamily:F.body }}>
                  {isAdmin ? "Here's your platform overview for today." : "Here's what's happening with your recruitment today."}
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate('/jobs')}
              style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:10, background:C.gradBlue, border:'none', color:'#fff', fontSize:13.5, fontWeight:700, cursor:'pointer', fontFamily:F.body, boxShadow:C.shadowBlue, transition:'opacity 0.18s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
            >
              <Plus size={15} /> Post New Job
            </button>
          </div>
        </div>

        {/* Error */}
        {error && <ErrorBanner message={error} />}

        {/* ── Stats strip ── */}
        <div className="dash-stats" style={{ marginBottom:20 }}>
          {STAT_CARDS.map(s => <StatCard key={s.label} {...s} />)}
        </div>

        {/* ── Main grid ── */}
        <div className="dash-bottom">
          {/* Left: recent jobs */}
          <RecentJobsCard jobs={recentJobs} loading={loading} delay={0.18} />

          {/* Right column */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* Quick actions card */}
            <div style={{ background:'rgba(255,255,255,0.82)', backdropFilter:'blur(20px) saturate(1.5)', border:`1px solid ${C.border}`, borderRadius:18, boxShadow:C.shadow, overflow:'hidden', animationName:'dbFadeUp', animationDuration:'0.5s', animationDelay:'0.22s', animationFillMode:'both' }}>
              <div style={{ padding:'15px 18px 12px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:9 }}>
                <div style={{ width:28, height:28, borderRadius:8, background:C.indigoDim, border:`1px solid ${C.indigoBorder}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Zap size={12} style={{ color:C.indigo }} />
                </div>
                <span style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:F.display }}>Quick Actions</span>
              </div>
              <div style={{ padding:'10px 10px 12px', display:'flex', flexDirection:'column', gap:6 }}>
                {QUICK_ACTIONS.map((a, i) => (
                  <QuickAction
                    key={a.label} {...a}
                    onClick={() => navigate(a.path)}
                    delay={0.28 + i * 0.07}
                  />
                ))}
              </div>
            </div>

            {/* AI status */}
            <AiStatusPanel delay={0.38} />

            {/* Pipeline overview */}
            <PipelineOverview stats={stats} delay={0.46} />
          </div>
        </div>
      </div>

      {/* Admin FAB — renders nothing for recruiters */}
      <CreateRecruiterFAB />
    </div>
  );
};

export default DashboardPage;