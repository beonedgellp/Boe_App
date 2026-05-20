import React from 'react';
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Compass, FileText, Home, LogOut, PieChart, Receipt, User } from 'lucide-react';
import { useSession } from '../store/SessionContext.jsx';
import Blocked from '../pages/Blocked.jsx';
import BottomNav from './BottomNav.jsx';
import logoOnDark from '../../assets/logo-on-dark.svg';
import { isTerminalAccount } from '../utils/approval.js';

const NAV_ITEMS = [
  { to: '/app/dashboard', label: 'Dashboard', icon: Home },
  { to: '/app/explore', label: 'Explore', icon: Compass },
  { to: '/app/portfolio', label: 'Portfolio', icon: PieChart },
  { to: '/app/transactions', label: 'Transactions', icon: Receipt },
  { to: '/app/statements', label: 'Statements', icon: FileText },
  { to: '/app/notifications', label: 'Notifications', icon: Bell },
  { to: '/app/profile', label: 'Profile', icon: User },
];

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

export default function ClientLayout() {
  const { user, isLoading, logout } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const isPublic = path === '/app/login' || path === '/app/splash';

  if (isPublic) {
    return <Outlet />;
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
      <div className="app-shell app-shell-single">
        <main className="app-main">
          <Blocked />
        </main>
      </div>
    );
  }

  async function onSignOut() {
    await logout();
    navigate('/app/login', { replace: true });
  }

  const showBottomNav = isPrimaryTabPath(path);

  return (
    <div className="app-shell">
      {/* Desktop sidebar — hidden on mobile via CSS */}
      <aside className="app-sidebar">
        <NavLink to="/" className="app-brand"><img src={logoOnDark} alt="BeOnEdge" /></NavLink>
        <nav className="app-nav" aria-label="Client app">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `app-nav-link${isActive ? ' is-active' : ''}`}>
              <Icon size={18} strokeWidth={1.6} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="app-sidebar-foot">
          <div className="app-user">
            <div className="app-avatar">{user.avatarInitials || 'BE'}</div>
            <div>
              <strong>{user.name || 'Client'}</strong>
              <span>{user.email || user.phoneMasked}</span>
            </div>
          </div>
          <button className="app-nav-link app-logout" onClick={onSignOut}>
            <LogOut size={18} strokeWidth={1.6} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>

      {/* Mobile bottom nav — hidden on desktop via CSS */}
      {showBottomNav && <BottomNav />}
    </div>
  );
}
