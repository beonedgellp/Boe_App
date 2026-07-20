import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '../store/SessionContext';
import Blocked from '../pages/Blocked';
import BottomNav from './BottomNav';
import AppLockGate from '../components/AppLockGate';
import { isTerminalAccount } from '../utils/approval';
import { PageTransition } from '@beonedge/shared';

const PRIMARY_TAB_PATHS = [
  '/app/dashboard',
  '/app/explore',
  '/app/portfolio',
  '/app/transactions',
  '/app/profile',
];

function hasRole(user, role) {
  const expected = role.toLowerCase();
  return (
    String(user?.role || '').toLowerCase() === expected ||
    String(user?.accountType || '').toLowerCase() === expected ||
    user?.roles?.some((value) => String(value).toLowerCase() === expected)
  );
}

function isPrimaryTabPath(path) {
  return PRIMARY_TAB_PATHS.some((p) => path === p || path.startsWith(p + '/'));
}

export default function ClientLayout(props) {
  const { user, isLoading, logout } = useSession();
  const location = useLocation();
  const path = location.pathname;
  const isPublic = path === '/app/login' || path === '/app/splash';

  if (isPublic) {
    return (
      <PageTransition>
        <Outlet />
      </PageTransition>
    );
  }

  if (isLoading) return null;

  if (!user) {
    const redirect = encodeURIComponent(path + location.search);
    return <Navigate to={`/app/login?from=${redirect}`} replace />;
  }

  if (hasRole(user, 'admin')) {
    return <Navigate to="/admin" replace />;
  }

  if (!hasRole(user, 'client')) {
    return <Navigate to="/app/login" replace />;
  }

  if (isTerminalAccount(user)) {
    return (
      <div className="app-shell app-shell-single" {...props}>
        <main className="app-main">
          <Blocked />
        </main>
      </div>
    );
  }

  const showBottomNav = isPrimaryTabPath(path);

  return (
    <AppLockGate user={user} logout={logout}>
      <div className="app-shell" {...props}>
        <main className={showBottomNav ? 'app-main app-main--nav' : 'app-main'}>
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>

        {showBottomNav && <BottomNav />}
      </div>
    </AppLockGate>
  );
}
