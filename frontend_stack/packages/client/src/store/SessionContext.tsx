/**
 * SessionContext compatibility layer.
 * Uses Redux Toolkit under the hood but exposes the same interface
 * as the original React Context so existing UI components don't change.
 */
import React, { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './hooks.ts';
import { fetchCurrentUser, loginUser, signupUser, logoutUser, clearUser } from './authSlice.ts';
import { ReduxProvider } from './ReduxProvider.ts';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider>
      <SessionInitializer>{children}</SessionInitializer>
    </ReduxProvider>
  );
}

function SessionInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  useEffect(() => {
    function onInvalidate(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail?.scope === 'client' || !detail?.scope) {
        dispatch(clearUser());
      }
    }
    window.addEventListener('boe:session-invalidated', onInvalidate);
    return () => window.removeEventListener('boe:session-invalidated', onInvalidate);
  }, [dispatch]);

  return <>{children}</>;
}

export function useSession() {
  const dispatch = useAppDispatch();
  const { user, isLoading } = useAppSelector((state) => state.auth);

  const login = useCallback(async (creds: any) => {
    const result = await dispatch(loginUser(creds)).unwrap();
    return result;
  }, [dispatch]);

  const signup = useCallback(async (details: any) => {
    const result = await dispatch(signupUser(details)).unwrap();
    return result;
  }, [dispatch]);

  const logout = useCallback(async () => {
    await dispatch(logoutUser()).unwrap();
  }, [dispatch]);

  return { user, isLoading, login, signup, logout };
}
