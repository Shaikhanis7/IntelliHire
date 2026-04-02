// features/landing/components/FeaturesSection.tsx
// Light luxury — ivory cards, gold/teal/indigo accent icons

import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Brain, Sparkles, BarChart3, Zap, Globe, Shield, TrendingUp } from 'lucide-react';
import { C, FONTS } from '../tokens/tokens';
import { Pill, MeshBg, SectionHeader } from './Primitives';

/* ─── Feature data ───────────────────────────────────────────────────────────── */
const FEATURES = [
  { Icon: Brain,     title: 'AI Resume Parsing',      desc: 'Instantly extract skills, seniority and contact data from any PDF with LLM precision.',                           color: C.gold,   bg: C.goldDim   },
  { Icon: Sparkles,  title: 'Agentic Sourcing',        desc: 'AI agent queries your internal DB and external boards simultaneously, de-dupes, and ranks every result.',         color: C.indigo, bg: C.indigoDim },
  { Icon: BarChart3, title: 'Dual-Engine Scoring',     desc: 'Semantic embeddings catch nuance; rule-based scoring enforces hard requirements like minimum experience.',         color: C.teal,   bg: C.tealDim   },
  { Icon: Zap,       title: 'One-Click Shortlisting',  desc: 'Score every applicant and surface the top N automatically — no spreadsheets, zero manual sorting.',               color: C.amber,  bg: C.amberDim  },
  { Icon: Globe,     title: 'External Board Scraping', desc: 'Rotate LLM-generated query variants across boards. New candidates only — not duplicates you already have.',       color: C.teal,   bg: C.tealDim   },
  { Icon: Shield,    title: 'Role-Based Access',        desc: 'Recruiters and candidates each get a secure, tailored experience. Zero data leakage between roles.',               color: C.indigo, bg: C.indigoDim },
];

/* ─── Single feature card ────────────────────────────────────────────────────── */
const FeatureCard: React.FC<{
  Icon: React.ElementType; title: string; desc: string;
  color: string; bg: string; index: number;
}> = ({ Icon, title, desc, color, bg, index }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 36 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, boxShadow: C.shadowHov, borderColor: color + '44' }}
      style={{
        padding: '28px 26px',
        border: `1px solid ${C.border}`,
        borderRadius: 18,
        background: C.bgCard,
        boxShadow: C.shadow,
        transition: 'border-color 0.25s, box-shadow 0.25s, transform 0.25s',
        cursor: 'default',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Top accent line on hover */}
      <motion.div
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        }}
      />

      <motion.div
        whileHover={{ scale: 1.1, rotate: -7 }}
        transition={{ type: 'spring', stiffness: 300 }}
        style={{
          width: 48, height: 48, borderRadius: 14, marginBottom: 20,
          background: bg, border: `1px solid ${color}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon size={21} color={color} strokeWidth={1.7} />
      </motion.div>

      <h3 style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 11, letterSpacing: '-0.3px', fontFamily: FONTS.display }}>
        {title}
      </h3>
      <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.78, margin: 0 }}>{desc}</p>
    </motion.div>
  );
};

/* ─── Features section ───────────────────────────────────────────────────────── */
export const FeaturesSection: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="features" style={{ padding: '110px max(24px, calc((100vw - 1240px)/2))', background: C.bg, position: 'relative' }}>
      <div ref={ref}>
        <SectionHeader
          inView={isInView}
          pill={<><Zap size={11} /> Platform capabilities</>}
          pillColor={C.gold}
          pillBg={C.goldDim}
          title="Everything you need to hire brilliantly"
          subtitle="From parsing to pipeline — IntelliHire automates the tedious so your team can focus on what matters."
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
        {FEATURES.map((f, i) => <FeatureCard key={i} {...f} index={i} />)}
      </div>
    </section>
  );
};

/* ─── Marquee ticker ─────────────────────────────────────────────────────────── */
const MARQUEE_ITEMS = ['AI Sourcing', 'Resume Scoring', 'Smart Shortlisting', 'Pipeline Automation', 'Dual-Engine Ranking', 'External Board Scraping', 'Role-Based Access', 'Fit Summaries'];

export const Marquee: React.FC = () => (
  <div style={{
    padding: '18px 0',
    background: C.panel,
    borderTop: `1px solid ${C.panelBorder}`,
    borderBottom: `1px solid ${C.panelBorder}`,
    overflow: 'hidden', position: 'relative',
  }}>
    <motion.div
      animate={{ x: [0, -52 * MARQUEE_ITEMS.length] }}
      transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
      style={{ display: 'flex', gap: 0, width: 'max-content' }}
    >
      {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
        <span key={i} style={{
          display: 'inline-flex', alignItems: 'center', gap: 12,
          padding: '0 30px', whiteSpace: 'nowrap',
          fontSize: 12.5, fontWeight: 600, color: C.panelMuted, letterSpacing: 0.8,
          textTransform: 'uppercase',
        }}>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: C.gold, display: 'inline-block', opacity: 0.7 }} />
          {item}
        </span>
      ))}
    </motion.div>
  </div>
);

/* ─── How It Works section ───────────────────────────────────────────────────── */
import { Briefcase, Award } from 'lucide-react';

const HOW_STEPS = [
  { n: '01', Icon: Briefcase,  title: 'Post a job',         desc: 'Define the role, required skills, and experience level. Takes under 2 minutes.',    accent: C.gold,  bg: C.goldDim  },
  { n: '02', Icon: Brain,      title: 'AI sources talent',  desc: 'Sourcing agent scans your DB and external boards, filtering by eligibility.',         accent: C.teal,  bg: C.tealDim  },
  { n: '03', Icon: BarChart3,  title: 'Review ranked list', desc: 'Every candidate scored, summarised, and ranked. Filter by tag or score.',              accent: C.gold,  bg: C.goldDim  },
  { n: '04', Icon: Award,      title: 'Hire the best',      desc: 'Shortlist, schedule interviews, and move candidates through the pipeline.',            accent: C.teal,  bg: C.tealDim  },
];

export const HowSection: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="how-it-works" style={{
      padding: '110px max(24px, calc((100vw - 1240px)/2))',
      background: C.surface, position: 'relative', overflow: 'hidden',
    }}>
      <MeshBg />

      <div ref={ref} style={{ position: 'relative' }}>
        <SectionHeader
          inView={isInView}
          pill={<><TrendingUp size={11} /> How it works</>}
          pillColor={C.teal}
          pillBg={C.tealDim}
          title="From job post to hire in 4 steps"
          subtitle="IntelliHire handles the heavy lifting so your team can spend time on people, not process."
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          {HOW_STEPS.map(({ n, Icon, title, desc, accent, bg }, i) => {
            const stepRef = useRef(null);
            const inView  = useInView(stepRef, { once: true, margin: '-60px' });
            return (
              <motion.div
                key={i} ref={stepRef}
                initial={{ opacity: 0, y: 36 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -5, boxShadow: C.shadowHov }}
                style={{
                  background: C.bgCard, border: `1px solid ${C.border}`,
                  borderRadius: 18, padding: '30px 26px',
                  boxShadow: C.shadow, position: 'relative', overflow: 'hidden',
                  transition: 'box-shadow 0.25s, transform 0.25s',
                }}
              >
                {/* Number watermark */}
                <span style={{
                  position: 'absolute', top: 10, right: 16,
                  fontSize: 62, fontWeight: 900,
                  color: `${accent}09`,
                  lineHeight: 1, letterSpacing: '-4px', userSelect: 'none',
                  fontFamily: FONTS.display,
                }}>{n}</span>

                <motion.div
                  whileHover={{ scale: 1.1 }}
                  style={{
                    width: 46, height: 46, borderRadius: 13, marginBottom: 20,
                    background: bg, border: `1px solid ${accent}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Icon size={20} color={accent} strokeWidth={1.7} />
                </motion.div>

                <h3 style={{ fontSize: 16.5, fontWeight: 700, color: C.text, marginBottom: 10, letterSpacing: '-0.2px', fontFamily: FONTS.display }}>{title}</h3>
                <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.75, margin: 0 }}>{desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};