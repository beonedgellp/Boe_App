import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAdminSession } from '@beonedge/client/store/AdminSessionContext.jsx';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';
import ToastProvider from '../components/ToastProvider.jsx';
import LegacyAdminDataProvider, { useLegacyAdminData } from '../context/LegacyAdminDataContext.jsx';
import { findNavMeta } from '../navigation/nav.js';

function ShellFrame() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAdminSession();
  const { overview, loadNote } = useLegacyAdminData();
  const meta = findNavMeta(location.pathname);

  async function handleLogout() {
    await logout();
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="ash-app" data-screen-label="Admin Console">
      <Sidebar user={user} counts={overview.counts || {}} />
      <main className="ash-main">
        <TopBar title={meta.title} breadcrumbs={meta.crumbs} onLogout={handleLogout} />
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
