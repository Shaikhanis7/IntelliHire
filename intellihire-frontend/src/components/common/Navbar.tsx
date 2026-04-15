// features/landing/components/Navbar.tsx
// Blue Professional theme — fully responsive with mobile hamburger menu

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, LogIn, ArrowRight, LayoutDashboard, Menu, X } from 'lucide-react';
import { C, FONTS } from '../tokens/tokens';

interface NavbarProps {
  isAuthenticated: boolean;
  onLogin:     () => void;
  onSignup:    () => void;
  onDashboard: () => void;
}

const NAV_LINKS = [
  ['Features',     '#features'     ],
  ['How it works', '#how-it-works' ],
  ['Testimonials', '#testimonials' ],
] as const;

export const Navbar: React.FC<NavbarProps> = ({
  isAuthenticated, onLogin, onSignup, onDashboard,
}) => {
  const [scrolled,    setScrolled]    = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [isMobile,    setIsMobile]    = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    const onResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) setMenuOpen(false);
    };
    onResize(); // init
    window.addEventListener('scroll', onScroll);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Close menu when a link is clicked
  const handleLinkClick = () => setMenuOpen(false);

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          height: 68,
          background: (scrolled || menuOpen) ? 'rgba(240,244,250,0.96)' : 'transparent',
          backdropFilter: (scrolled || menuOpen) ? 'blur(20px) saturate(160%)' : 'none',
          borderBottom: scrolled ? `1px solid ${C.border}` : '1px solid transparent',
          transition: 'all 0.3s ease',
          display: 'flex', alignItems: 'center',
          padding: '0 max(16px, calc((100vw - 1200px)/2))',
          gap: isMobile ? 0 : 40,
        }}
      >
        {/* ── Logo ── */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 11, flex: 1, cursor: 'pointer', minWidth: 0 }}
          onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setMenuOpen(false); }}
        >
          <motion.div
            whileHover={{ scale: 1.08, rotate: -5 }}
            transition={{ type: 'spring', stiffness: 400 }}
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: C.gradGold, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(37,99,235,0.35)',
            }}
          >
            <Briefcase size={16} color="#fff" />
          </motion.div>
          <span style={{ fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: '-0.5px', fontFamily: FONTS.display, whiteSpace: 'nowrap' }}>
            IntelliHire
          </span>
        </div>

        {/* ── Desktop nav links ── */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: 32 }}>
            {NAV_LINKS.map(([label, href], i) => (
              <motion.a
                key={label}
                href={href}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
                whileHover={{ color: C.gold }}
                style={{ fontSize: 14, fontWeight: 500, color: C.textMuted, textDecoration: 'none', transition: 'color 0.15s', fontFamily: FONTS.body, whiteSpace: 'nowrap' }}
              >
                {label}
              </motion.a>
            ))}
          </div>
        )}

        {/* ── Desktop CTAs ── */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
            {isAuthenticated ? (
              <motion.button
                whileHover={{ scale: 1.03, boxShadow: C.shadowGold }}
                whileTap={{ scale: 0.97 }}
                onClick={onDashboard}
                style={{ padding: '8px 20px', borderRadius: 9, background: C.gradGold, border: 'none', fontSize: 13.5, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: FONTS.body, display: 'flex', alignItems: 'center', gap: 7, boxShadow: '0 4px 16px rgba(37,99,235,0.3)', whiteSpace: 'nowrap' }}
              >
                <LayoutDashboard size={14} /> Dashboard
              </motion.button>
            ) : (
              <>
                <motion.button
                  whileHover={{ color: C.gold, borderColor: C.gold }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onLogin}
                  style={{ padding: '8px 18px', borderRadius: 9, border: `1px solid ${C.border}`, background: 'transparent', fontSize: 13.5, fontWeight: 600, color: C.textMid, cursor: 'pointer', fontFamily: FONTS.body, display: 'flex', alignItems: 'center', gap: 6, transition: 'color 0.15s, border-color 0.15s', whiteSpace: 'nowrap' }}
                >
                  <LogIn size={13} /> Sign in
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.04, boxShadow: C.shadowGold }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onSignup}
                  style={{ padding: '8px 20px', borderRadius: 9, background: C.gradGold, border: 'none', fontSize: 13.5, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: FONTS.body, display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 16px rgba(37,99,235,0.3)', whiteSpace: 'nowrap' }}
                >
                  Get started <ArrowRight size={13} />
                </motion.button>
              </>
            )}
          </div>
        )}

        {/* ── Mobile: CTA + hamburger ── */}
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {/* Show a compact CTA on mobile */}
            {isAuthenticated ? (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onDashboard}
                style={{ padding: '7px 14px', borderRadius: 9, background: C.gradGold, border: 'none', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: FONTS.body, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <LayoutDashboard size={13} />
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onSignup}
                style={{ padding: '7px 14px', borderRadius: 9, background: C.gradGold, border: 'none', fontSize: 12.5, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: FONTS.body }}
              >
                Get started
              </motion.button>
            )}

            {/* Hamburger button */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setMenuOpen(o => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 9, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.textMid }}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </motion.button>
          </div>
        )}
      </motion.nav>

      {/* ── Mobile dropdown menu ── */}
      <AnimatePresence>
        {isMobile && menuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'fixed', top: 68, left: 0, right: 0, zIndex: 99,
              background: 'rgba(240,244,250,0.98)',
              backdropFilter: 'blur(20px) saturate(160%)',
              borderBottom: `1px solid ${C.border}`,
              padding: '16px max(16px, calc((100vw - 1200px)/2)) 24px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            }}
          >
            {/* Nav links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 20 }}>
              {NAV_LINKS.map(([label, href], i) => (
                <motion.a
                  key={label}
                  href={href}
                  onClick={handleLinkClick}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  style={{ fontSize: 16, fontWeight: 500, color: C.text, textDecoration: 'none', fontFamily: FONTS.body, padding: '12px 4px', borderBottom: `1px solid ${C.border}`, display: 'block' }}
                >
                  {label}
                </motion.a>
              ))}
            </div>

            {/* Auth buttons */}
            {!isAuthenticated && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { onLogin(); setMenuOpen(false); }}
                  style={{ width: '100%', padding: '12px 18px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', fontSize: 15, fontWeight: 600, color: C.textMid, cursor: 'pointer', fontFamily: FONTS.body, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <LogIn size={15} /> Sign in
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { onSignup(); setMenuOpen(false); }}
                  style={{ width: '100%', padding: '12px 18px', borderRadius: 10, background: C.gradGold, border: 'none', fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: FONTS.body, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 16px rgba(37,99,235,0.3)' }}
                >
                  Get started <ArrowRight size={15} />
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};