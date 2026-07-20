import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SessionProvider } from '@beonedge/client/store/SessionContext.tsx';
import { RouteErrorBoundary } from '@beonedge/shared/components/RouteErrorBoundary.tsx';
import PageLoader from './components/PageLoader.tsx';
import RootErrorBoundary from './components/RootErrorBoundary.tsx';

const ClientApp = lazy(() => import('@beonedge/client/ClientApp.tsx'));

const Page = ({ children }) => (
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
