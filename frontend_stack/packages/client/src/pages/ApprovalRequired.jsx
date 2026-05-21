import React from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppBar from '../layout/AppBar.jsx';

export default function ApprovalRequired() {
  const navigate = useNavigate();

  return (
    <>
      <AppBar title="Approval pending" />
      <div className="apk-screen apk-state-screen">
        <div className="be-card apk-approval-card">
          <div className="apk-approval-icon"><Lock size={22} strokeWidth={1.6} /></div>
          <div>
            <div className="be-eyebrow">Execution locked</div>
            <h1 className="apk-h-sm">Admin approval is required.</h1>
            <p>Explore the dashboard and strategies while we review the account.</p>
          </div>
        </div>
        <div className="app-start-note">
          <ShieldCheck size={18} strokeWidth={1.6} />
          <span>Investment, payment, and mandate actions unlock after approval.</span>
        </div>
        <button className="be-btn be-btn-primary be-btn-block be-btn-lg" onClick={() => navigate('/app/dashboard', { replace: true })}>
          Return to dashboard
        </button>
      </div>
    </>
  );
}
