import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Loader2 } from 'lucide-react';
import type { RootState } from '../../app/store';

interface ProtectedRouteProps {
  role?:                 string;
  redirectTo?:           string;   // where to send unauthenticated users (default: '/')
  unauthorizedRedirect?: string;   // where to send wrong-role users  (default: '/dashboard')
  children?:             React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  role,
  redirectTo           = '/',           // ← unauthenticated → Landing page
  unauthorizedRedirect = '/dashboard',  // ← wrong role      → Dashboard
  children,
}) => {
  const { user, isAuthenticated, isInitialized } = useSelector(
    (s: RootState) => s.auth
  );
  const location = useLocation();

  /* ── 1. Still bootstrapping ─────────────────────────────────────────────── */
  if (!isInitialized) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 12, background: '#FAFAF8',
      }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <Loader2 size={32} color="#1D9E75" style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 13, color: '#888780' }}>Loading…</span>
      </div>
    );
  }

  /* ── 2. Not authenticated → Landing (or caller-specified redirectTo) ─────── */
  if (!isAuthenticated) {
    return (
      <Navigate
        to={redirectTo}
        state={{ from: location }}
        replace
      />
    );
  }

  /* ── 3. Authenticated but wrong role → Dashboard (or unauthorizedRedirect) ─ */
  if (role && user?.role !== role) {
    return <Navigate to={unauthorizedRedirect} replace />;
  }

  /* ── 4. All good ─────────────────────────────────────────────────────────── */
  return <>{children ?? <Outlet />}</>;
};

export default ProtectedRoute;