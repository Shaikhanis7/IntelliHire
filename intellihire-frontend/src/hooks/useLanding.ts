// features/landing/hooks/useLanding.ts
// Custom hook — landing page navigation + auth state

import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../app/store';

export const useLanding = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((s: RootState) => s.auth);

  const goAuth      = () => navigate('/auth');
  const goDashboard = () => navigate('/dashboard');

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return {
    isAuthenticated,
    goAuth,
    goDashboard,
    scrollToSection,
  };
};