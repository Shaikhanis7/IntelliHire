// pages/LandingPage.tsx
// Aesthetic: Light Luxury — warm ivory · deep slate · gold · Fraunces + DM Sans
// All sections extracted to feature components, hooks, tokens

import React from 'react';
import { useLanding } from '../hooks/useLanding';
import { C, FONTS } from '../components/tokens/tokens';
import { Grain } from '../components/common/Primitives';
import { Navbar } from '../components/common/Navbar';
import { HeroSection } from '../components/common/HeroSection';
import { FeaturesSection, HowSection, Marquee } from '../components/common/FeaturesSection';
import { CTASection, Footer, TestimonialsSection } from '../components/common/TestimonialsSection';

const LandingPage: React.FC = () => {
  const { isAuthenticated, goAuth, goDashboard } = useLanding();

  return (
    <div style={{ fontFamily: FONTS.body, background: C.bg }}>
      {/* Global styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Fraunces:ital,wght@0,400;0,600;0,700;0,800;1,600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        ::selection { background: rgba(181,137,90,0.2); color: #0f172a; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #f8f5f0; }
        ::-webkit-scrollbar-thumb { background: rgba(181,137,90,0.3); border-radius: 99px; }
        @media (max-width: 680px) { .nav-links-landing { display: none !important; } }
      `}</style>

      {/* Paper grain texture */}
      <Grain />

      {/* Sections */}
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