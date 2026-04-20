// src/pages/AdminSourcingPage.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap, BarChart2, Users, CheckCircle2, XCircle,
  TrendingUp, Activity, RefreshCw, ChevronRight,
  Award, Filter, Clock,
} from 'lucide-react';
import { adminSourcingService } from '../features/admin/services/adminSourcing.service';
import type { AdminSourcingRun, AdminRecruiterStat } from '../features/admin/type/adminSourcing.types';

import {
  BgPattern, DASH_CSS, C, F,
  ErrorBanner,
} from '../features/dashboard/components/shared/DashboardShared';

/* ─── Extra tokens ───────────────────────────────────────────────────────────── */
const A = {
  amberDim:    'rgba(245,158,11,0.09)',
  amberBorder: 'rgba(245,158,11,0.28)',
  tealBorder:  'rgba(6,214,176,0.28)',
  indigoDim:   'rgba(155,109,255,0.09)',
  indigoBorder:'rgba(155,109,255,0.28)',
};

/* ─── Panel shell ────────────────────────────────────────────────────────────── */
const Panel: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; delay?: number }> = ({ children, style, delay = 0 }) => (
  <div style={{
    background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(20px) saturate(1.5)',
    WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
    border: `1px solid ${C.border}`, borderRadius: 18, boxShadow: C.shadow, overflow: 'hidden',
    animationName: 'dbFadeUp', animationDuration: '0.5s',
    animationDelay: `${delay}s`, animationFillMode: 'both',
    animationTimingFunction: 'cubic-bezier(0.22,1,0.36,1)', ...style,
  }}>{children}</div>
);

/* ─── Stat card ──────────────────────────────────────────────────────────────── */
const MiniStat: React.FC<{ label: string; value: string | number; color: string; icon: React.ReactNode; delay?: number }> = ({ label, value, color, icon, delay = 0 }) => {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{ padding: '14px 16px', borderRadius: 14, background: hov ? C.white : `${color}07`, border: `1px solid ${hov ? color + '40' : color + '20'}`, boxShadow: hov ? `0 6px 24px ${color}18` : 'none', transition: 'all 0.22s cubic-bezier(0.22,1,0.36,1)', transform: hov ? 'translateY(-2px)' : 'none', cursor: 'default', animationName: 'dbFadeUp', animationDuration: '0.5s', animationDelay: `${delay}s`, animationFillMode: 'both' }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}14`, border: `1px solid ${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <span style={{ color, display: 'flex' }}>{icon}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: F.display, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 10.5, color: C.textMuted, fontWeight: 600, fontFamily: F.body }}>{label}</div>
    </div>
  );
};

/* ─── Status badge ───────────────────────────────────────────────────────────── */
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { bg: string; text: string }> = {
    completed: { bg: 'rgba(6,214,176,0.10)',  text: '#06d6b0' },
    failed:    { bg: 'rgba(239,68,68,0.08)',  text: '#ef4444' },
    running:   { bg: 'rgba(245,158,11,0.09)', text: '#f59e0b' },
  };
  const c = map[status] ?? { bg: `${C.blue}12`, text: C.blue };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 99, background: c.bg, color: c.text, fontSize: 10.5, fontWeight: 700, border: `1px solid ${c.text}25`, whiteSpace: 'nowrap', fontFamily: F.body }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.text, animation: status === 'running' ? 'dbPulse 1.5s ease infinite' : 'none' }} />
      {status}
    </span>
  );
};

/* ─── Efficiency bar ─────────────────────────────────────────────────────────── */
const EffBar: React.FC<{ pct: number }> = ({ pct }) => {
  const color = pct >= 40 ? C.teal : pct >= 15 ? C.amber : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 60, height: 4, background: C.border, borderRadius: 99, overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: `linear-gradient(90deg,${color}88,${color})`, borderRadius: 99, transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)' }} />
      </div>
      <span style={{ fontSize: 11.5, fontWeight: 700, color, fontFamily: F.body, minWidth: 30 }}>{pct}%</span>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════════════ */
const AdminSourcingPage: React.FC = () => {
  const navigate = useNavigate();
  const [runs,         setRuns]         = useState<AdminSourcingRun[]>([]);
  const [stats,        setStats]        = useState<AdminRecruiterStat[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [activeTab,    setActiveTab]    = useState<'runs' | 'recruiters'>('runs');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [refreshing,   setRefreshing]   = useState(false);

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    setError(null);
    try {
      const [runsData, statsData] = await Promise.all([
        adminSourcingService.getRuns(),
        adminSourcingService.getRecruiterStats(),
      ]);
      setRuns(runsData);
      setStats(statsData);
    } catch (err) {
      console.error('[AdminSourcingPage]', err);
      setError('Failed to load sourcing data. Check your connection or permissions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredRuns  = statusFilter === 'all' ? runs : runs.filter(r => r.status === statusFilter);
  const totalRuns     = runs.length;
  const completedRuns = runs.filter(r => r.status === 'completed').length;
  const failedRuns    = runs.filter(r => r.status === 'failed').length;
  const runningRuns   = runs.filter(r => r.status === 'running').length;
  const totalSourced  = runs.reduce((a, r) => a + r.total_sourced, 0);
  const avgEfficiency = totalRuns > 0
    ? Math.round(runs.reduce((a, r) => a + (r.total_checked > 0 ? r.total_sourced / r.total_checked : 0), 0) / totalRuns * 100)
    : 0;

  const STATS = [
    { label: 'Total Runs',     value: totalRuns,           color: C.blue,    icon: <Activity size={13}/>,     delay: 0    },
    { label: 'Completed',      value: completedRuns,       color: C.teal,    icon: <CheckCircle2 size={13}/>, delay: 0.05 },
    { label: 'Running',        value: runningRuns,         color: C.amber,   icon: <Zap size={13}/>,          delay: 0.10 },
    { label: 'Failed',         value: failedRuns,          color: '#ef4444', icon: <XCircle size={13}/>,      delay: 0.15 },
    { label: 'Total Sourced',  value: totalSourced,        color: C.indigo,  icon: <Users size={13}/>,        delay: 0.20 },
    { label: 'Avg Efficiency', value: `${avgEfficiency}%`, color: C.amber,   icon: <TrendingUp size={13}/>,   delay: 0.25 },
  ];

  return (
    <div style={{ fontFamily: F.body, background: C.bg, padding: 24, position: 'relative', overflow: 'hidden', minHeight: '100%' }}>
      <style>{DASH_CSS + `
        .as-grid { display:grid; grid-template-columns:repeat(6,1fr); gap:12px; }
        .as-body  { display:grid; grid-template-columns:1fr 300px; gap:18px; align-items:start; }
        @media(max-width:1100px){ .as-body{grid-template-columns:1fr} .as-grid{grid-template-columns:repeat(3,1fr)} }
        @media(max-width:640px){  .as-grid{grid-template-columns:repeat(2,1fr)} }
        .as-row:hover td { background:rgba(79,125,255,0.03); }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>

      <BgPattern />

      <div style={{ position: 'relative', zIndex: 2 }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 24, animationName: 'dbFadeUp', animationDuration: '0.35s', animationFillMode: 'both' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: C.gradBlue, boxShadow: C.shadowBlue, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
                <BarChart2 size={22} color="#fff" />
                <span style={{ position: 'absolute', bottom: 2, right: 2, width: 10, height: 10, borderRadius: '50%', background: runningRuns > 0 ? C.teal : C.textFaint, border: `2px solid ${C.bg}`, animation: runningRuns > 0 ? 'dbPulse 2s ease infinite' : 'none' }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: A.amberDim, color: C.amber, border: `1px solid ${A.amberBorder}`, fontFamily: F.body }}>ADMIN</span>
                  {runningRuns > 0 && (
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(6,214,176,0.10)', color: C.teal, border: `1px solid ${A.tealBorder}`, fontFamily: F.body, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.teal, animation: 'dbPulse 1.5s ease infinite' }} />
                      {runningRuns} running
                    </span>
                  )}
                </div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.5px', margin: 0, lineHeight: 1, fontFamily: F.display }}>Sourcing Admin</h1>
                <p style={{ fontSize: 12.5, color: C.textMuted, margin: '3px 0 0', fontWeight: 500, fontFamily: F.body }}>Pipeline health across all recruiters</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => navigate('/dashboard')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: F.body, transition: 'all 0.15s' }}
                onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = C.blue; b.style.color = C.blue; }}
                onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = C.border; b.style.color = C.textMuted; }}>
                ← Dashboard
              </button>
              <button onClick={() => load(true)} disabled={refreshing} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: C.gradBlue, border: 'none', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: refreshing ? 'not-allowed' : 'pointer', fontFamily: F.body, boxShadow: C.shadowBlue, opacity: refreshing ? 0.7 : 1, transition: 'opacity 0.15s' }}>
                <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {error && <ErrorBanner message={error} />}

        {/* ── Stat strip ── */}
        <div className="as-grid" style={{ marginBottom: 20 }}>
          {STATS.map(s => <MiniStat key={s.label} {...s} />)}
        </div>

        {loading ? (
          <Panel style={{ padding: 56, textAlign: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', margin: '0 auto 16px', border: `2.5px solid ${C.border}`, borderTop: `2.5px solid ${C.blue}`, animation: 'spin 1s linear infinite' }} />
            <div style={{ fontSize: 13, color: C.textMuted, fontFamily: F.body }}>Loading sourcing data…</div>
          </Panel>
        ) : (
          <div className="as-body">

            {/* ── LEFT ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Tabs + filters */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                {([{ key: 'runs', label: '🗂 All Runs', count: totalRuns }, { key: 'recruiters', label: '👤 Recruiters', count: stats.length }] as const).map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ padding: '7px 16px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.18s', border: `1.5px solid ${activeTab === tab.key ? C.blue : C.border}`, background: activeTab === tab.key ? `${C.blue}12` : 'transparent', color: activeTab === tab.key ? C.blue : C.textMuted, fontSize: 12.5, fontWeight: 700, fontFamily: F.body, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {tab.label}
                    <span style={{ padding: '1px 6px', borderRadius: 6, fontSize: 10.5, fontWeight: 700, background: activeTab === tab.key ? `${C.blue}20` : C.border, color: activeTab === tab.key ? C.blue : C.textFaint }}>{tab.count}</span>
                  </button>
                ))}
                {activeTab === 'runs' && (
                  <>
                    <Filter size={12} style={{ color: C.textFaint, marginLeft: 4 }} />
                    {(['all', 'running', 'completed', 'failed'] as const).map(s => (
                      <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: '4px 11px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s', border: `1px solid ${statusFilter === s ? C.blue : C.border}`, background: statusFilter === s ? `${C.blue}12` : 'transparent', color: statusFilter === s ? C.blue : C.textMuted, fontSize: 11.5, fontWeight: 600, fontFamily: F.body, textTransform: 'capitalize' }}>
                        {s === 'all' ? 'All' : s}
                      </button>
                    ))}
                    <span style={{ fontSize: 11.5, color: C.textFaint, fontWeight: 600, fontFamily: F.body }}>{filteredRuns.length} run{filteredRuns.length !== 1 ? 's' : ''}</span>
                  </>
                )}
              </div>

              {activeTab === 'runs' ? (
                <Panel>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                          {['Run ID', 'Role', 'Status', 'Checked', 'Sourced', 'Efficiency', 'Recruiter', 'Date'].map(h => (
                            <th key={h} style={{ textAlign: 'left', padding: '12px 14px', fontSize: 10, color: C.textFaint, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', fontFamily: F.body, whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRuns.length === 0 ? (
                          <tr><td colSpan={8} style={{ textAlign: 'center', padding: '48px 0', color: C.textFaint, fontSize: 13, fontFamily: F.body }}>No runs found</td></tr>
                        ) : filteredRuns.map((run, i) => {
                          const eff = run.total_checked > 0 ? Math.round((run.total_sourced / run.total_checked) * 100) : 0;
                          const recruiter = stats.find(s => s.recruiter_id === run.triggered_by);
                          return (
                            <tr key={run.sourcing_id} className="as-row" style={{ borderBottom: `1px solid ${C.border}`, animationName: 'dbFadeUp', animationDuration: '0.4s', animationDelay: `${i * 0.03}s`, animationFillMode: 'both' }}>
                              <td style={{ padding: '11px 14px' }}>
                                <span style={{ padding: '2px 8px', borderRadius: 6, background: `${C.blue}14`, color: C.blue, fontSize: 11, fontWeight: 700, fontFamily: F.body }}>#{run.sourcing_id}</span>
                              </td>
                              <td style={{ padding: '11px 14px', maxWidth: 170 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: F.body }}>{run.role}</div>
                                {run.job_id != null && <div style={{ fontSize: 10.5, color: C.textFaint, marginTop: 1, fontFamily: F.body }}>Job #{run.job_id}</div>}
                              </td>
                              <td style={{ padding: '11px 14px' }}><StatusBadge status={run.status} /></td>
                              <td style={{ padding: '11px 14px', fontSize: 13, color: C.textMuted, fontWeight: 600, fontFamily: F.body }}>{run.total_checked}</td>
                              <td style={{ padding: '11px 14px', fontSize: 13, color: C.teal, fontWeight: 700, fontFamily: F.body }}>{run.total_sourced}</td>
                              <td style={{ padding: '11px 14px' }}><EffBar pct={eff} /></td>
                              <td style={{ padding: '11px 14px' }}>
                                {recruiter ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div style={{ width: 22, height: 22, borderRadius: 6, background: `${C.blue}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: C.blue, flexShrink: 0, fontFamily: F.display }}>
                                      {recruiter.recruiter_name.charAt(0).toUpperCase()}
                                    </div>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: F.body, whiteSpace: 'nowrap' }}>{recruiter.recruiter_name}</span>
                                  </div>
                                ) : <span style={{ fontSize: 11.5, color: C.textFaint, fontFamily: F.body }}>—</span>}
                              </td>
                              <td style={{ padding: '11px 14px', fontSize: 11.5, color: C.textFaint, whiteSpace: 'nowrap', fontFamily: F.body }}>
                                {new Date(run.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              ) : (
                <Panel>
                  <div style={{ padding: '15px 18px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: A.indigoDim, border: `1px solid ${A.indigoBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Award size={13} style={{ color: C.indigo }} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: F.display }}>Recruiter Performance</span>
                  </div>
                  <div style={{ padding: '12px 14px 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {stats.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: C.textFaint, fontSize: 13, fontFamily: F.body }}>No recruiter data yet</div>
                    ) : stats.map((stat, i) => {
                      const colors = [C.blue, C.indigo, C.teal, C.amber];
                      const color = colors[i % colors.length];
                      return (
                        <div key={stat.recruiter_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, border: `1px solid ${C.border}`, background: 'transparent', transition: 'all 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = `${color}05`; (e.currentTarget as HTMLDivElement).style.borderColor = `${color}30`; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; (e.currentTarget as HTMLDivElement).style.borderColor = C.border; }}>
                          <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}14`, border: `1.5px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color, flexShrink: 0, fontFamily: F.display }}>
                            {stat.recruiter_name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: F.body, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stat.recruiter_name}</div>
                            <div style={{ fontSize: 10.5, color: C.textFaint, fontFamily: F.body, marginTop: 1 }}>{stat.total_runs} runs · {stat.avg_sourced} avg sourced · {stat.last_active ? new Date(stat.last_active).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'no activity'}</div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                            <span style={{ padding: '2px 8px', borderRadius: 6, background: `${color}14`, color, fontSize: 11, fontWeight: 700, fontFamily: F.body }}>{stat.total_runs} runs</span>
                            {stat.failed_runs > 0 && <span style={{ padding: '1px 6px', borderRadius: 5, background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: 10, fontWeight: 700, fontFamily: F.body }}>{stat.failed_runs} failed</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Panel>
              )}
            </div>

            {/* ── RIGHT sidebar ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Pipeline health */}
              <Panel delay={0.1}>
                <div style={{ padding: '15px 18px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: `${C.teal}14`, border: `1px solid ${A.tealBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Activity size={13} style={{ color: C.teal }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: F.display }}>Pipeline Health</span>
                </div>
                <div style={{ padding: '14px 18px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { label: 'Success rate',   value: totalRuns > 0 ? Math.round((completedRuns / totalRuns) * 100) : 0, color: C.teal    },
                    { label: 'Failure rate',   value: totalRuns > 0 ? Math.round((failedRuns / totalRuns) * 100) : 0,    color: '#ef4444' },
                    { label: 'Avg efficiency', value: avgEfficiency, color: C.amber },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: C.textMuted, marginBottom: 5, fontWeight: 600, fontFamily: F.body }}>
                        <span>{label}</span><span style={{ color, fontWeight: 700 }}>{value}%</span>
                      </div>
                      <div style={{ height: 4, background: C.border, borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${value}%`, background: `linear-gradient(90deg,${color}66,${color})`, borderRadius: 99, transition: 'width 0.9s cubic-bezier(0.22,1,0.36,1)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

           
              
              {/* Recent activity */}
              <Panel delay={0.2}>
                <div style={{ padding: '15px 18px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: `${C.blue}14`, border: `1px solid ${C.blue}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={13} style={{ color: C.blue }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: F.display }}>Recent Activity</span>
                </div>
                <div style={{ padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {runs.slice(0, 5).map(run => (
                    <div key={run.sourcing_id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 4px' }}>
                      <StatusBadge status={run.status} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: F.body }}>{run.role}</div>
                        <div style={{ fontSize: 10.5, color: C.textFaint, fontFamily: F.body, marginTop: 1 }}>
                          {new Date(run.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: C.teal, fontWeight: 700, fontFamily: F.body, flexShrink: 0 }}>+{run.total_sourced}</span>
                    </div>
                  ))}
                  {runs.length === 0 && <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 12.5, color: C.textFaint, fontFamily: F.body }}>No activity yet</div>}
                </div>
              </Panel>

              <button onClick={() => navigate('/sourcing')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 12, background: C.gradBlue, border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: F.body, boxShadow: C.shadowBlue, transition: 'opacity 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}>
                <Zap size={14} /> Go to Sourcing <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSourcingPage;