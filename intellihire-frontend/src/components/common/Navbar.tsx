// features/landing/components/Navbar.tsx
// Blue Professional theme — cool ivory + slate + cobalt

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, LogIn, ArrowRight, LayoutDashboard } from 'lucide-react';
import { C, FONTS } from '../tokens/tokens';

interface NavbarProps {
  isAuthenticated: boolean;
  onLogin:     () => void;
  onSignup:    () => void;
  onDashboard: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isAuthenticated, onLogin, onSignup, onDashboard,
}) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 68,
        background: scrolled ? 'rgba(240,244,250,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px) saturate(160%)' : 'none',
        borderBottom: scrolled ? `1px solid ${C.border}` : '1px solid transparent',
        transition: 'all 0.3s ease',
        display: 'flex', alignItems: 'center',
        padding: '0 max(24px, calc((100vw - 1200px)/2))',
        gap: 40,
      }}
    >
      {/* Logo */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 11, flex: 1, cursor: 'pointer' }}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <motion.div
          whileHover={{ scale: 1.08, rotate: -5 }}
          transition={{ type: 'spring', stiffness: 400 }}
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: C.gradGold,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(37,99,235,0.35)',
          }}
        >
          <Briefcase size={16} color="#fff" />
        </motion.div>
        <span style={{
          fontSize: 18, fontWeight: 700, color: C.text,
          letterSpacing: '-0.5px', fontFamily: FONTS.display,
        }}>
          IntelliHire
        </span>
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: 32 }} className="nav-links-landing">
        {[
          ['Features',      '#features'     ],
          ['How it works',  '#how-it-works' ],
          ['Testimonials',  '#testimonials' ],
        ].map(([label, href], i) => (
          <motion.a
            key={label}
            href={href}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
            whileHover={{ color: C.gold }}
            style={{
              fontSize: 14, fontWeight: 500, color: C.textMuted,
              textDecoration: 'none', transition: 'color 0.15s',
              fontFamily: FONTS.body,
            }}
          >
            {label}
          </motion.a>
        ))}
      </div>

      {/* CTAs */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {isAuthenticated ? (
          <motion.button
            whileHover={{ scale: 1.03, boxShadow: C.shadowGold }}
            whileTap={{ scale: 0.97 }}
            onClick={onDashboard}
            style={{
              padding: '8px 20px', borderRadius: 9,
              background: C.gradGold, border: 'none',
              fontSize: 13.5, fontWeight: 700, color: '#fff',
              cursor: 'pointer', fontFamily: FONTS.body,
              display: 'flex', alignItems: 'center', gap: 7,
              boxShadow: '0 4px 16px rgba(37,99,235,0.3)',
            }}
          >
            <LayoutDashboard size={14} /> Dashboard
          </motion.button>
        ) : (
          <>
            <motion.button
              whileHover={{ color: C.gold, borderColor: C.gold }}
              whileTap={{ scale: 0.97 }}
              onClick={onLogin}
              style={{
                padding: '8px 18px', borderRadius: 9,
                border: `1px solid ${C.border}`, background: 'transparent',
                fontSize: 13.5, fontWeight: 600, color: C.textMid,
                cursor: 'pointer', fontFamily: FONTS.body,
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              <LogIn size={13} /> Sign in
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04, boxShadow: C.shadowGold }}
              whileTap={{ scale: 0.97 }}
              onClick={onSignup}
              style={{
                padding: '8px 20px', borderRadius: 9,
                background: C.gradGold, border: 'none',
                fontSize: 13.5, fontWeight: 700, color: '#fff',
                cursor: 'pointer', fontFamily: FONTS.body,
                display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 4px 16px rgba(37,99,235,0.3)',
              }}
            >
              Get started <ArrowRight size={13} />
            </motion.button>
          </>
        )}
      </div>
    </motion.nav>
  );
};