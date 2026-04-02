// features/dashboard/components/shared/DashboardShared.tsx
// Light frosted-glass — exact match with JobPostingsPage / SourcingPage
// Fraunces (display) + DM Sans (body)

import React, { useState } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
   TOKENS  (JobPostingsPage exact)
═══════════════════════════════════════════════════════════════════════════ */
export const C = {
  bg:           '#f0f5ff',
  bgAlt:        '#e6eeff',
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
  blueMid:      'rgba(79,125,255,0.18)',
  gradBlue:     'linear-gradient(135deg, #2a4fff 0%, #4f7dff 50%, #6b93ff 100%)',
  teal:         '#06d6b0',
  tealDim:      'rgba(6,214,176,0.10)',
  tealBorder:   'rgba(6,214,176,0.30)',
  indigo:       '#9b6dff',
  indigoDim:    'rgba(155,109,255,0.09)',
  indigoBorder: 'rgba(155,109,255,0.28)',
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
  shadowIndigo: '0 4px 16px rgba(155,109,255,0.22)',
};

export const F = {
  display: "'Fraunces', Georgia, serif",
  body:    "'DM Sans', system-ui, sans-serif",
};

/* ── Global CSS (inject once per page via <style>) ── */
export const DASH_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,600&display=swap');
  @keyframes dbFadeUp    { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes dbSpin      { to{transform:rotate(360deg)} }
  @keyframes dbOrb1      { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-40px,30px)}  }
  @keyframes dbOrb2      { 0%,100%{transform:translate(0,0)} 50%{transform:translate(50px,-35px)} }
  @keyframes dbOrb3      { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-25px,20px)} }
  @keyframes dbPulse     { 0%,100%{opacity:1} 50%{opacity:0.35} }
  @keyframes dbSlideUp   { from{opacity:0;transform:translateY(18px) scale(0.97)} to{opacity:1;transform:none} }
  @keyframes dbFadeIn    { from{opacity:0} to{opacity:1} }
  * { box-sizing:border-box; }
  ::selection { background:rgba(79,125,255,0.18); color:#0d1b3e; }
  input::placeholder,textarea::placeholder { color:#8fa3c8; font-weight:400; }
  input:focus,textarea:focus { outline:none; }
  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(79,125,255,0.18); border-radius:99px; }
`;

/* ═══════════════════════════════════════════════════════════════════════════
   BG PATTERN — dot grid + orbs  (JobPostingsPage identical)
═══════════════════════════════════════════════════════════════════════════ */
export const BgPattern: React.FC = () => (
  <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
    <div style={{ position:'absolute', top:'-10%', right:'-5%', width:680, height:560, borderRadius:'50%', background:'radial-gradient(ellipse, rgba(79,125,255,0.13) 0%, rgba(79,125,255,0.04) 50%, transparent 75%)', filter:'blur(64px)', animation:'dbOrb1 18s ease-in-out infinite' }} />
    <div style={{ position:'absolute', bottom:'-8%', left:'-4%', width:560, height:480, borderRadius:'50%', background:'radial-gradient(ellipse, rgba(6,214,176,0.10) 0%, rgba(6,214,176,0.03) 50%, transparent 75%)', filter:'blur(72px)', animation:'dbOrb2 22s ease-in-out infinite' }} />
    <div style={{ position:'absolute', top:'40%', left:'30%', width:440, height:360, borderRadius:'50%', background:'radial-gradient(ellipse, rgba(155,109,255,0.07) 0%, transparent 70%)', filter:'blur(60px)', animation:'dbOrb3 26s ease-in-out infinite' }} />
    <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.36 }}>
      <defs>
        <pattern id="dbDots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.85" fill="rgba(79,125,255,0.20)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dbDots)" />
    </svg>
    <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg, transparent 0%, #4f7dff 30%, #06d6b0 60%, transparent 100%)', opacity:0.55 }} />
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   CARD — frosted glass base
═══════════════════════════════════════════════════════════════════════════ */
export const Card: React.FC<{
  children: React.ReactNode;
  style?:   React.CSSProperties;
  delay?:   number;
}> = ({ children, style, delay = 0 }) => (
  <div style={{
    background: 'rgba(255,255,255,0.82)',
    backdropFilter: 'blur(20px) saturate(1.5)',
    border: `1px solid ${C.border}`,
    borderRadius: 18,
    boxShadow: C.shadow,
    animationName: 'dbFadeUp',
    animationDuration: '0.5s',
    animationDelay: `${delay}s`,
    animationFillMode: 'both',
    animationTimingFunction: 'cubic-bezier(0.22,1,0.36,1)',
    ...style,
  }}>
    {children}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   STAT CARD
═══════════════════════════════════════════════════════════════════════════ */
export const StatCard: React.FC<{
  label:  string;
  value:  string | number;
  icon:   React.ReactNode;
  color:  string;
  delay?: number;
}> = ({ label, value, icon, color, delay = 0 }) => {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? C.bgCard : 'rgba(255,255,255,0.80)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${hov ? color + '35' : C.border}`,
        borderRadius: 16, padding: '18px 20px',
        boxShadow: hov ? `0 8px 32px ${color}18` : C.shadow,
        transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)',
        transform: hov ? 'translateY(-3px)' : 'none',
        cursor: 'default',
        animationName: 'dbFadeUp',
        animationDuration: '0.5s',
        animationDelay: `${delay}s`,
        animationFillMode: 'both',
        animationTimingFunction: 'cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 11, marginBottom: 14,
        background: `${color}12`, border: `1px solid ${color}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: hov ? `0 0 16px ${color}30` : 'none',
        transition: 'box-shadow 0.25s',
      }}>
        <span style={{ color, display: 'flex' }}>{icon}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: hov ? color : C.text, letterSpacing: '-1px', lineHeight: 1, fontFamily: F.display, transition: 'color 0.25s' }}>
        {value}
      </div>
      <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 5, fontWeight: 500, fontFamily: F.body }}>
        {label}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION HEADER — icon + title + optional right slot
═══════════════════════════════════════════════════════════════════════════ */
export const SectionHeader: React.FC<{
  icon:    React.ReactNode;
  title:   string;
  accent:  string;
  right?:  React.ReactNode;
}> = ({ icon, title, accent, right }) => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, gap:12 }}>
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <div style={{
        width:32, height:32, borderRadius:9,
        background:`${accent}12`, border:`1px solid ${accent}22`,
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <span style={{ color:accent, display:'flex' }}>{icon}</span>
      </div>
      <span style={{ fontSize:14.5, fontWeight:700, color:C.text, fontFamily:F.display }}>
        {title}
      </span>
    </div>
    {right}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   FILTER BUTTON (recruiter style — solid bg on active)
═══════════════════════════════════════════════════════════════════════════ */
export const FilterBtn: React.FC<{
  label:   string;
  count:   number;
  active:  boolean;
  color:   string;
  onClick: () => void;
}> = ({ label, count, active, color, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: '5px 12px', borderRadius: 8,
      border: `1px solid ${active ? color + '55' : C.border}`,
      background: active ? `${color}10` : C.bgCard,
      color: active ? color : C.textMuted,
      fontSize: 12, fontWeight: 600, cursor: 'pointer',
      fontFamily: F.body, transition: 'all 0.18s',
      boxShadow: active ? `0 0 10px ${color}18` : 'none',
    }}
    onMouseEnter={e => { if (!active) { const b = e.currentTarget; b.style.background = `${color}08`; b.style.borderColor = `${color}35`; } }}
    onMouseLeave={e => { if (!active) { const b = e.currentTarget; b.style.background = C.bgCard; b.style.borderColor = C.border; } }}
  >
    {label} <span style={{ opacity: 0.65, fontSize: 10.5 }}>{count}</span>
  </button>
);

/* ═══════════════════════════════════════════════════════════════════════════
   FILTER PILL (candidate style — rounded, outlined on active)
═══════════════════════════════════════════════════════════════════════════ */
export const FilterPill: React.FC<{
  label:   string;
  count:   number;
  active:  boolean;
  onClick: () => void;
}> = ({ label, count, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display:'inline-flex', alignItems:'center', gap:6,
      padding:'6px 14px', borderRadius:99,
      border:`1px solid ${active ? C.blue : C.border}`,
      background: active ? C.blueDim : 'transparent',
      color: active ? C.blueLight : C.textMuted,
      fontSize:12.5, fontWeight:600, cursor:'pointer', fontFamily:F.body,
      boxShadow: active ? `0 0 0 1px ${C.blue}40, 0 4px 14px ${C.blue}20` : 'none',
      transition:'all 0.2s',
    }}
  >
    {label}
    <span style={{
      minWidth:20, height:18, borderRadius:99, padding:'0 5px',
      background: active ? `${C.blue}30` : C.surfaceDeep,
      color: active ? C.blueLight : C.textFaint,
      fontSize:11, fontWeight:700,
      display:'inline-flex', alignItems:'center', justifyContent:'center',
    }}>{count}</span>
  </button>
);

/* ═══════════════════════════════════════════════════════════════════════════
   PROGRESS ROW (candidate overview panel)
═══════════════════════════════════════════════════════════════════════════ */
export const ProgressRow: React.FC<{
  label:  string;
  count:  number;
  total:  number;
  accent: string;
}> = ({ label, count, total, accent }) => {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12.5, marginBottom:6 }}>
        <span style={{ color:C.textMuted, fontWeight:500, fontFamily:F.body }}>{label}</span>
        <span style={{ fontWeight:700, color:C.text, fontFamily:F.body }}>{count}</span>
      </div>
      <div style={{ height:4, background:`${C.blue}10`, borderRadius:99, overflow:'hidden' }}>
        <div style={{
          height:'100%', width:`${pct}%`, background:accent,
          borderRadius:99, transition:'width 0.8s ease',
        }} />
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   LOADING SPINNER
═══════════════════════════════════════════════════════════════════════════ */
export const LoadingSpinner: React.FC<{ text?: string }> = ({ text = 'Loading…' }) => (
  <div style={{ textAlign:'center', padding:'52px 0' }}>
    <div style={{
      width:38, height:38, borderRadius:'50%', margin:'0 auto 12px',
      border:`2.5px solid ${C.blueDim}`, borderTop:`2.5px solid ${C.blue}`,
      animation:'dbSpin 1s linear infinite',
    }} />
    <p style={{ fontSize:13, color:C.textMuted, margin:0, fontFamily:F.body }}>{text}</p>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   EMPTY STATE
═══════════════════════════════════════════════════════════════════════════ */
export const EmptyState: React.FC<{
  icon:     React.ReactNode;
  title:    string;
  desc:     string;
  color?:   string;
  action?:  React.ReactNode;
}> = ({ icon, title, desc, color = C.blue, action }) => (
  <div style={{ textAlign:'center', padding:'56px 28px' }}>
    <div style={{
      width:62, height:62, borderRadius:'50%', margin:'0 auto 16px',
      background:`${color}10`, border:`1px solid ${color}22`,
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      <span style={{ color, display:'flex' }}>{icon}</span>
    </div>
    <p style={{ fontSize:17, fontWeight:700, color:C.text, margin:'0 0 8px', fontFamily:F.display }}>{title}</p>
    <p style={{ fontSize:13, color:C.textMuted, margin:'0 0 20px', lineHeight:1.65, fontFamily:F.body }}>{desc}</p>
    {action}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   ERROR BANNER
═══════════════════════════════════════════════════════════════════════════ */
export const ErrorBanner: React.FC<{ message: string }> = ({ message }) => (
  <div style={{
    display:'flex', alignItems:'center', gap:8,
    padding:'11px 16px', borderRadius:11, marginBottom:16,
    background:C.dangerDim, border:`1px solid ${C.dangerBorder}`,
    fontSize:13.5, color:C.danger, fontFamily:F.body,
  }}>
    ⚠ {message}
  </div>
);