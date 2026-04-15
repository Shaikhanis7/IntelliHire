import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth';
import {
  LayoutDashboard, Briefcase, LogOut, Menu, Users, Sparkles,
  ChevronRight, Bell, Search, Zap, ListChecks, ShieldCheck, UserPlus, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreateRecruiterFAB } from '../features/admin/components/CreateRecruiterFAB';

const S = {
  sidebarBg:  'linear-gradient(175deg, #eef2fb 0%, #f0f4ff 50%, #ebf0fa 100%)',
  surface:    '#ffffff',
  surfaceHov: 'rgba(37,99,235,0.06)',
  surfaceAct: 'rgba(37,99,235,0.09)',
  border:     'rgba(30,58,138,0.12)',
  borderMid:  'rgba(30,58,138,0.28)',
  navy:       '#1e3a8a',
  blue:       '#2563eb',
  blueLight:  '#3b82f6',
  blueDim:    'rgba(37,99,235,0.07)',
  gradBlue:   'linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #3b82f6 100%)',
  gradPanel:  'linear-gradient(155deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)',
  teal:       '#0d9488',
  tealDim:    'rgba(13,148,136,0.08)',
  tealBorder: 'rgba(13,148,136,0.25)',
  red:        '#dc2626',
  redDim:     'rgba(220,38,38,0.06)',
  redBorder:  'rgba(220,38,38,0.22)',
  textHi:     '#0f172a',
  textMid:    '#334155',
  textLow:    '#64748b',
  textFaint:  '#94a3b8',
  white:      '#ffffff',
  shadowPanel: '4px 0 24px rgba(30,58,138,0.08), 1px 0 0 rgba(30,58,138,0.10)',
};

const M = {
  bg:        '#f0f4ff',
  surface:   '#f8f9fc',
  border:    'rgba(30,58,138,0.10)',
  borderHov: 'rgba(30,58,138,0.28)',
  blue:      '#2563eb',
  navy:      '#1e3a8a',
  blueDim:   'rgba(37,99,235,0.07)',
  gradBlue:  'linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #3b82f6 100%)',
  text:      '#0f172a',
  textMuted: '#334155',
  textFaint: '#94a3b8',
  shadow:    '0 1px 3px rgba(15,23,42,0.06), 0 4px 16px rgba(15,23,42,0.05)',
};

interface NavEntry { name: string; href: string; icon: React.ReactNode; isNew?: boolean; }

const RECRUITER_NAV: NavEntry[] = [
  { name: 'Dashboard',    href: '/dashboard',    icon: <LayoutDashboard size={15} /> },
  { name: 'Jobs',         href: '/jobs',          icon: <Briefcase size={15} />       },
  { name: 'Applications', href: '/applications', icon: <Users size={15} />            },
  { name: 'Sourcing',     href: '/sourcing',      icon: <Sparkles size={15} />, isNew: true },
];

const CANDIDATE_NAV: NavEntry[] = [
  { name: 'Dashboard',       href: '/dashboard',       icon: <LayoutDashboard size={15} /> },
  { name: 'Jobs',            href: '/jobs',             icon: <Briefcase size={15} />       },
  { name: 'My Applications', href: '/my-applications', icon: <ListChecks size={15} />      },
];

const NavItem: React.FC<{
  item: NavEntry; active: boolean; onClick?: () => void; index: number;
}> = ({ item, active, onClick, index }) => (
  <motion.div
    initial={{ opacity: 0, x: -14 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.04 + index * 0.06, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
  >
    <Link to={item.href} onClick={onClick} style={{ textDecoration: 'none', display: 'block' }}>
      <motion.div
        whileHover={{ x: 2 }}
        transition={{ type: 'spring', stiffness: 420, damping: 26 }}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 10px', borderRadius: 10,
          background: active ? S.surfaceAct : 'transparent',
          border: `1px solid ${active ? S.borderMid : 'transparent'}`,
          cursor: 'pointer', position: 'relative', overflow: 'hidden',
          transition: 'background 0.18s, border-color 0.18s',
          boxShadow: active ? '0 2px 12px rgba(37,99,235,0.10)' : 'none',
        }}
        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = S.surfaceHov; }}
        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
      >
        {active && (
          <motion.div
            layoutId="activeNavBar"
            style={{
              position: 'absolute', left: 0, top: '18%', bottom: '18%',
              width: 3, borderRadius: 99, background: S.gradBlue,
            }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: active ? 'rgba(37,99,235,0.10)' : 'rgba(30,58,138,0.05)',
          border: `1px solid ${active ? S.borderMid : 'rgba(30,58,138,0.08)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.18s',
          boxShadow: active ? '0 2px 8px rgba(37,99,235,0.12)' : 'none',
        }}>
          <span style={{ color: active ? S.blue : S.textLow, display: 'flex', transition: 'color 0.18s' }}>
            {item.icon}
          </span>
        </div>
        <span style={{
          fontSize: 13, fontWeight: active ? 700 : 500,
          color: active ? S.navy : S.textMid,
          flex: 1, letterSpacing: '-0.1px',
          fontFamily: "'DM Sans', system-ui, sans-serif",
          transition: 'color 0.18s',
        }}>
          {item.name}
        </span>
        {item.isNew && (
          <span style={{
            padding: '2px 7px', borderRadius: 99,
            fontSize: 9, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase',
            background: S.gradBlue, color: '#fff',
          }}>AI</span>
        )}
        {active && <ChevronRight size={11} style={{ color: S.blue, flexShrink: 0 }} />}
      </motion.div>
    </Link>
  </motion.div>
);

const SLabel: React.FC<{ label: string }> = ({ label }) => (
  <div style={{
    padding: '14px 18px 6px',
    fontSize: 9.5, fontWeight: 800, letterSpacing: 1.8,
    color: S.textFaint, textTransform: 'uppercase',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  }}>{label}</div>
);

const SidebarDeco: React.FC = () => (
  <>
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(37,99,235,0.5) 35%, rgba(59,130,246,0.55) 65%, transparent)', zIndex: 1 }} />
    <div style={{ position: 'absolute', top: -60, right: -60, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.09) 0%, transparent 65%)', pointerEvents: 'none' }} />
    <div style={{ position: 'absolute', bottom: 100, left: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 65%)', pointerEvents: 'none' }} />
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.22, pointerEvents: 'none' }}>
      <defs>
        <pattern id="sidebarDots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.6" fill="rgba(30,58,138,0.45)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#sidebarDots)" />
    </svg>
    <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 1, background: 'linear-gradient(180deg, rgba(37,99,235,0.22) 0%, rgba(37,99,235,0.08) 55%, rgba(99,102,241,0.14) 100%)' }} />
  </>
);

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled]     = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    const el = document.getElementById('main-scroll');
    if (!el) return;
    const h = () => setScrolled(el.scrollTop > 8);
    el.addEventListener('scroll', h);
    return () => el.removeEventListener('scroll', h);
  }, []);

  const role        = user?.role ?? 'candidate';
  const isRecruiter = role === 'recruiter';
  const isAdmin     = role === 'admin';
  const nav         = isAdmin || isRecruiter ? RECRUITER_NAV : CANDIDATE_NAV;
  const activePage  = nav.find(n => location.pathname.startsWith(n.href))?.name ?? '';

  const roleChip = isAdmin
    ? { label: 'Admin',     color: S.red,  dim: S.redDim,   border: S.redBorder,  grad: 'linear-gradient(135deg,#991b1b,#dc2626)' }
    : isRecruiter
      ? { label: 'Recruiter', color: S.blue, dim: S.blueDim,  border: S.borderMid,  grad: S.gradBlue }
      : { label: 'Candidate', color: S.teal, dim: S.tealDim,  border: S.tealBorder, grad: 'linear-gradient(135deg,#0f766e,#0d9488)' };

  return (
    <div style={{
      minHeight: '100vh', background: M.bg,
      display: 'flex', fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=Fraunces:ital,wght@0,700;0,800;1,700&display=swap');
        * { box-sizing: border-box; }
        ::selection { background: rgba(37,99,235,0.14); color: #1e3a8a; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(37,99,235,0.18); border-radius: 99px; }
        @keyframes ping3 { 0%{transform:scale(1);opacity:.8} 100%{transform:scale(2.5);opacity:0} }
        @keyframes pageIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }

        /* ── Responsive ── */
        .dbl-sidebar {
          position: fixed; inset: 0 auto 0 0; width: 248px;
          background: ${S.sidebarBg};
          display: flex; flex-direction: column;
          z-index: 40; overflow: hidden; overflow-y: auto;
          transition: transform 0.3s cubic-bezier(0.77,0,0.18,1);
          box-shadow: ${S.shadowPanel};
        }
        .dbl-main {
          margin-left: 248px; flex: 1; display: flex;
          flex-direction: column; min-height: 100vh; min-width: 0;
        }
        .dbl-topbar-search { display: flex; }
        .dbl-page-pad { padding: 24px 24px 44px; }
        .dbl-topbar { padding: 0 26px; gap: 14px; }

        @media (max-width: 1023px) {
          .dbl-sidebar {
            transform: translateX(-100%);
            width: 272px;
          }
          .dbl-sidebar.open { transform: translateX(0); }
          .dbl-main { margin-left: 0; }
          .dbl-topbar-search { display: none; }
          .dbl-page-pad { padding: 16px 16px 44px; }
          .dbl-topbar { padding: 0 16px; gap: 10px; }
        }

        @media (max-width: 480px) {
          .dbl-page-pad { padding: 12px 12px 44px; }
          .dbl-topbar { padding: 0 12px; gap: 8px; }
        }
      `}</style>

      {/* ══ SIDEBAR ══ */}
      <div className={`dbl-sidebar${mobileOpen ? ' open' : ''}`}>
        <SidebarDeco />

        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          style={{
            display: 'none',
            position: 'absolute', top: 14, right: 14, zIndex: 10,
            background: 'none', border: 'none', cursor: 'pointer',
            color: S.textLow, padding: 6, borderRadius: 8,
          }}
          className="dbl-sb-close"
        >
          <X size={18} />
        </button>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ padding: '26px 18px 18px', display: 'flex', alignItems: 'center', gap: 11, borderBottom: `1px solid ${S.border}`, position: 'relative', zIndex: 2 }}
        >
          <motion.div whileHover={{ scale: 1.08, rotate: -5 }} transition={{ type: 'spring', stiffness: 400 }}
            style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: S.gradBlue, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(37,99,235,0.32)' }}>
            <Briefcase size={17} color="#fff" />
          </motion.div>
          <div>
            <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.4px', background: S.gradBlue, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontFamily: "'Fraunces', serif", display: 'block', lineHeight: 1.1 }}>IntelliHire</span>
            <span style={{ fontSize: 10, color: S.textFaint, fontWeight: 500, letterSpacing: 0.3 }}>AI Recruitment Platform</span>
          </div>
        </motion.div>

        {/* Role pill */}
        <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.14, duration: 0.38 }}
          style={{ padding: '13px 18px 0', position: 'relative', zIndex: 2 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px 4px 8px', borderRadius: 99, background: roleChip.dim, color: roleChip.color, border: `1px solid ${roleChip.border}`, fontSize: 10, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: roleChip.color, flexShrink: 0, boxShadow: `0 0 6px ${roleChip.color}55` }} />
            {roleChip.label}
          </span>
        </motion.div>

        {/* Nav */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <SLabel label="Navigation" />
          <nav style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {nav.map((item, i) => (
              <NavItem key={item.name} item={item} active={location.pathname.startsWith(item.href)} onClick={() => setMobileOpen(false)} index={i} />
            ))}
          </nav>
        </div>

        {/* Admin block */}
        {isAdmin && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
            style={{ padding: '0 10px', position: 'relative', zIndex: 2 }}>
            <SLabel label="Admin" />
            <div style={{ borderRadius: 11, background: S.redDim, border: `1px solid ${S.redBorder}`, padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(220,38,38,0.06)', border: `1px solid ${S.redBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ShieldCheck size={13} color={S.red} />
              </div>
              <div>
                <p style={{ fontSize: 11.5, fontWeight: 700, color: S.red, margin: 0 }}>Admin Controls</p>
                <p style={{ fontSize: 10, color: 'rgba(220,38,38,0.5)', margin: '1px 0 0', lineHeight: 1.4 }}>
                  <UserPlus size={9} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                  Manage recruiters
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div style={{ flex: 1 }} />

        {/* AI sourcing pill */}
        {(isRecruiter || isAdmin) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.36 }}
            style={{ padding: '0 10px 8px', position: 'relative', zIndex: 2 }}>
            <div style={{ borderRadius: 11, background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.15)', padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
                <span style={{ position: 'absolute', width: 10, height: 10, borderRadius: '50%', background: S.blue, top: -2, left: -2, opacity: 0.45, animation: 'ping3 1.7s ease-out infinite' }} />
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: S.blue, display: 'block' }} />
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: S.textMid, flex: 1 }}>AI Sourcing active</span>
              <Sparkles size={11} color={S.blue} />
            </div>
          </motion.div>
        )}

        <div style={{ margin: '0 18px 4px', height: 1, background: `linear-gradient(90deg, transparent, ${S.border}, transparent)` }} />

        {/* User card */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.40 }}
          style={{ margin: '0 10px 16px', padding: '11px 12px', borderRadius: 12, background: 'rgba(37,99,235,0.05)', border: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 2, boxShadow: '0 2px 8px rgba(30,58,138,0.06)' }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: roleChip.grad, fontSize: 13, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 10px ${roleChip.color}28` }}>
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12.5, fontWeight: 700, color: S.textHi, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{user?.name}</p>
            <p style={{ fontSize: 10.5, color: S.textLow, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{user?.email ?? user?.role ?? 'User'}</p>
          </div>
          <motion.button onClick={logout} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} title="Sign out"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', color: S.textFaint, borderRadius: 8, transition: 'color 0.2s, background 0.2s' }}
            onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = S.red; b.style.background = S.redDim; }}
            onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = S.textFaint; b.style.background = 'transparent'; }}>
            <LogOut size={14} />
          </motion.button>
        </motion.div>
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 39, backdropFilter: 'blur(6px)' }}
          />
        )}
      </AnimatePresence>

      {/* ══ MAIN AREA ══ */}
      <div className="dbl-main">

        {/* Topbar */}
        <motion.header
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="dbl-topbar"
          style={{
            position: 'sticky', top: 0, zIndex: 30, height: 62,
            display: 'flex', alignItems: 'center',
            background: scrolled ? 'rgba(240,244,255,0.92)' : 'rgba(240,244,255,0.75)',
            backdropFilter: 'blur(20px) saturate(180%)',
            borderBottom: `1px solid ${scrolled ? M.border : 'transparent'}`,
            transition: 'background 0.3s, border-color 0.3s',
            boxShadow: scrolled ? M.shadow : 'none',
          }}
        >
          {/* Hamburger — always visible on mobile */}
          <motion.button
            onClick={() => setMobileOpen(true)}
            whileTap={{ scale: 0.9 }}
            className="dbl-hamburger"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: M.blue, padding: 6, display: 'flex',
              borderRadius: 8, flexShrink: 0,
            }}
          >
            <Menu size={20} />
          </motion.button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {isAdmin && (
              <span style={{ padding: '2px 9px', borderRadius: 99, fontSize: 9.5, fontWeight: 700, background: 'rgba(220,38,38,0.07)', color: S.red, border: '1px solid rgba(220,38,38,0.22)', display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <ShieldCheck size={9} /> Admin
              </span>
            )}
            <span style={{ fontSize: 15, fontWeight: 800, color: M.text, letterSpacing: '-0.4px', fontFamily: "'Fraunces', serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activePage}
            </span>
            {activePage === 'Sourcing' && (
              <motion.span initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                style={{ padding: '2px 9px', borderRadius: 99, background: M.gradBlue, color: '#fff', fontSize: 9.5, fontWeight: 700, letterSpacing: 0.5, display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <Zap size={9} /> AI-Powered
              </motion.span>
            )}
          </div>

          <div style={{ flex: 1 }} />

          {/* Search pill — hidden on mobile via CSS */}
          <motion.div
            whileHover={{ borderColor: M.borderHov, background: '#ffffff' }}
            className="dbl-topbar-search"
            style={{ alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 10, cursor: 'pointer', background: M.surface, border: `1px solid ${M.border}`, transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(15,23,42,0.05)' }}
          >
            <Search size={13} style={{ color: M.textFaint }} />
            <span style={{ fontSize: 12.5, color: M.textFaint }}>Search…</span>
            <kbd style={{ padding: '2px 7px', borderRadius: 6, background: M.blueDim, border: `1px solid ${M.border}`, fontSize: 10, color: M.textFaint, fontFamily: 'inherit' }}>⌘K</kbd>
          </motion.div>

          {/* Bell */}
          <motion.button whileHover={{ scale: 1.05, borderColor: M.borderHov }} whileTap={{ scale: 0.95 }}
            style={{ position: 'relative', width: 36, height: 36, borderRadius: 10, background: M.surface, border: `1px solid ${M.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: M.textFaint, boxShadow: '0 1px 3px rgba(15,23,42,0.05)', transition: 'all 0.2s', flexShrink: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = M.blue; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = M.textFaint; }}>
            <Bell size={15} />
            <span style={{ position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: '50%', background: M.gradBlue, border: `1.5px solid ${M.bg}` }} />
          </motion.button>
        </motion.header>

        <main id="main-scroll" className="dbl-page-pad" style={{ flex: 1, overflowY: 'auto', animation: 'pageIn 0.38s ease both' }}>
          <Outlet />
        </main>
      </div>

      {/* Hide hamburger on desktop via extra CSS */}
      <style>{`
        @media (min-width: 1024px) {
          .dbl-hamburger { display: none !important; }
          .dbl-sb-close   { display: none !important; }
        }
        @media (max-width: 1023px) {
          .dbl-hamburger { display: flex !important; }
          .dbl-sb-close   { display: flex !important; }
        }
      `}</style>

      <CreateRecruiterFAB />
    </div>
  );
};

export default DashboardLayout;