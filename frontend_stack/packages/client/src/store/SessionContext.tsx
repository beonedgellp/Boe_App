import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as authApi from '../services/authApi';

const SessionContext = createContext({ user: null as any, isLoading: true, login: async (..._args: any[]) => {}, signup: async (..._args: any[]) => {}, logout: async (..._args: any[]) => {} });

export function SessionProvider({ children }: any) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    authApi.currentUser({ scope: 'client' })
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
      if (e.detail?.scope === 'client' || !e.detail?.scope) {
        setUser(null);
        setIsLoading(false);
      }
    }
    window.addEventListener('boe:session-invalidated', onInvalidate);
    return () => window.removeEventListener('boe:session-invalidated', onInvalidate);
  }, []);

  const login = useCallback(async (creds) => {
    const u = await authApi.login(creds, { scope: 'client' });
    setUser(u);
    return u;
  }, []);

  const signup = useCallback(async (details) => {
    const u = await authApi.signup(details, { scope: 'client' });
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout({ scope: 'client' });
    setUser(null);
  }, []);

  return (
    <SessionContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() { return useContext(SessionContext); }
