// features/landing/components/HeroSection.tsx
// Blue Professional — cobalt CTAs, visible gradient text, parallax scroll

import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Play, LayoutDashboard, Sparkles } from 'lucide-react';
import { C, FONTS } from '../tokens/tokens';
import { Pill, MeshBg, Counter } from './Primitives';

interface HeroSectionProps {
  isAuthenticated: boolean;
  onSignup:    () => void;
  onDashboard: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  isAuthenticated, onSignup, onDashboard,
}) => {
  const { scrollY } = useScroll();
  const y       = useTransform(scrollY, [0, 600], [0, 140]);
  const opacity = useTransform(scrollY, [0, 380], [1, 0]);

  return (
    <section style={{
      minHeight: '100vh',
      background: C.gradHero,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '120px max(24px, calc((100vw - 1100px)/2)) 100px',
      position: 'relative', overflow: 'hidden',
    }}>
      <MeshBg />

      {/* Decorative rings */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute', top: '10%', right: '8%',
            width: 220, height: 220, borderRadius: '50%',
            border: '1px solid rgba(37,99,235,0.18)',
          }}
        >
          <div style={{
            position: 'absolute', top: -5, left: '50%', transform: 'translateX(-50%)',
            width: 10, height: 10, borderRadius: '50%',
            background: 'rgba(37,99,235,0.6)',
          }} />
        </motion.div>

        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute', bottom: '15%', left: '5%',
            width: 140, height: 140, borderRadius: '50%',
            border: '1px solid rgba(13,148,136,0.15)',
          }}
        />

        {/* Dot grid accent */}
        {Array.from({ length: 16 }, (_, i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2.5 + (i % 3), repeat: Infinity, delay: i * 0.18 }}
            style={{
              position: 'absolute',
              bottom: 80 + Math.floor(i / 4) * 24,
              right: 80 + (i % 4) * 24,
              width: 4, height: 4, borderRadius: '50%',
              background: 'rgba(37,99,235,0.25)',
            }}
          />
        ))}
      </div>

      <motion.div style={{ y, opacity, textAlign: 'center', maxWidth: 860, position: 'relative', zIndex: 1 }}>

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ marginBottom: 28 }}
        >
          <Pill>
            <motion.span
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 2 }}
              style={{ display: 'inline-flex' }}
            >
              <Sparkles size={11} />
            </motion.span>
            AI-Powered Recruitment Platform
          </Pill>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontSize: 'clamp(44px, 7.5vw, 86px)',
            fontWeight: 800, lineHeight: 1.03,
            letterSpacing: '-3px', margin: '0 0 24px',
            fontFamily: FONTS.display,
            color: C.text,
          }}
        >
          Hire brilliantly.{' '}
          <span style={{
            background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 55%, #4f46e5 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            color: '#1d4ed8',         // fallback
            display: 'inline-block',
          }}>
            Hire faster.
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontSize: 'clamp(15px, 2vw, 19px)', color: C.textMuted,
            lineHeight: 1.8, maxWidth: 580, margin: '0 auto 48px',
            fontWeight: 400, fontFamily: FONTS.body,
          }}
        >
          IntelliHire's AI engine sources candidates, scores resumes, and shortlists
          the best fits — automatically, before your first coffee.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.34, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 72 }}
        >
          {isAuthenticated ? (
            <motion.button
              whileHover={{ scale: 1.04, boxShadow: C.shadowGold }}
              whileTap={{ scale: 0.97 }}
              onClick={onDashboard}
              style={{
                padding: '16px 36px', borderRadius: 12,
                background: C.gradGold, border: 'none',
                fontSize: 15.5, fontWeight: 700, color: '#fff',
                cursor: 'pointer', fontFamily: FONTS.body,
                boxShadow: '0 6px 24px rgba(37,99,235,0.35)',
                display: 'flex', alignItems: 'center', gap: 9,
              }}
            >
              <LayoutDashboard size={16} /> Go to Dashboard <ArrowRight size={15} />
            </motion.button>
          ) : (
            <>
              <motion.button
                whileHover={{ scale: 1.04, boxShadow: C.shadowGold }}
                whileTap={{ scale: 0.97 }}
                onClick={onSignup}
                style={{
                  padding: '16px 36px', borderRadius: 12,
                  background: C.gradGold, border: 'none',
                  fontSize: 15.5, fontWeight: 700, color: '#fff',
                  cursor: 'pointer', fontFamily: FONTS.body,
                  boxShadow: '0 6px 24px rgba(37,99,235,0.35)',
                  display: 'flex', alignItems: 'center', gap: 9,
                }}
              >
                Start hiring free <ArrowRight size={15} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03, borderColor: C.gold, color: C.goldDeep }}
                whileTap={{ scale: 0.97 }}
                style={{
                  padding: '16px 32px', borderRadius: 12,
                  border: `1.5px solid ${C.borderMid}`,
                  background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)',
                  fontSize: 15.5, fontWeight: 600, color: C.textMid,
                  cursor: 'pointer', fontFamily: FONTS.body,
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'border-color 0.2s, color 0.2s',
                }}
              >
                <Play size={14} fill="currentColor" /> Watch demo
              </motion.button>
            </>
          )}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          style={{
            display: 'flex', gap: 60, justifyContent: 'center', flexWrap: 'wrap',
            paddingTop: 48, borderTop: `1px solid ${C.border}`,
          }}
        >
          {[
            { val: '1,200+', label: 'Companies hiring'    },
            { val: '68%',    label: 'Faster time-to-hire' },
            { val: '4.9★',   label: 'Average rating'      },
          ].map((s, i) => (
            <Counter key={s.label} end={s.val} label={s.label} delay={0.55 + i * 0.12} />
          ))}
        </motion.div>
      </motion.div>

      {/* Bottom fade into next section */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 140,
        background: `linear-gradient(to bottom, transparent, ${C.bg})`,
        pointerEvents: 'none',
      }} />
    </section>
  );
};