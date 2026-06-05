import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../store/SessionContext.jsx';
import * as authApi from '../services/authApi.js';
import logoOnDark from '@beonedge/shared/assets/logo-on-dark.svg';

function isAdmin(user) {
  return (
    String(user?.role || '').toLowerCase() === 'admin' ||
    user?.roles?.some((value) => String(value).toLowerCase() === 'admin')
  );
}

export default function Splash() {
  const navigate = useNavigate();
  const { user, isLoading } = useSession();
  useEffect(() => {
    if (isLoading) return;
    let cancelled = false;
    let t;
    Promise.all([authApi.checkReachability()]).then(([r]) => {
      if (cancelled) return;
      if (!r.ok) return;
      t = setTimeout(() => {
        if (cancelled) return;
        navigate(user ? (isAdmin(user) ? '/admin' : '/app/dashboard') : '/app/login', { replace: true });
      }, 900);
    });
    return () => { cancelled = true; clearTimeout(t); };
  }, [navigate, user, isLoading]);
  return (
    <div className="apk-splash">
      <img className="apk-logo-img apk-splash-logo" src={logoOnDark} alt="BeOnEdge" />
      <div className="apk-splash-spinner" aria-hidden="true" />
      <div className="apk-splash-disc">Investments are subject to market risk.</div>
    </div>
  );
}
