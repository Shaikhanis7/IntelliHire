import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

import { DashboardLayout }  from '../layouts/DashboardLayout';
import { ProtectedRoute }   from '../components/common/ProtectedRoute';

import AuthPage             from '../features/auth/components/AuthPage';
import DashboardPage        from '../pages/DashboardPage';
import ResumeSearchPage     from '../pages/ResumeSearchPage';
import JobPostingsPage      from '../pages/JobPostingsPage';
import JobDetailsPage       from '../pages/JobDetailsPage';
import ApplicationsPage     from '../pages/ApplicationsPage';
import MyApplicationsPage   from '../pages/MyApplicationsPage';
import SourcingPage         from '../pages/SourcingPage';
import CompanyProfilePage   from '../pages/CompanyProfilePage';
import LandingPage          from '../pages/LandingPage';
import CandidateDashboard   from '../pages/CandidateDashboard';

import type { RootState } from '../app/store';

/* ── Role dashboard ──────────────────────────────────────────────────────── */
const RoleDashboard: React.FC = () => {
  const { user } = useSelector((s: RootState) => s.auth);
  if (user?.role === 'candidate') return <CandidateDashboard />;
  if (user?.role === 'recruiter') return <DashboardPage />;
  if (user?.role === 'admin')     return <DashboardPage />;
  return <Navigate to="/" replace />;
};

/* ── AuthGuard — redirect already-logged-in users away from /auth ────────── */
const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isInitialized } = useSelector((s: RootState) => s.auth);
  if (!isInitialized) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

export const router = createBrowserRouter([
  // ── Public ──────────────────────────────────────────────────────────────
  { path: '/', element: <LandingPage /> },

  {
    path: '/auth',
    element: (
      <AuthGuard>
        <AuthPage />
      </AuthGuard>
    ),
  },

  // ── Protected ────────────────────────────────────────────────────────────
  {
    element: <ProtectedRoute redirectTo="/auth" />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          // /dashboard — entry point for all authenticated users
          { path: 'dashboard', element: <RoleDashboard /> },

          // Shared routes (all authenticated roles)
          { path: 'jobs',     element: <JobPostingsPage /> },
          { path: 'jobs/:id', element: <JobDetailsPage /> },

          // Candidate-only
          {
            path: 'my-applications',
            element: (
              <ProtectedRoute role="candidate" unauthorizedRedirect="/dashboard">
                <MyApplicationsPage />
              </ProtectedRoute>
            ),
          },

          // Recruiter + Admin
          {
            path: 'resumes',
            element: (
              <ProtectedRoute role={['recruiter', 'admin']} unauthorizedRedirect="/dashboard">
                <ResumeSearchPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'applications',
            element: (
              <ProtectedRoute role={['recruiter', 'admin']} unauthorizedRedirect="/dashboard">
                <ApplicationsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'sourcing',
            element: (
              <ProtectedRoute role={['recruiter', 'admin']} unauthorizedRedirect="/dashboard">
                <SourcingPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'company',
            element: (
              <ProtectedRoute role={['recruiter', 'admin']} unauthorizedRedirect="/dashboard">
                <CompanyProfilePage />
              </ProtectedRoute>
            ),
          },
        ],
      },
    ],
  },

  // Catch-all
  { path: '*', element: <Navigate to="/" replace /> },
]);