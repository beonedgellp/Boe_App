/**
 * AdminSessionContext compatibility layer.
 * Uses Redux Toolkit under the hood but exposes the same interface.
 */
import React, { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './hooks.js';
import { fetchAdminUser, loginAdmin, logoutAdmin, clearAdminUser } from './adminAuthSlice.js';
import { ReduxProvider } from './ReduxProvider.js';

export function AdminSessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider>
      <AdminSessionInitializer>{children}</AdminSessionInitializer>
    </ReduxProvider>
  );
}

function AdminSessionInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchAdminUser());
  }, [dispatch]);

  useEffect(() => {
    function onInvalidate(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail?.scope === 'admin') {
        dispatch(clearAdminUser());
      }
    }
    window.addEventListener('boe:session-invalidated', onInvalidate);
    return () => window.removeEventListener('boe:session-invalidated', onInvalidate);
  }, [dispatch]);

  return <>{children}</>;
}

export function useAdminSession() {
  const dispatch = useAppDispatch();
  const { user, isLoading } = useAppSelector((state) => state.adminAuth);

  const login = useCallback(async (creds: any) => {
    const result = await dispatch(loginAdmin(creds)).unwrap();
    return result;
  }, [dispatch]);

  const logout = useCallback(async () => {
    await dispatch(logoutAdmin()).unwrap();
  }, [dispatch]);

  return { user, isLoading, login, logout };
}
