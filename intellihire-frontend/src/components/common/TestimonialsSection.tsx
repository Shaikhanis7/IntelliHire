// features/landing/components/TestimonialsSection.tsx
// Blue Professional — amber stars, blue CTA gradient text, dark navy panel

import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Star, CheckCircle, ArrowRight, LayoutDashboard, Sparkles, Briefcase } from 'lucide-react';
import { C, FONTS } from '../tokens/tokens';
import { Pill, SectionHeader } from './Primitives';

/* ─── Testimonial data ───────────────────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    quote:  'We cut our time-to-shortlist from 3 days to 20 minutes. IntelliHire paid for itself in the first week.',
    name:   'Priya Sharma',
    role:   'Head of Talent, Fintech startup',
    avatar: 'PS',
    color:  C.gold,
  },
  {
    quote:  "The AI fit summaries are scarily accurate. My team can scan 50 candidates in the time it used to take for 5.",
    name:   'Marcus Lee',
    role:   'VP Engineering, SaaS Co.',
    avatar: 'ML',
    color:  C.teal,
  },
  {
    quote:  "External sourcing found us a candidate we'd never have found otherwise. Hired within 10 days.",
    name:   'Aisha Mensah',
    role:   'Talent Partner, Scale-up',
    avatar: 'AM',
    color:  C.indigo,
  },
];

/* ─── Testimonials section ───────────────────────────────────────────────────── */
export const TestimonialsSection: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section
      id="testimonials"
      style={{
        padding: '110px max(24px, calc((100vw - 1240px)/2))',
        background: C.bg,
      }}
    >
      <div ref={ref}>
        <SectionHeader
          inView={isInView}
          pill={<><Star size={11} fill="currentColor" /> Customer stories</>}
          pillColor={C.amber}
          pillBg={C.amberDim}
          title="Trusted by recruiting teams worldwide"
        />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
        gap: 18,
      }}>
        {TESTIMONIALS.map((t, i) => {
          const cardRef = useRef(null);
          const inView  = useInView(cardRef, { once: true, margin: '-60px' });

          return (
            <motion.div
              key={i}
              ref={cardRef}
              initial={{ opacity: 0, y: 36 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -5, boxShadow: C.shadowHov, borderColor: `${t.color}33` }}
              style={{
                padding: '30px 28px',
                background: C.bgCard,
                border: `1px solid ${C.border}`,
                borderRadius: 18,
                boxShadow: C.shadow,
                position: 'relative', overflow: 'hidden',
                transition: 'border-color 0.25s, box-shadow 0.25s, transform 0.25s',
              }}
            >
              {/* Decorative quote mark */}
              <span style={{
                position: 'absolute', top: 14, right: 22,
                fontSize: 72, fontWeight: 900,
                color: `${t.color}09`,
                lineHeight: 1, fontFamily: 'Georgia, serif', userSelect: 'none',
              }}>
                "
              </span>

              {/* Stars */}
              <div style={{ display: 'flex', gap: 3, marginBottom: 18 }}>
                {[...Array(5)].map((_, j) => (
                  <motion.div
                    key={j}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={inView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ delay: i * 0.1 + j * 0.05 + 0.3 }}
                  >
                    <Star size={14} color={C.amber} fill={C.amber} />
                  </motion.div>
                ))}
              </div>

              <p style={{
                fontSize: 15, color: C.textMid, lineHeight: 1.78,
                marginBottom: 26, fontStyle: 'italic', fontWeight: 400,
                fontFamily: FONTS.body,
              }}>
                "{t.quote}"
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 11,
                  background: `linear-gradient(135deg, ${t.color}cc, ${t.color})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
                  fontFamily: FONTS.body,
                }}>
                  {t.avatar}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: FONTS.display }}>
                    {t.name}
                  </div>
                  <div style={{ fontSize: 12.5, color: C.textFaint, marginTop: 1, fontFamily: FONTS.body }}>
                    {t.role}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

/* ─── CTA section ────────────────────────────────────────────────────────────── */
interface CTAProps {
  isAuthenticated: boolean;
  onSignup:    () => void;
  onDashboard: () => void;
}

export const CTASection: React.FC<CTAProps> = ({ isAuthenticated, onSignup, onDashboard }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section style={{ padding: '80px max(24px, calc((100vw - 1200px)/2))', background: C.bgAlt }}>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 36 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: 'linear-gradient(155deg, #0a1628 0%, #0f2044 50%, #0a1a38 100%)',
          borderRadius: 26, padding: '76px max(40px, 6vw)',
          textAlign: 'center', position: 'relative', overflow: 'hidden',
          border: `1px solid rgba(37,99,235,0.22)`,
          boxShadow: '0 0 80px rgba(37,99,235,0.1), 0 32px 80px rgba(10,22,40,0.2)',
        }}
      >
        {/* Blue glow orb */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 600, height: 300,
          background: 'radial-gradient(ellipse, rgba(37,99,235,0.14) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          borderRadius: 26, pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative' }}>
          <div style={{ marginBottom: 24 }}>
            <Pill color={C.goldLight} bg="rgba(37,99,235,0.14)" border="rgba(37,99,235,0.3)">
              <Sparkles size={11} /> Free 14-day trial · No credit card
            </Pill>
          </div>

          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.65, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontSize: 'clamp(28px, 5vw, 56px)', fontWeight: 800, color: '#f0f4fa',
              letterSpacing: '-2px', lineHeight: 1.08, margin: '0 0 18px',
              fontFamily: FONTS.display,
            }}
          >
            Ready to hire{' '}
            <span style={{
              background: 'linear-gradient(135deg, #60a5fa 0%, #93c5fd 55%, #a5b4fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: '#60a5fa',           // fallback
              display: 'inline-block',
            }}>
              10× faster?
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.55, delay: 0.25 }}
            style={{
              fontSize: 17, color: C.panelMuted, lineHeight: 1.75,
              maxWidth: 490, margin: '0 auto 44px', fontFamily: FONTS.body,
            }}
          >
            Join 1,200+ companies using IntelliHire to find, score, and hire exceptional talent — automatically.
          </motion.p>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 32 }}>
            {isAuthenticated ? (
              <motion.button
                whileHover={{ scale: 1.04, boxShadow: C.shadowGold }}
                whileTap={{ scale: 0.97 }}
                onClick={onDashboard}
                style={{
                  padding: '15px 36px', borderRadius: 12,
                  background: C.gradGold, border: 'none',
                  fontSize: 15.5, fontWeight: 700, color: '#fff',
                  cursor: 'pointer', fontFamily: FONTS.body,
                  display: 'flex', alignItems: 'center', gap: 9,
                  boxShadow: '0 6px 24px rgba(37,99,235,0.45)',
                }}
              >
                <LayoutDashboard size={15} /> Open Dashboard <ArrowRight size={15} />
              </motion.button>
            ) : (
              <>
                <motion.button
                  whileHover={{ scale: 1.04, boxShadow: C.shadowGold }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onSignup}
                  style={{
                    padding: '15px 36px', borderRadius: 12,
                    background: C.gradGold, border: 'none',
                    fontSize: 15.5, fontWeight: 700, color: '#fff',
                    cursor: 'pointer', fontFamily: FONTS.body,
                    display: 'flex', alignItems: 'center', gap: 9,
                    boxShadow: '0 6px 24px rgba(37,99,235,0.45)',
                  }}
                >
                  Get started free <ArrowRight size={15} />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03, borderColor: C.gold, color: C.goldLight }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    padding: '15px 32px', borderRadius: 12,
                    border: `1.5px solid rgba(255,255,255,0.14)`,
                    background: 'rgba(255,255,255,0.06)',
                    fontSize: 15.5, fontWeight: 600, color: C.panelMuted,
                    cursor: 'pointer', fontFamily: FONTS.body,
                    transition: 'border-color 0.2s, color 0.2s',
                  }}
                >
                  Talk to sales
                </motion.button>
              </>
            )}
          </div>

          {/* Trust badges */}
          <div style={{ display: 'flex', gap: 28, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['No credit card required', 'Cancel anytime', 'SOC 2 compliant'].map(t => (
              <motion.span
                key={t}
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.5 }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 13, color: C.panelMuted, fontWeight: 500,
                  fontFamily: FONTS.body,
                }}
              >
                <CheckCircle size={13} color={C.teal} /> {t}
              </motion.span>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
};

/* ─── Footer ─────────────────────────────────────────────────────────────────── */
export const Footer: React.FC = () => (
  <footer style={{
    padding: '32px max(24px, calc((100vw - 1240px)/2))',
    background: C.bg, borderTop: `1px solid ${C.border}`,
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
  }}>
    {/* Brand */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: C.gradGold,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Briefcase size={13} color="#fff" />
      </div>
      <span style={{
        fontSize: 15, fontWeight: 700, color: C.text,
        letterSpacing: '-0.3px', fontFamily: FONTS.display,
      }}>
        IntelliHire
      </span>
    </div>

    {/* Copyright */}
    <p style={{ fontSize: 12.5, color: C.textFaint, margin: 0, fontFamily: FONTS.body }}>
      © {new Date().getFullYear()} IntelliHire. All rights reserved.
    </p>

    {/* Links */}
    <div style={{ display: 'flex', gap: 24 }}>
      {['Privacy', 'Terms', 'Contact'].map(l => (
        <motion.a
          key={l}
          href="#"
          whileHover={{ color: C.gold }}
          style={{
            fontSize: 13, color: C.textMuted,
            textDecoration: 'none', transition: 'color 0.15s',
            fontWeight: 500, fontFamily: FONTS.body,
          }}
        >
          {l}
        </motion.a>
      ))}
    </div>
  </footer>
);