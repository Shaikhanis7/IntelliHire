// pages/DashboardPage.tsx  — recruiter + admin
// Light frosted-glass · Fraunces + DM Sans · JobPostingsPage exact theme

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase, Users, TrendingUp, Star,
  Plus, Activity, Zap, BarChart2, ShieldCheck,
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

import { adminSourcingService } from '../features/admin/services/adminSourcing.service';
import type { AdminSourcingRun, AdminRecruiterStat } from '../features/admin/type/adminSourcing.types';

/* ── Tiny status badge (self-contained, no external dep) ─────────────────── */
const statusColor = (s: string) => {
  if (s === 'completed') return { bg: 'rgba(6,214,176,0.10)',   text: '#06d6b0' };
  if (s === 'failed')    return { bg: 'rgba(239,68,68,0.08)',   text: '#ef4444' };
  return                        { bg: 'rgba(245,158,11,0.09)',  text: '#f59e0b' };
};

const MiniStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const c = statusColor(status);
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:99, background:c.bg, color:c.text, fontSize:10, fontWeight:700, border:`1px solid ${c.text}25`, whiteSpace:'nowrap' }}>
      <span style={{ width:4, height:4, borderRadius:'50%', background:c.text }} />
      {status}
    </span>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════════ */
const DashboardPage: React.FC = () => {
  const { user }                              = useSelector((s: RootState) => s.auth);
  const navigate                              = useNavigate();
  const { recentJobs, stats, loading, error } = useDashboard();

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const isAdmin  = user?.role === 'admin';

  /* ── Admin sourcing data ─────────────────────────────────────────────── */
  const [sourcingRuns,    setSourcingRuns]    = useState<AdminSourcingRun[]>([]);
  const [recruiterStats,  setRecruiterStats]  = useState<AdminRecruiterStat[]>([]);
  const [sourcingLoading, setSourcingLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    setSourcingLoading(true);
    Promise.all([
      adminSourcingService.getRuns(),
      adminSourcingService.getRecruiterStats(),
    ]).then(([runsData, statsData]) => {
      setSourcingRuns(runsData);
      setRecruiterStats(statsData);
    }).catch(() => {
      setSourcingRuns([]);
      setRecruiterStats([]);
    }).finally(() => setSourcingLoading(false));
  }, [isAdmin]);

  /* ── Derived sourcing numbers ────────────────────────────────────────── */
  const totalRuns     = sourcingRuns.length;
  const completedRuns = sourcingRuns.filter(r => r.status === 'completed').length;
  const failedRuns    = sourcingRuns.filter(r => r.status === 'failed').length;
  const totalSourced  = sourcingRuns.reduce((a, r) => a + r.total_sourced, 0);
  const avgEfficiency = totalRuns > 0
    ? Math.round(sourcingRuns.reduce((a, r) => a + (r.total_checked > 0 ? r.total_sourced / r.total_checked : 0), 0) / totalRuns * 100)
    : 0;
  const recentRuns = sourcingRuns.slice(0, 5);

  /* ── Nav ─────────────────────────────────────────────────────────────── */
  const QUICK_ACTIONS = [
    { icon:<Plus size={15}/>,        label:'Post a New Job',        desc:'Create a new job listing',              color:C.blue,   path:'/jobs'            },
    { icon:<Users size={15}/>,       label:'Review Applications',   desc:'Check incoming candidate applications', color:C.indigo, path:'/applications'    },
    { icon:<Zap size={15}/>,         label:'Source Candidates',     desc:'AI-powered talent discovery',           color:C.teal,   path:'/sourcing'        },
    ...(isAdmin ? [{ icon:<BarChart2 size={15}/>, label:'Sourcing Admin', desc:'Pipeline health across all recruiters', color:C.amber, path:'/admin/sourcing' }] : []),
  ];

  const STAT_CARDS = [
    { label:'Total Jobs',    value:stats.totalJobs,         icon:<Briefcase size={15}/>,  color:C.blue,   delay:0    },
    { label:'Active Jobs',   value:stats.activeJobs,        icon:<TrendingUp size={15}/>, color:C.teal,   delay:0.06 },
    { label:'Applications',  value:stats.totalApplications, icon:<Users size={15}/>,      color:C.indigo, delay:0.12 },
    { label:'Shortlisted',   value:stats.shortlisted,       icon:<Star size={15}/>,       color:C.amber,  delay:0.18 },
  ];

  const SOURCING_STAT_CARDS = [
    { label:'Total Runs',     value: totalRuns,           color: C.blue    },
    { label:'Completed',      value: completedRuns,       color: C.teal    },
    { label:'Failed',         value: failedRuns,          color: '#ef4444' },
    { label:'Total Sourced',  value: totalSourced,        color: C.indigo  },
    { label:'Avg Efficiency', value: `${avgEfficiency}%`, color: C.amber   },
  ];

  return (
    <div style={{ fontFamily:F.body, background:C.bg, padding:24, position:'relative', overflow:'hidden', minHeight:'100%' }}>
      <style>{DASH_CSS + `
        .dash-stats          { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
        .dash-sourcing-stats { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; }
        .dash-bottom         { display:grid; grid-template-columns:1fr 300px; gap:18px; align-items:start; }
        @media(max-width:1100px){
          .dash-stats{grid-template-columns:repeat(2,1fr)}
          .dash-sourcing-stats{grid-template-columns:repeat(3,1fr)}
          .dash-bottom{grid-template-columns:1fr}
        }
        @media(max-width:600px){
          .dash-stats{grid-template-columns:repeat(2,1fr)}
          .dash-sourcing-stats{grid-template-columns:repeat(2,1fr)}
        }
      `}</style>

      <BgPattern />

      <div style={{ position:'relative', zIndex:2 }}>

        {/* ── Header ── */}
        <div style={{ marginBottom:26, animationName:'dbFadeUp', animationDuration:'0.35s', animationFillMode:'both' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>

            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:52, height:52, borderRadius:15, background:C.gradBlue, boxShadow:C.shadowBlue, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, position:'relative' }}>
                <Activity size={23} color="#fff" />
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

        {/* ── Admin: sourcing summary strip ── */}
        {isAdmin && (
          <div style={{ marginBottom:20, animationName:'dbFadeUp', animationDuration:'0.4s', animationDelay:'0.12s', animationFillMode:'both' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <div style={{ width:24, height:24, borderRadius:7, background:C.amberDim, border:`1px solid ${C.amberBorder}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <BarChart2 size={12} style={{ color:C.amber }} />
                </div>
                <span style={{ fontSize:13, fontWeight:700, color:C.text, fontFamily:F.display }}>Sourcing Pipeline</span>
              </div>
              <button
                onClick={() => navigate('/admin/sourcing')}
                style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.textMuted, fontSize:11.5, fontWeight:600, cursor:'pointer', fontFamily:F.body, transition:'all 0.15s' }}
                onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = C.amber; b.style.color = C.amber; }}
                onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = C.border; b.style.color = C.textMuted; }}
              >
                <ShieldCheck size={11} /> View full admin
              </button>
            </div>

            <div className="dash-sourcing-stats">
              {SOURCING_STAT_CARDS.map(s => (
                <div key={s.label} style={{ textAlign:'center', padding:'12px 10px', borderRadius:12, background:`${s.color}08`, border:`1px solid ${s.color}20` }}>
                  <div style={{ fontSize:20, fontWeight:800, color:s.color, fontFamily:F.display, lineHeight:1 }}>
                    {sourcingLoading ? '—' : s.value}
                  </div>
                  <div style={{ fontSize:10.5, color:C.textMuted, marginTop:4, fontWeight:600 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Main grid ── */}
        <div className="dash-bottom">
          {/* Left: recent jobs */}
          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
            <RecentJobsCard jobs={recentJobs} loading={loading} delay={0.18} />

            {/* Admin: recent sourcing runs table */}
            {isAdmin && (
              <div style={{ background:'rgba(255,255,255,0.82)', backdropFilter:'blur(20px) saturate(1.5)', border:`1px solid ${C.border}`, borderRadius:18, boxShadow:C.shadow, overflow:'hidden', animationName:'dbFadeUp', animationDuration:'0.5s', animationDelay:'0.24s', animationFillMode:'both' }}>
                <div style={{ padding:'15px 18px 12px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                    <div style={{ width:28, height:28, borderRadius:8, background:C.amberDim, border:`1px solid ${C.amberBorder}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Zap size={12} style={{ color:C.amber }} />
                    </div>
                    <span style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:F.display }}>Recent Sourcing Runs</span>
                  </div>
                  <span style={{ fontSize:11, color:C.textFaint, fontWeight:600 }}>{totalRuns} total</span>
                </div>

                {sourcingLoading ? (
                  <div style={{ padding:'28px 0', textAlign:'center', fontSize:12.5, color:C.textMuted }}>Loading…</div>
                ) : recentRuns.length === 0 ? (
                  <div style={{ padding:'28px 0', textAlign:'center', fontSize:12.5, color:C.textFaint }}>No sourcing runs yet</div>
                ) : (
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ borderCollapse:'collapse', width:'100%' }}>
                      <thead>
                        <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                          {['Run', 'Role', 'Status', 'Checked', 'Sourced', 'Date'].map(h => (
                            <th key={h} style={{ textAlign:'left', padding:'8px 14px', fontSize:10, color:C.textFaint, fontWeight:700, letterSpacing:0.6, textTransform:'uppercase' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {recentRuns.map(run => (
                          <tr key={run.sourcing_id} style={{ borderBottom:`1px solid ${C.border}` }}>
                            <td style={{ padding:'9px 14px' }}>
                              <span style={{ padding:'2px 7px', borderRadius:6, background:`${C.blue}14`, color:C.blue, fontSize:10.5, fontWeight:700 }}>#{run.sourcing_id}</span>
                            </td>
                            <td style={{ padding:'9px 14px', fontSize:12.5, fontWeight:600, color:C.text, maxWidth:160 }}>
                              <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{run.role}</div>
                              {run.job_id && <div style={{ fontSize:10, color:C.textFaint, marginTop:1 }}>Job #{run.job_id}</div>}
                            </td>
                            <td style={{ padding:'9px 14px' }}><MiniStatusBadge status={run.status} /></td>
                            <td style={{ padding:'9px 14px', fontSize:12.5, color:C.textMuted, fontWeight:600 }}>{run.total_checked}</td>
                            <td style={{ padding:'9px 14px', fontSize:12.5, color:C.teal, fontWeight:700 }}>{run.total_sourced}</td>
                            <td style={{ padding:'9px 14px', fontSize:11, color:C.textFaint, whiteSpace:'nowrap' }}>
                              {new Date(run.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Recruiter performance footer strip */}
                {!sourcingLoading && recruiterStats.length > 0 && (
                  <div style={{ borderTop:`1px solid ${C.border}`, padding:'12px 18px' }}>
                    <div style={{ fontSize:10.5, color:C.textFaint, fontWeight:700, letterSpacing:0.6, textTransform:'uppercase', marginBottom:8 }}>Top Recruiters</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                      {recruiterStats.slice(0, 4).map(stat => (
                        <div key={stat.recruiter_id} style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 10px', borderRadius:10, background:`${C.blue}07`, border:`1px solid ${C.border}` }}>
                          <div style={{ width:24, height:24, borderRadius:7, background:`${C.blue}14`, border:`1px solid ${C.blue}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:C.blue, flexShrink:0 }}>
                            {stat.recruiter_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize:11.5, fontWeight:700, color:C.text }}>{stat.recruiter_name}</div>
                            <div style={{ fontSize:10, color:C.textFaint }}>{stat.total_runs} runs · {stat.avg_sourced} avg</div>
                          </div>
                          {stat.failed_runs > 0 && (
                            <span style={{ padding:'1px 6px', borderRadius:6, background:'rgba(239,68,68,0.07)', color:'#ef4444', fontSize:10, fontWeight:700 }}>{stat.failed_runs}✕</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

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
    </div>
  );
};

export default DashboardPage;