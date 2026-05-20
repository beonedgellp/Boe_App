import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SessionProvider } from '@beonedge/client/store/SessionContext.jsx';
import { RouteErrorBoundary } from '@beonedge/shared/components/RouteErrorBoundary.jsx';

const ClientApp = lazy(() => import('@beonedge/client/ClientApp.jsx'));

const Page = ({ children }) => (
  <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
    {children}
  </Suspense>
);

export default function ClientRoot() {
  return (
    <SessionProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/app/splash" replace />} />
        <Route path="/login" element={<Navigate to="/app/login" replace />} />
        <Route path="/signup" element={<Navigate to="/app/login?mode=signup" replace />} />
        <Route path="/app/*" element={<Page><RouteErrorBoundary><ClientApp /></RouteErrorBoundary></Page>} />
        <Route path="*" element={<Navigate to="/app/splash" replace />} />
      </Routes>
    </SessionProvider>
  );
}
