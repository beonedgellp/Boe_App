import React, { useEffect, useMemo, useState } from 'react';
import { Fingerprint, LockKeyhole, LogOut } from 'lucide-react';
import { platformLifecycle } from '../platform/clientPlatform.js';
import {
  authenticateBiometric,
  clearUnlock,
  getSecurityState,
  hasFreshUnlock,
  markUnlocked,
  verifyPin,
} from '../services/securitySettings.js';

export default function AppLockGate({ user, logout, children }) {
  const [state, setState] = useState({ pinSet: false, biometricEnabled: false, biometricAvailable: false, autoLockMs: 60_000 });
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSecurityState(user).then((next) => {
      if (cancelled) return;
      setState(next);
      setLocked(next.pinSet && !hasFreshUnlock(user, next.autoLockMs));
    });
    function onSettings() {
      getSecurityState(user).then((next) => {
        if (cancelled) return;
        setState(next);
        setLocked(next.pinSet && !hasFreshUnlock(user, next.autoLockMs));
      });
    }
    window.addEventListener('boe:security-settings-changed', onSettings);
    return () => {
      cancelled = true;
      window.removeEventListener('boe:security-settings-changed', onSettings);
    };
  }, [user]);

  useEffect(() => {
    if (!state.pinSet || locked) return undefined;
    let timer = null;
    let lastActive = Date.now();

    function schedule() {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (Date.now() - lastActive >= state.autoLockMs) {
          clearUnlock(user);
          setLocked(true);
        } else {
          schedule();
        }
      }, state.autoLockMs);
    }

    function onActivity() {
      lastActive = Date.now();
      markUnlocked(user, state.autoLockMs);
      schedule();
    }

    function onPause() {
      lastActive = Date.now() - state.autoLockMs;
      clearUnlock(user);
    }

    function onResume() {
      setLocked(true);
    }

    const cleanupActivity = platformLifecycle.onActivity(onActivity);
    const cleanupPause = platformLifecycle.onPause(onPause);
    const cleanupResume = platformLifecycle.onResume(onResume);
    schedule();

    return () => {
      if (timer) window.clearTimeout(timer);
      cleanupActivity();
      cleanupPause();
      cleanupResume();
    };
  }, [locked, state.autoLockMs, state.pinSet, user]);

  const canUseBiometric = state.biometricEnabled && state.biometricAvailable;
  const pinComplete = useMemo(() => /^\d{4,6}$/.test(pin), [pin]);

  async function unlockWithPin(e) {
    e?.preventDefault();
    if (!pinComplete) return;
    setBusy(true);
    setError('');
    try {
      const ok = await verifyPin(user, pin);
      if (!ok) {
        setError('Incorrect PIN.');
        return;
      }
      markUnlocked(user, state.autoLockMs);
      setPin('');
      setLocked(false);
    } finally {
      setBusy(false);
    }
  }

  async function unlockWithBiometric() {
    setBusy(true);
    setError('');
    try {
      const ok = await authenticateBiometric(user);
      if (ok) {
        setPin('');
        setLocked(false);
      } else {
        setError('Biometric unlock is not available. Use your PIN.');
      }
    } catch {
      setError('Biometric unlock was cancelled. Use your PIN.');
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    clearUnlock(user);
    await logout();
  }

  if (!locked) return children;

  return (
    <>
      {children}
      <div className="security-lock-overlay" role="dialog" aria-modal="true" aria-label="App locked">
        <form className="security-lock-card" onSubmit={unlockWithPin}>
          <div className="security-lock-icon"><LockKeyhole size={24} strokeWidth={1.6} /></div>
          <div>
            <h2>Enter app PIN</h2>
            <p>Security lock is active on this device.</p>
          </div>
          <input
            className="security-pin-input"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            aria-label="App PIN"
            autoFocus
          />
          {error && <div className="be-field-error">{error}</div>}
          <button className="be-btn be-btn-primary be-btn-block be-btn-lg" type="submit" disabled={!pinComplete || busy}>
            Unlock
          </button>
          {canUseBiometric && (
            <button className="be-btn be-btn-secondary be-btn-block" type="button" onClick={unlockWithBiometric} disabled={busy}>
              <Fingerprint size={16} strokeWidth={1.7} /> Unlock with device
            </button>
          )}
          <button className="be-btn be-btn-ghost be-btn-block" type="button" onClick={signOut} disabled={busy}>
            <LogOut size={16} strokeWidth={1.7} /> Sign out
          </button>
        </form>
      </div>
    </>
  );
}
