import { useState } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAdminSession } from '@beonedge/client/store/AdminSessionContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import ToastProvider from '../components/ToastProvider';
import LegacyAdminDataProvider, { useLegacyAdminData } from '../context/LegacyAdminDataContext';
import { findNavMeta } from '../navigation/nav';
import I from '../components/I';

function ShellFrame() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAdminSession();
  const { overview, loadNote } = useLegacyAdminData();
  const [navCollapsed, setNavCollapsed] = useState(false);
  const meta = findNavMeta(location.pathname);

  async function handleLogout() {
    await logout();
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className={`ash-app ${navCollapsed ? 'is-nav-collapsed' : ''}`} data-screen-label="Admin Console">
      <Sidebar user={user} counts={overview.counts || {}} collapsed={navCollapsed} />
      <button
        type="button"
        className="ash-nav-collapse"
        onClick={() => setNavCollapsed((value) => !value)}
        aria-label={navCollapsed ? 'Expand navigation' : 'Collapse navigation'}
        aria-expanded={!navCollapsed}
      >
        <I icon={navCollapsed ? PanelLeftOpen : PanelLeftClose} size={14} />
      </button>
      <main className="ash-main">
        <TopBar title={meta.title} breadcrumbs={meta.crumbs} crumbPaths={meta.crumbPaths} onLogout={handleLogout} />
        {loadNote && <div className="ash-load-note" role="status">{loadNote}</div>}
        <Outlet />
      </main>
    </div>
  );
}

export default function AdminShell() {
  return (
    <ToastProvider>
      <LegacyAdminDataProvider>
        <ShellFrame />
      </LegacyAdminDataProvider>
    </ToastProvider>
  );
}
