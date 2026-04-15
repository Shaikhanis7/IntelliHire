// pages/LandingPage.tsx — Fully responsive for all breakpoints

import React from 'react';
import { useLanding } from '../hooks/useLanding';
import { C, FONTS } from '../components/tokens/tokens';
import { Grain } from '../components/common/Primitives';
import { Navbar } from '../components/common/Navbar';
import { HeroSection } from '../components/common/HeroSection';
import { FeaturesSection, HowSection, Marquee } from '../components/common/FeaturesSection';
import { CTASection, Footer, TestimonialsSection } from '../components/common/TestimonialsSection';
import { ArchitectureSection } from '../components/common/ArchitectureSection';

const LandingPage: React.FC = () => {
  const { isAuthenticated, goAuth, goDashboard } = useLanding();

  return (
    <div style={{ fontFamily: FONTS.body, background: C.bg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Fraunces:ital,wght@0,400;0,600;0,700;0,800;1,600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }

        ::selection { background: rgba(181,137,90,0.2); color: #0f172a; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #f8f5f0; }
        ::-webkit-scrollbar-thumb { background: rgba(181,137,90,0.3); border-radius: 99px; }

        /* ── Navbar ── */
        .nav-links-landing { display: flex; }
        .nav-auth-landing  { display: flex; }

        /* ── Hero ── */
        .hero-stats {
          display: flex;
          gap: 60px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .hero-ctas {
          display: flex;
          gap: 14px;
          justify-content: center;
          flex-wrap: wrap;
        }

        /* ── Section padding utility ── */
        .section-pad {
          padding-top: 110px;
          padding-bottom: 110px;
        }

        /* ── Features grid ── */
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 18px;
        }

        /* ── How-it-works grid ── */
        .how-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
        }

        /* ── Testimonials grid ── */
        .testimonials-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
          gap: 18px;
        }

        /* ── Architecture nodes ── */
        .arch-node-row {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        /* ── CTA panel ── */
        .cta-buttons {
          display: flex;
          gap: 14px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .cta-badges {
          display: flex;
          gap: 28px;
          justify-content: center;
          flex-wrap: wrap;
        }

        /* ── Footer ── */
        .footer-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        /* ── Marquee ── */
        .marquee-wrap { overflow: hidden; }

        /* ────────────────────────────────────────
           TABLET  (≤ 900px)
        ──────────────────────────────────────── */
        @media (max-width: 900px) {
          .section-pad {
            padding-top: 80px;
            padding-bottom: 80px;
          }

          .features-grid {
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          }

          .how-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .testimonials-grid {
            grid-template-columns: 1fr;
          }

          .arch-diagram-card {
            padding: 28px 20px 36px !important;
          }

          .hero-stats {
            gap: 36px;
          }
        }

        /* ────────────────────────────────────────
           MOBILE  (≤ 680px)
        ──────────────────────────────────────── */
        @media (max-width: 680px) {
          /* Navbar */
          .nav-links-landing { display: none !important; }
          .nav-auth-landing  { gap: 8px !important; }
          .nav-auth-landing .nav-signup-btn {
            padding: 9px 18px !important;
            font-size: 13.5px !important;
          }

          /* Hero */
          .hero-section {
            padding: 100px 20px 80px !important;
            min-height: auto !important;
          }
          .hero-ctas {
            flex-direction: column;
            align-items: center;
          }
          .hero-ctas button {
            width: 100%;
            max-width: 320px;
            justify-content: center;
          }
          .hero-stats {
            gap: 24px;
          }
          .hero-stats > div {
            min-width: 80px;
          }

          /* Sections */
          .section-pad {
            padding-top: 64px;
            padding-bottom: 64px;
          }
          .section-px {
            padding-left: 20px !important;
            padding-right: 20px !important;
          }

          /* Section headers */
          .section-title {
            font-size: clamp(26px, 8vw, 40px) !important;
            letter-spacing: -1.5px !important;
          }
          .section-subtitle {
            font-size: 14px !important;
          }

          /* Features */
          .features-grid {
            grid-template-columns: 1fr;
          }

          /* How-it-works */
          .how-grid {
            grid-template-columns: 1fr;
          }

          /* Testimonials */
          .testimonials-grid {
            grid-template-columns: 1fr;
          }

          /* Architecture */
          .arch-diagram-card {
            padding: 20px 14px 28px !important;
            border-radius: 14px !important;
          }
          .arch-fork-arrows,
          .arch-merge-arrows {
            display: none !important;
          }
          .arch-node-row {
            flex-direction: column;
            align-items: center;
          }
          .arch-node-row > * {
            width: 100% !important;
            max-width: 100% !important;
            min-width: unset !important;
          }
          /* Wide nodes fill full width on mobile */
          [data-wide="true"] {
            min-width: unset !important;
            max-width: 100% !important;
            width: 100% !important;
          }

          /* CTA */
          .cta-panel {
            padding: 52px 24px !important;
            border-radius: 18px !important;
          }
          .cta-buttons {
            flex-direction: column;
            align-items: center;
          }
          .cta-buttons button {
            width: 100%;
            max-width: 300px;
            justify-content: center;
          }
          .cta-badges {
            gap: 16px;
            flex-direction: column;
            align-items: center;
          }

          /* Footer */
          .footer-inner {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          .footer-links {
            justify-content: center;
          }
        }

        /* ────────────────────────────────────────
           SMALL MOBILE  (≤ 400px)
        ──────────────────────────────────────── */
        @media (max-width: 400px) {
          .hero-section {
            padding: 90px 16px 70px !important;
          }
          .cta-panel {
            padding: 40px 16px !important;
          }
          .arch-diagram-card {
            padding: 16px 10px 22px !important;
          }
        }
      `}</style>

      <Grain />

      <Navbar
        isAuthenticated={isAuthenticated}
        onLogin={goAuth}
        onSignup={goAuth}
        onDashboard={goDashboard}
      />

      <HeroSection
        isAuthenticated={isAuthenticated}
        onSignup={goAuth}
        onDashboard={goDashboard}
      />

      <Marquee />
      <FeaturesSection />
      <HowSection />
      <ArchitectureSection />
      <TestimonialsSection />

      <CTASection
        isAuthenticated={isAuthenticated}
        onSignup={goAuth}
        onDashboard={goDashboard}
      />

      <Footer />
    </div>
  );
};

export default LandingPage;