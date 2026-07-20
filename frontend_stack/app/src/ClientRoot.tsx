import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SessionProvider } from '@beonedge/client/store/SessionContext';
import { RouteErrorBoundary } from '@beonedge/shared/components/RouteErrorBoundary';
import PageLoader from './components/PageLoader';
import RootErrorBoundary from './components/RootErrorBoundary';

const ClientApp = lazy(() => import('@beonedge/client/ClientApp'));

const Page = ({ children }: any) => (
  <Suspense fallback={<PageLoader />}>
    {children}
  </Suspense>
);

export default function ClientRoot() {
  return (
    <SessionProvider>
      <RootErrorBoundary>
        <Routes>
          <Route path="/" element={<Navigate to="/app/splash" replace />} />
          <Route path="/login" element={<Navigate to="/app/login" replace />} />
          <Route path="/signup" element={<Navigate to="/app/login?mode=signup" replace />} />
          <Route path="/app/*" element={<Page><RouteErrorBoundary><ClientApp /></RouteErrorBoundary></Page>} />
          <Route path="*" element={<Navigate to="/app/splash" replace />} />
        </Routes>
      </RootErrorBoundary>
    </SessionProvider>
  );
}
