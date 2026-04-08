// features/landing/components/Primitives.tsx
// Shared micro-components for LandingPage — Blue Professional theme

import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { C, FONTS } from '../tokens/tokens';

/* ─── Pill badge ─────────────────────────────────────────────────────────────── */
export const Pill: React.FC<{
  children: React.ReactNode;
  color?: string;
  bg?: string;
  border?: string;
}> = ({ children, color = C.gold, bg = C.goldDim, border }) => (
  <motion.span
    initial={{ opacity: 0, scale: 0.92 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      padding: '6px 16px', borderRadius: 99,
      background: bg, color,
      border: `1px solid ${border ?? color + '30'}`,
      fontSize: 12, fontWeight: 700, letterSpacing: 0.6,
      textTransform: 'uppercase' as const,
      fontFamily: FONTS.body,
    }}
  >
    {children}
  </motion.span>
);

/* ─── Scroll-triggered wrapper ───────────────────────────────────────────────── */
export const InView: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div ref={ref} initial="hidden" animate={isInView ? 'visible' : 'hidden'} style={style}>
      {children}
    </motion.div>
  );
};

/* ─── Warm mesh background ───────────────────────────────────────────────────── */
export const MeshBg: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
    {/* Blue primary blob */}
    <motion.div
      animate={{ scale: [1, 1.14, 1], opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        position: 'absolute', top: '-15%', right: '25%',
        width: 680, height: 680, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,0.09) 0%, transparent 65%)',
      }}
    />
    {/* Teal blob */}
    <motion.div
      animate={{ scale: [1, 1.18, 1], opacity: [0.3, 0.55, 0.3] }}
      transition={{ duration: 17, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      style={{
        position: 'absolute', bottom: '-8%', left: '15%',
        width: 520, height: 520, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(13,148,136,0.07) 0%, transparent 65%)',
      }}
    />
    {/* Indigo blob */}
    <motion.div
      animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
      transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      style={{
        position: 'absolute', top: '45%', right: '-5%',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(79,70,229,0.06) 0%, transparent 65%)',
      }}
    />
    {/* Subtle dot grid */}
    <div style={{
      position: 'absolute', inset: 0,
      backgroundImage: 'radial-gradient(circle, rgba(30,41,59,0.06) 1px, transparent 1px)',
      backgroundSize: '28px 28px',
    }} />
  </div>
);

/* ─── Paper grain overlay ────────────────────────────────────────────────────── */
export const Grain: React.FC = () => (
  <div style={{
    position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999,
    opacity: 0.028,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'repeat',
    backgroundSize: '200px 200px',
  }} />
);

/* ─── Animated stat counter ──────────────────────────────────────────────────── */
export const Counter: React.FC<{ end: string; label: string; delay: number }> = ({ end, label, delay }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
      style={{ textAlign: 'center' }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.4, delay: delay + 0.2 }}
        style={{
          fontSize: 'clamp(30px, 4vw, 46px)',
          fontWeight: 800, letterSpacing: '-2px', lineHeight: 1,
          fontFamily: FONTS.display,
          background: C.gradGold,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}
      >
        {end}
      </motion.div>
      <div style={{ fontSize: 13, color: C.textMuted, marginTop: 7, fontWeight: 500, fontFamily: FONTS.body }}>
        {label}
      </div>
    </motion.div>
  );
};

/* ─── Section header (reusable) ──────────────────────────────────────────────── */
export const SectionHeader: React.FC<{
  pill: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  pillColor?: string;
  pillBg?: string;
  inView: boolean;
}> = ({ pill, title, subtitle, pillColor, pillBg, inView }) => (
  <div style={{ textAlign: 'center', marginBottom: 64 }}>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55 }}
      style={{ marginBottom: 18 }}
    >
      <Pill color={pillColor} bg={pillBg}>{pill}</Pill>
    </motion.div>
    <motion.h2
      initial={{ opacity: 0, y: 22 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      style={{
        fontSize: 'clamp(26px, 4vw, 48px)',
        fontWeight: 800, color: C.text,
        letterSpacing: '-1.5px', lineHeight: 1.08,
        margin: '0 0 16px', fontFamily: FONTS.display,
      }}
    >
      {title}
    </motion.h2>
    {subtitle && (
      <motion.p
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.55, delay: 0.22 }}
        style={{
          fontSize: 16, color: C.textMuted,
          maxWidth: 500, margin: '0 auto', lineHeight: 1.78,
          fontFamily: FONTS.body,
        }}
      >
        {subtitle}
      </motion.p>
    )}
  </div>
);