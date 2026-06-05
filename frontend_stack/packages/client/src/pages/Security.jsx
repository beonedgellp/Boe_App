import React, { useEffect, useMemo, useState } from 'react';
import AppBar from '../layout/AppBar.jsx';
import { Fingerprint, KeyRound, LockKeyhole, LogOut, MonitorSmartphone, TimerReset, Trash2 } from 'lucide-react';
import { useSession } from '../store/SessionContext.jsx';
import { platformSecurity } from '../platform/clientPlatform.js';
import {
  authenticateBiometric,
  autoLockOptions,
  clearPin,
  currentSession,
  disableBiometric,
  enableBiometric,
  getSecurityState,
  setAutoLockMs,
  setPin,
  validatePin,
  verifyPin,
} from '../services/securitySettings.js';

function resolveBiometricLabel(availability, pinSet) {
  if (!pinSet) return 'Set an app PIN first';
  if (!availability?.available) return 'Not available on this device';
  if (availability.type === 'native-biometric') return 'Use fingerprint or face unlock on this device';
  return availability.label || 'Not available on this device';
}

export default function Security() {
  const { user, logout } = useSession();
  const [state, setState] = useState(null);
  const [session, setSession] = useState(null);
  const [bioAvail, setBioAvail] = useState(null);
  const [pinMode, setPinMode] = useState(null);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getSecurityState(user), platformSecurity.biometric.availability()]).then(([next, avail]) => {
      if (cancelled) return;
      setState(next);
      setBioAvail(avail);
      setSession(currentSession(user));
    });
    return () => { cancelled = true; };
  }, [user]);

  const selectedAutoLock = useMemo(
    () => autoLockOptions().find((option) => option.value === state?.autoLockMs) || autoLockOptions()[1],
    [state?.autoLockMs]
  );

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  }

  async function refreshState() {
    const [next, avail] = await Promise.all([getSecurityState(user), platformSecurity.biometric.availability()]);
    setState(next);
    setBioAvail(avail);
    setSession(currentSession(user));
  }

  function openPin(mode) {
    setPinMode(mode);
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setError('');
  }

  async function savePin(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (pinMode === 'remove') {
        await clearPin(user, currentPin);
        setPinMode(null);
        await refreshState();
        showToast('App PIN removed.');
        return;
      }
      if (state?.pinSet) {
        const ok = await verifyPin(user, currentPin);
        if (!ok) {
          setError('Current PIN is incorrect.');
          return;
        }
      }
      if (!validatePin(newPin)) {
        setError('Use a 4 to 6 digit PIN.');
        return;
      }
      if (newPin !== confirmPin) {
        setError('PIN confirmation does not match.');
        return;
      }
      await setPin(user, newPin);
      setPinMode(null);
      await refreshState();
      showToast(state?.pinSet ? 'App PIN changed.' : 'App PIN set.');
    } catch (err) {
      setError(err?.message || 'Could not update PIN.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleBiometric() {
    if (!state?.pinSet) {
      setError('Set an app PIN before enabling biometric unlock.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (state.biometricEnabled) {
        await disableBiometric(user);
        showToast('Biometric unlock disabled.');
      } else {
        await enableBiometric(user);
        showToast('Biometric unlock enabled.');
      }
      await refreshState();
    } catch (err) {
      setError(err?.message || 'Could not update biometric unlock.');
    } finally {
      setBusy(false);
    }
  }

  async function testBiometric() {
    setBusy(true);
    setError('');
    try {
      await authenticateBiometric(user);
      showToast('Device unlock confirmed.');
    } catch {
      setError('Device unlock was cancelled or unavailable.');
    } finally {
      setBusy(false);
    }
  }

  function changeAutoLock(value) {
    setAutoLockMs(user, value);
    refreshState();
    showToast('Auto-lock updated.');
  }

  async function signOut() {
    await logout();
  }

  return (
    <>
      <AppBar title="Security & PIN" />
      <div className="apk-screen security-screen">
        <section className="be-card security-status-card">
          <div className="security-status-icon"><LockKeyhole size={22} strokeWidth={1.6} /></div>
          <div>
            <div className="be-eyebrow">Device security</div>
            <h1 className="apk-h-sm">Security & PIN</h1>
            <p>{state?.pinSet ? `App lock is active. Auto-lock: ${selectedAutoLock.label}.` : 'Set an app PIN to protect this device.'}</p>
          </div>
        </section>

        <section className="be-card security-section">
          <button type="button" className="security-row" onClick={() => openPin(state?.pinSet ? 'change' : 'set')}>
            <KeyRound size={18} strokeWidth={1.6} />
            <span>
              <strong>App PIN</strong>
              <small>{state?.pinSet ? 'PIN is set on this device' : 'Not set'}</small>
            </span>
            <span className="security-row-action">{state?.pinSet ? 'Change' : 'Set'}</span>
          </button>

          {state?.pinSet && (
            <button type="button" className="security-row security-row-danger" onClick={() => openPin('remove')}>
              <Trash2 size={18} strokeWidth={1.6} />
              <span>
                <strong>Remove PIN</strong>
                <small>Turns off local app lock and biometric unlock</small>
              </span>
              <span className="security-row-action">Remove</span>
            </button>
          )}

          <div className="security-row">
            <Fingerprint size={18} strokeWidth={1.6} />
            <span>
              <strong>Biometric unlock</strong>
              <small>{resolveBiometricLabel(bioAvail, state?.pinSet)}</small>
            </span>
            <button
              type="button"
              className={'apk-toggle' + (state?.biometricEnabled ? ' is-on' : '')}
              onClick={toggleBiometric}
              role="switch"
              aria-checked={Boolean(state?.biometricEnabled)}
              disabled={busy || !state?.pinSet || !state?.biometricAvailable}
              aria-label="Toggle biometric unlock"
            />
          </div>

          {state?.biometricEnabled && (
            <button className="be-btn be-btn-secondary be-btn-block" type="button" onClick={testBiometric} disabled={busy}>
              <Fingerprint size={16} strokeWidth={1.7} /> Test device unlock
            </button>
          )}
        </section>

        <section className="be-card security-section">
          <div className="security-section-head">
            <TimerReset size={18} strokeWidth={1.6} />
            <div>
              <strong>Auto-lock</strong>
              <small>Lock the app after inactivity or when it returns from background.</small>
            </div>
          </div>
          <div className="security-choice-grid">
            {autoLockOptions().map((option) => (
              <button
                key={option.value}
                type="button"
                className={'apk-chip' + (state?.autoLockMs === option.value ? ' is-active' : '')}
                onClick={() => changeAutoLock(option.value)}
                disabled={!state?.pinSet}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section className="be-card security-section">
          <div className="security-section-head">
            <MonitorSmartphone size={18} strokeWidth={1.6} />
            <div>
              <strong>Active session</strong>
              <small>{session?.label || 'This device'} · {session?.user || 'Client session'}</small>
            </div>
          </div>
          <button className="be-btn be-btn-secondary be-btn-block" type="button" onClick={signOut}>
            <LogOut size={16} strokeWidth={1.7} /> Sign out this device
          </button>
        </section>

        {error && <div className="apk-banner apk-banner-red">{error}</div>}
        <div className="be-disclosure">App PIN settings are stored locally on this device. Biometric unlock uses your device's secure authenticator when available; we never receive your fingerprint or face data.</div>
      </div>

      {pinMode && (
        <div className="apk-sheet-overlay" role="dialog" aria-modal="true" aria-label="App PIN setup" onClick={() => !busy && setPinMode(null)}>
          <form className="apk-sheet security-pin-sheet" onSubmit={savePin} onClick={(e) => e.stopPropagation()}>
            <div className="apk-sheet-handle" />
            <h2 className="apk-h-sm">{pinMode === 'remove' ? 'Remove app PIN' : state?.pinSet ? 'Change app PIN' : 'Set app PIN'}</h2>
            <p className="security-sheet-copy">
              {pinMode === 'remove' ? 'Enter your current PIN to turn off local app lock.' : 'Use 4 to 6 digits. Avoid birthdays or repeated numbers.'}
            </p>
            {(state?.pinSet || pinMode === 'remove') && (
              <PinInput label="Current PIN" value={currentPin} onChange={setCurrentPin} autoFocus />
            )}
            {pinMode !== 'remove' && (
              <>
                <PinInput label="New PIN" value={newPin} onChange={setNewPin} autoFocus={!state?.pinSet} />
                <PinInput label="Confirm PIN" value={confirmPin} onChange={setConfirmPin} />
              </>
            )}
            {error && <div className="be-field-error">{error}</div>}
            <button className="be-btn be-btn-primary be-btn-block be-btn-lg" type="submit" disabled={busy}>
              {pinMode === 'remove' ? 'Remove PIN' : 'Save PIN'}
            </button>
            <button className="be-btn be-btn-ghost be-btn-block" type="button" onClick={() => setPinMode(null)} disabled={busy}>
              Cancel
            </button>
          </form>
        </div>
      )}

      {toast && <div className="apk-toast" role="status">{toast}</div>}
    </>
  );
}

function PinInput({ label, value, onChange, autoFocus = false }) {
  return (
    <div className="be-field">
      <label>{label}</label>
      <input
        className="security-pin-input"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        autoFocus={autoFocus}
      />
    </div>
  );
}
