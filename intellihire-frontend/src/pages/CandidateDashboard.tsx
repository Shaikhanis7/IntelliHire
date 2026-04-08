// pages/CandidateDashboard.tsx  — candidate only
// Light frosted-glass · Fraunces + DM Sans · JobPostingsPage exact theme

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Briefcase, RefreshCw, AlertCircle } from 'lucide-react';

import type { RootState } from '../app/store';
import { useCandidateDashboard } from '../features/dashboard/hooks/useCandidateDashboard';

import {
  BgPattern, DASH_CSS, C, F,
  Card, ErrorBanner, LoadingSpinner,
} from '../features/dashboard/components/shared/DashboardShared';

import {
  CandidateStatStrip,
  OverviewPanel,
  TipsPanel,
  ApplicationsList,
} from '../features/dashboard/components/candidate/CandidateComponents';

import ProfileCard from '../features/candidate/components/ProfileCard';

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════════ */
const CandidateDashboard: React.FC = () => {
  const { user }    = useSelector((s: RootState) => s.auth);
  const navigate    = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');

  const {
    profile, applications, stats,
    loading, refreshing, error, reload,
  } = useCandidateDashboard();

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  /* Full-page loader */
  if (loading) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:F.body, position:'relative' }}>
      <style>{DASH_CSS}</style>
      <BgPattern />
      <div style={{ position:'relative', zIndex:2 }}>
        <LoadingSpinner text="Loading your dashboard…" />
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily:F.body, background:C.bg, padding:24, position:'relative', overflow:'hidden', minHeight:'100%' }}>
      <style>{DASH_CSS + `
        .cand-layout { display:grid; grid-template-columns:272px 1fr; gap:18px; align-items:start; }
        @media(max-width:900px){ .cand-layout{grid-template-columns:1fr} }
      `}</style>

      <BgPattern />

      <div style={{ position:'relative', zIndex:2 }}>

        {/* ── Header ── */}
        <div style={{ marginBottom:26, animationName:'dbFadeUp', animationDuration:'0.35s', animationFillMode:'both' }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>

            <div>
              {/* Portal badge */}
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:C.teal, display:'inline-block', boxShadow:`0 0 8px ${C.teal}80` }} />
                <span style={{ fontSize:11, fontWeight:700, color:C.teal, letterSpacing:1.2, textTransform:'uppercase', fontFamily:F.body }}>
                  Candidate Portal
                </span>
              </div>
              <h1 style={{ fontSize:26, fontWeight:800, color:C.text, letterSpacing:'-0.6px', lineHeight:1.1, margin:0, fontFamily:F.display }}>
                {greeting},{' '}
                <span style={{ background:C.gradBlue, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                  {user?.name?.split(' ')[0]}
                </span>
              </h1>
              <p style={{ fontSize:13, color:C.textMuted, margin:'5px 0 0', fontWeight:500, fontFamily:F.body }}>
                Track your applications and manage your profile
              </p>
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button
                onClick={() => reload(true)} disabled={refreshing}
                style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:10, border:`1px solid ${C.border}`, background:C.bgCard, fontSize:13, fontWeight:600, color:C.textMuted, cursor:'pointer', fontFamily:F.body, transition:'all 0.2s' }}
                onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = C.borderFocus; b.style.color = C.blue; }}
                onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = C.border; b.style.color = C.textMuted; }}
              >
                <RefreshCw size={13} style={{ animation: refreshing ? 'dbSpin 1s linear infinite' : 'none' }} />
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
              <button
                onClick={() => navigate('/jobs')}
                style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'9px 18px', borderRadius:10, background:C.gradBlue, border:'none', color:C.white, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:F.body, boxShadow:C.shadowBlue, transition:'opacity 0.18s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
              >
                <Briefcase size={13} /> Browse jobs
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && <ErrorBanner message={error} />}

        {/* ── Two-column layout ── */}
        <div className="cand-layout">

          {/* LEFT — profile + overview + tips */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {profile && (
              <div style={{ animationName:'dbFadeUp', animationDuration:'0.5s', animationDelay:'0.08s', animationFillMode:'both' }}>
                <ProfileCard profile={profile} onUpdated={() => reload()} />
              </div>
            )}

            {stats.total > 0 && (
              <OverviewPanel stats={stats} delay={0.14} />
            )}

            <TipsPanel delay={0.20} />
          </div>

          {/* RIGHT — stat strip + applications */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ animationName:'dbFadeUp', animationDuration:'0.5s', animationDelay:'0.10s', animationFillMode:'both' }}>
              <CandidateStatStrip stats={stats} />
            </div>

            <ApplicationsList
              applications={applications}
              stats={stats}
              statusFilter={statusFilter}
              onFilter={setStatusFilter}
              delay={0.16}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateDashboard;