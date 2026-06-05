import React, { useState } from 'react';
import { Download, Monitor, ShieldCheck, Smartphone } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useSession } from '../store/SessionContext.jsx';

function isAdmin(user) {
  return (
    String(user?.role || '').toLowerCase() === 'admin' ||
    String(user?.accountType || '').toLowerCase() === 'admin' ||
    user?.roles?.some((value) => String(value).toLowerCase() === 'admin')
  );
}

const APPSTART_KEY = 'be_appstart_seen';

export default function AppStart() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [message, setMessage] = useState('');

  // Skip AppStart if user has already seen it — hook must be before any early return
  const [hasSeen, setHasSeen] = useState(() => {
    try {
      return !!localStorage.getItem(APPSTART_KEY);
    } catch {
      return false;
    }
  });

  if (isAdmin(user)) {
    return <Navigate to="/admin" replace />;
  }

  if (hasSeen) {
    return <Navigate to="/app/dashboard" replace />;
  }

  function markSeen() {
    try {
      localStorage.setItem(APPSTART_KEY, '1');
    } catch {
      // Storage may be restricted; silently ignore
    }
  }

  function downloadApp() {
    markSeen();
    setMessage('App download will be connected to the release package.');
    setTimeout(() => setMessage(''), 3200);
  }

  return (
    <div className="app-start">
      <div className="app-start-head">
        <span className="be-eyebrow">Signed in</span>
        <h1>Choose how you want to continue.</h1>
        <p>Use BeOnEdge in this browser, or download the app when the release package is available.</p>
      </div>

      <div className="app-start-grid">
        <button className="app-start-card" onClick={() => { markSeen(); navigate('/app/dashboard'); }}>
          <Monitor size={28} strokeWidth={1.5} />
          <strong>Continue on web</strong>
          <span>Open the mobile dashboard, Explore, portfolio, transactions, statements, and profile pages.</span>
        </button>
        <button className="app-start-card" onClick={downloadApp}>
          <Smartphone size={28} strokeWidth={1.5} />
          <strong>Download the app</strong>
          <span>Use the BeOnEdge web app to manage your investments.</span>
          <span className="app-start-download"><Download size={15} strokeWidth={1.7} /> Download</span>
        </button>
      </div>

      <div className="app-start-note">
        <ShieldCheck size={18} strokeWidth={1.6} />
        <span>Your login works for both the web dashboard and the app.</span>
      </div>
      {message && <div className="apk-toast" role="status">{message}</div>}
    </div>
  );
}
