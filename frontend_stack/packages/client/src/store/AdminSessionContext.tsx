import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as authApi from '../services/authApi';

const AdminSessionContext = createContext({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export function AdminSessionProvider({ children }: any) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    authApi.currentUser({ scope: 'admin' })
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    function onInvalidate(e) {
      if (e.detail?.scope === 'admin') {
        setUser(null);
        setIsLoading(false);
      }
    }
    window.addEventListener('boe:session-invalidated', onInvalidate);
    return () => window.removeEventListener('boe:session-invalidated', onInvalidate);
  }, []);

  const login = useCallback(async (creds) => {
    const u = await authApi.login(creds, { scope: 'admin' });
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout({ scope: 'admin' });
    setUser(null);
  }, []);

  return (
    <AdminSessionContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession() {
  return useContext(AdminSessionContext);
}
