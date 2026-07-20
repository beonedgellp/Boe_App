import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SessionProvider } from '@beonedge/client/store/SessionContext';
import { AdminSessionProvider, useAdminSession } from '@beonedge/client/store/AdminSessionContext';
import { RouteErrorBoundary } from '@beonedge/shared/components/RouteErrorBoundary';
import PageLoader from './components/PageLoader';
import RootErrorBoundary from './components/RootErrorBoundary';

const Admin = lazy(() => import('@beonedge/admin/pages/Admin'));
const AdminLogin = lazy(() => import('@beonedge/admin/pages/AdminLogin'));

function hasRole(user, role) {
  const expected = role.toLowerCase();
  return (
    String(user?.role || '').toLowerCase() === expected ||
    String(user?.accountType || '').toLowerCase() === expected ||
    user?.roles?.some((value) => String(value).toLowerCase() === expected)
  );
}

function RequireAdmin({ children }: any) {
  const { user, isLoading } = useAdminSession();
  const location = useLocation();

  if (isLoading) return null;

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/admin/login?from=${redirect}`} replace />;
  }

  if (!hasRole(user, 'admin')) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}

const Page = ({ children }: any) => (
  <Suspense fallback={<PageLoader />}>
    {children}
  </Suspense>
);

export default function BrowserRoot() {
  return (
    <SessionProvider>
      <AdminSessionProvider>
        <RootErrorBoundary>
          <Routes>
            <Route path="/" element={<Navigate to="/admin/login" replace />} />
            <Route path="/admin/login" element={<Page><RouteErrorBoundary><AdminLogin /></RouteErrorBoundary></Page>} />
            <Route path="/admin/*" element={<RequireAdmin><Page><RouteErrorBoundary><Admin /></RouteErrorBoundary></Page></RequireAdmin>} />
            <Route path="*" element={<Navigate to="/admin/login" replace />} />
          </Routes>
        </RootErrorBoundary>
      </AdminSessionProvider>
    </SessionProvider>
  );
}
