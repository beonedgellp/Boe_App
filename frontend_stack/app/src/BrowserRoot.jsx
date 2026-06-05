import React, { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SessionProvider } from '@beonedge/client/store/SessionContext.jsx';
import { AdminSessionProvider, useAdminSession } from '@beonedge/client/store/AdminSessionContext.jsx';
import { RouteErrorBoundary } from '@beonedge/shared/components/RouteErrorBoundary.jsx';

// The public education landing page is now the standalone Next.js app. Desktop
// visitors to the root are sent there; configure per environment.
const LANDING_URL = import.meta.env.VITE_BEO_LANDING_URL || 'http://127.0.0.1:3100/';

const Admin = lazy(() => import('@beonedge/admin/pages/Admin.jsx'));
const AdminLogin = lazy(() => import('@beonedge/admin/pages/AdminLogin.jsx'));
const ClientApp = lazy(() => import('@beonedge/client/ClientApp.jsx'));

function isMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function hasRole(user, role) {
  const expected = role.toLowerCase();
  return (
    String(user?.role || '').toLowerCase() === expected ||
    String(user?.accountType || '').toLowerCase() === expected ||
    user?.roles?.some((value) => String(value).toLowerCase() === expected)
  );
}

function RequireAdmin({ children }) {
  const { user, isLoading } = useAdminSession();
  const location = useLocation();

  if (isLoading) return null;

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/admin/login?from=${redirect}`} replace />;
  }

  if (!hasRole(user, 'admin')) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return children;
}

const Page = ({ children }) => (
  <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
    {children}
  </Suspense>
);

// Hard redirect to an external app (the Next.js landing page).
function ExternalRedirect({ to }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return <div style={{ minHeight: '100vh' }} />;
}

export default function BrowserRoot() {
  return (
    <SessionProvider>
      <AdminSessionProvider>
        <Routes>
          <Route path="/" element={isMobileDevice() ? <Navigate to="/app/splash" replace /> : <ExternalRedirect to={LANDING_URL} />} />
          <Route path="/login" element={<Navigate to="/app/login" replace />} />
          <Route path="/signup" element={<Navigate to="/app/login?mode=signup" replace />} />
          <Route path="/app/*" element={<Page><RouteErrorBoundary><ClientApp /></RouteErrorBoundary></Page>} />
          <Route path="/admin/login" element={<Page><RouteErrorBoundary><AdminLogin /></RouteErrorBoundary></Page>} />
          <Route path="/admin/*" element={<RequireAdmin><Page><RouteErrorBoundary><Admin /></RouteErrorBoundary></Page></RequireAdmin>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AdminSessionProvider>
    </SessionProvider>
  );
}
