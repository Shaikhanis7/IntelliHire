// pages/CandidateDashboard.tsx — candidate only
// Fully responsive: mobile-first with adaptive layout

import React, { useState, useEffect } from 'react';
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

/* ─── Responsive hook ────────────────────────────────────────────────────────── */
const useBreakpoint = () => {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return {
    isMobile:  w < 640,
    isTablet:  w < 900,
    isDesktop: w >= 900,
    width: w,
  };
};

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════════ */
const CandidateDashboard: React.FC = () => {
  const { user }    = useSelector((s: RootState) => s.auth);
  const navigate    = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const { isMobile, isTablet } = useBreakpoint();

  const {
    profile, applications, stats,
    loading, refreshing, error, reload,
  } = useCandidateDashboard();

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  /* Full-page loader */
  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.body, position: 'relative' }}>
      <style>{DASH_CSS}</style>
      <BgPattern />
      <div style={{ position: 'relative', zIndex: 2 }}>
        <LoadingSpinner text="Loading your dashboard…" />
      </div>
    </div>
  );

  /* Responsive CSS */
  const responsiveCSS = `
    /* Base layout */
    .cand-layout {
      display: grid;
      grid-template-columns: 272px 1fr;
      gap: 18px;
      align-items: start;
    }

    /* Tablet: single column */
    @media (max-width: 900px) {
      .cand-layout {
        grid-template-columns: 1fr;
      }
    }

    /* Stat strip: fluid grid */
    .cand-stat-strip {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 10px;
    }

    /* Header actions row */
    .cand-header-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    /* Header layout */
    .cand-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
    }

    /* On mobile collapse browse jobs button text */
    @media (max-width: 480px) {
      .browse-jobs-label { display: none; }
      .browse-jobs-icon  { display: flex !important; }
    }

    /* Mobile padding */
    @media (max-width: 640px) {
      .cand-page-wrap { padding: 14px 12px !important; }
      .cand-greeting  { font-size: 20px !important; }
      .cand-subtitle  { display: none; }
    }

    /* Left column on tablet: horizontal strip */
    @media (max-width: 900px) {
      .cand-left-col {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 14px;
      }
    }

    @media (max-width: 640px) {
      .cand-left-col {
        grid-template-columns: 1fr;
      }
    }
  `;

  return (
    <div
      className="cand-page-wrap"
      style={{ fontFamily: F.body, background: C.bg, padding: isMobile ? '14px 12px' : 24, position: 'relative', overflow: 'hidden', minHeight: '100%' }}
    >
      <style>{DASH_CSS + responsiveCSS}</style>

      <BgPattern />

      <div style={{ position: 'relative', zIndex: 2 }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: isMobile ? 18 : 26, animationName: 'dbFadeUp', animationDuration: '0.35s', animationFillMode: 'both' }}>
          <div className="cand-header">

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Portal badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.teal, display: 'inline-block', boxShadow: `0 0 8px ${C.teal}80` }} />
                <span style={{ fontSize: 10.5, fontWeight: 700, color: C.teal, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: F.body }}>
                  Candidate Portal
                </span>
              </div>

              <h1
                className="cand-greeting"
                style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: C.text, letterSpacing: '-0.6px', lineHeight: 1.1, margin: 0, fontFamily: F.display }}
              >
                {greeting},{' '}
                <span style={{ background: C.gradBlue, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {user?.name?.split(' ')[0]}
                </span>
              </h1>

              <p
                className="cand-subtitle"
                style={{ fontSize: 13, color: C.textMuted, margin: '5px 0 0', fontWeight: 500, fontFamily: F.body }}
              >
                Track your applications and manage your profile
              </p>
            </div>

            {/* Action buttons */}
            <div className="cand-header-actions">
              <button
                onClick={() => reload(true)}
                disabled={refreshing}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: isMobile ? '8px 12px' : '9px 16px',
                  borderRadius: 10, border: `1px solid ${C.border}`,
                  background: C.bgCard, fontSize: 12.5, fontWeight: 600,
                  color: C.textMuted, cursor: 'pointer', fontFamily: F.body, transition: 'all 0.2s',
                  minWidth: isMobile ? 36 : 'auto',
                  justifyContent: 'center',
                }}
                onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = C.borderFocus; b.style.color = C.blue; }}
                onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = C.border; b.style.color = C.textMuted; }}
                title="Refresh"
              >
                <RefreshCw size={13} style={{ animation: refreshing ? 'dbSpin 1s linear infinite' : 'none' }} />
                {!isMobile && (refreshing ? 'Refreshing…' : 'Refresh')}
              </button>

              <button
                onClick={() => navigate('/jobs')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: isMobile ? '8px 14px' : '9px 18px',
                  borderRadius: 10, background: C.gradBlue, border: 'none',
                  color: C.white, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                  fontFamily: F.body, boxShadow: C.shadowBlue, transition: 'opacity 0.18s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
              >
                <Briefcase size={13} />
                <span className="browse-jobs-label">{isMobile ? 'Jobs' : 'Browse jobs'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && <ErrorBanner message={error} />}

        {/* ── Stat strip — always full width, above layout ── */}
        {stats.total > 0 && (
          <div
            style={{
              marginBottom: 14,
              animationName: 'dbFadeUp', animationDuration: '0.5s',
              animationDelay: '0.08s', animationFillMode: 'both',
            }}
          >
            <CandidateStatStrip stats={stats} />
          </div>
        )}

        {/* ── Two-column layout ── */}
        <div className="cand-layout">

          {/* LEFT — profile + overview + tips */}
          <div className="cand-left-col" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {profile && (
              <div style={{ animationName: 'dbFadeUp', animationDuration: '0.5s', animationDelay: '0.10s', animationFillMode: 'both' }}>
                <ProfileCard profile={profile} onUpdated={() => reload()} />
              </div>
            )}

            {stats.total > 0 && (
              <OverviewPanel stats={stats} delay={0.14} />
            )}

            <TipsPanel delay={0.18} />
          </div>

          {/* RIGHT — applications */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ApplicationsList
              applications={applications}
              stats={stats}
              statusFilter={statusFilter}
              onFilter={setStatusFilter}
              delay={0.14}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateDashboard;