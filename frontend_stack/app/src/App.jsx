import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Landing from './website/pages/Landing.jsx';
import Website from './website/pages/Website.jsx';
import Apk from './website/pages/Apk.jsx';
import Admin from './admin/pages/Admin.jsx';
import AdminLogin from './admin/pages/AdminLogin.jsx';
import ClientApp from './client/ClientApp.jsx';
import { SessionProvider } from './client/store/SessionContext.jsx';
import { AdminSessionProvider, useAdminSession } from './client/store/AdminSessionContext.jsx';
import { RouteErrorBoundary } from './shared/components/RouteErrorBoundary.jsx';
import { isClientShell } from './shared/appTarget.js';

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

export default function App() {
  if (isClientShell) {
    return (
      <SessionProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/app/splash" replace />} />
          <Route path="/login" element={<Navigate to="/app/login" replace />} />
          <Route path="/signup" element={<Navigate to="/app/login?mode=signup" replace />} />
          <Route path="/app/*" element={<RouteErrorBoundary><ClientApp /></RouteErrorBoundary>} />
          <Route path="*" element={<Navigate to="/app/splash" replace />} />
        </Routes>
      </SessionProvider>
    );
  }

  return (
    <SessionProvider>
      <AdminSessionProvider>
        <Routes>
          <Route path="/" element={<RouteErrorBoundary><Landing /></RouteErrorBoundary>} />
          <Route path="/website" element={<RouteErrorBoundary><Website /></RouteErrorBoundary>} />
          <Route path="/login" element={<Navigate to="/app/login" replace />} />
          <Route path="/signup" element={<Navigate to="/app/login?mode=signup" replace />} />
          <Route path="/apk" element={<RouteErrorBoundary><Apk /></RouteErrorBoundary>} />
          <Route path="/app/*" element={<RouteErrorBoundary><ClientApp /></RouteErrorBoundary>} />
          <Route path="/admin/login" element={<RouteErrorBoundary><AdminLogin /></RouteErrorBoundary>} />
          <Route path="/admin" element={<RequireAdmin><RouteErrorBoundary><Admin /></RouteErrorBoundary></RequireAdmin>} />
        </Routes>
      </AdminSessionProvider>
    </SessionProvider>
  );
}
