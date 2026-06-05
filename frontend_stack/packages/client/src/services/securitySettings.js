import { platformSecurity, platformStorage } from '../platform/clientPlatform.js';

const SETTINGS_PREFIX = 'boe.client.security.v1';
const UNLOCK_PREFIX = 'boe.client.security.unlock.v1';
const DEFAULT_AUTO_LOCK_MS = 60_000;

const AUTO_LOCK_OPTIONS = [
  { label: '30 sec', value: 30_000 },
  { label: '1 min', value: 60_000 },
  { label: '5 min', value: 300_000 },
  { label: '15 min', value: 900_000 },
];

// In-memory caches so sync helpers can read without awaiting async storage.
const settingsCache = new Map();
const unlockCache = new Map();

function userKey(user) {
  return user?.id || user?.email || 'local-client';
}

function settingsKey(user) {
  return `${SETTINGS_PREFIX}.${userKey(user)}`;
}

function unlockKey(user) {
  return `${UNLOCK_PREFIX}.${userKey(user)}`;
}

function defaultSettings() {
  return {
    pinHash: '',
    pinSalt: '',
    pinSetAt: '',
    biometricEnabled: false,
    biometricCredentialId: '',
    biometricSetAt: '',
    autoLockMs: DEFAULT_AUTO_LOCK_MS,
    deviceId: platformSecurity.device.id(),
    deviceLabel: platformSecurity.device.label(),
    updatedAt: new Date().toISOString(),
  };
}

async function readRaw(user) {
  const key = settingsKey(user);
  const cached = settingsCache.get(key);
  if (cached) return cached;

  const [stored, unlockStored] = await Promise.all([
    platformStorage.local.get(key),
    platformStorage.session.get(unlockKey(user)),
  ]);

  if (unlockStored) {
    unlockCache.set(unlockKey(user), unlockStored);
  }

  if (stored) {
    const merged = { ...defaultSettings(), ...stored };
    settingsCache.set(key, merged);
    return merged;
  }
  return defaultSettings();
}

function readRawSync(user) {
  const key = settingsKey(user);
  return settingsCache.get(key) || defaultSettings();
}

async function writeRaw(user, next) {
  const key = settingsKey(user);
  const payload = { ...next, updatedAt: new Date().toISOString() };
  settingsCache.set(key, payload);
  await platformStorage.local.set(key, payload);
  window.dispatchEvent(new CustomEvent('boe:security-settings-changed', { detail: { userKey: userKey(user) } }));
  return payload;
}

function writeRawSync(user, next) {
  const key = settingsKey(user);
  const payload = { ...next, updatedAt: new Date().toISOString() };
  settingsCache.set(key, payload);
  platformStorage.local.set(key, payload).catch(() => {});
  window.dispatchEvent(new CustomEvent('boe:security-settings-changed', { detail: { userKey: userKey(user) } }));
  return payload;
}

export function autoLockOptions() {
  return AUTO_LOCK_OPTIONS;
}

export async function getSecurityState(user) {
  const settings = await readRaw(user);
  const hasPin = Boolean(settings.pinHash && settings.pinSalt);
  const availability = await platformSecurity.biometric.availability();
  return {
    pinSet: hasPin,
    pinSetAt: settings.pinSetAt,
    biometricEnabled: hasPin && Boolean(settings.biometricEnabled && settings.biometricCredentialId),
    biometricAvailable: availability.available,
    autoLockMs: Number(settings.autoLockMs) || DEFAULT_AUTO_LOCK_MS,
    deviceId: settings.deviceId || platformSecurity.device.id(),
    deviceLabel: settings.deviceLabel || platformSecurity.device.label(),
    updatedAt: settings.updatedAt,
  };
}

export function getSecurityStateSync(user) {
  const settings = readRawSync(user);
  return {
    pinSet: Boolean(settings.pinHash && settings.pinSalt),
    biometricEnabled: Boolean(settings.biometricEnabled && settings.biometricCredentialId),
    autoLockMs: Number(settings.autoLockMs) || DEFAULT_AUTO_LOCK_MS,
  };
}

export function validatePin(pin) {
  return /^\d{4,6}$/.test(String(pin || ''));
}

export async function setPin(user, pin) {
  if (!validatePin(pin)) {
    const error = new Error('Use a 4 to 6 digit PIN.');
    error.code = 'INVALID_PIN';
    throw error;
  }
  const saltBytes = platformSecurity.crypto.randomBytes(32);
  const pinSalt = await platformSecurity.crypto.digest(
    Array.from(saltBytes, (b) => String.fromCharCode(b)).join('')
  );
  const pinHash = await platformSecurity.crypto.digest(`${pinSalt}:${pin}`);
  const current = await readRaw(user);
  const next = await writeRaw(user, {
    ...current,
    pinHash,
    pinSalt,
    pinSetAt: new Date().toISOString(),
    biometricEnabled: false,
    biometricCredentialId: '',
    biometricSetAt: '',
    deviceId: current.deviceId || platformSecurity.device.id(),
    deviceLabel: current.deviceLabel || platformSecurity.device.label(),
  });
  markUnlocked(user, next.autoLockMs);
  return getSecurityState(user);
}

export async function verifyPin(user, pin) {
  const current = await readRaw(user);
  if (!current.pinHash || !current.pinSalt) return false;
  const pinHash = await platformSecurity.crypto.digest(`${current.pinSalt}:${pin}`);
  return pinHash === current.pinHash;
}

export async function clearPin(user, currentPin) {
  const ok = await verifyPin(user, currentPin);
  if (!ok) {
    const error = new Error('Current PIN is incorrect.');
    error.code = 'BAD_PIN';
    throw error;
  }
  const current = await readRaw(user);
  await writeRaw(user, {
    ...current,
    pinHash: '',
    pinSalt: '',
    pinSetAt: '',
    biometricEnabled: false,
    biometricCredentialId: '',
    biometricSetAt: '',
  });
  clearUnlock(user);
  return getSecurityState(user);
}

export function setAutoLockMs(user, autoLockMs) {
  const selected = AUTO_LOCK_OPTIONS.some((item) => item.value === Number(autoLockMs))
    ? Number(autoLockMs)
    : DEFAULT_AUTO_LOCK_MS;
  const current = readRawSync(user);
  writeRawSync(user, { ...current, autoLockMs: selected });
  markUnlocked(user, selected);
  return selected;
}

export async function enableBiometric(user) {
  const current = await readRaw(user);
  if (!current.pinHash) {
    const error = new Error('Set an app PIN first.');
    error.code = 'PIN_REQUIRED';
    throw error;
  }
  const availability = await platformSecurity.biometric.availability();
  if (!availability.available) {
    const error = new Error('Device biometric unlock is not available on this device.');
    error.code = 'BIOMETRIC_UNAVAILABLE';
    throw error;
  }

  const result = await platformSecurity.biometric.enroll({
    userId: user?.email || user?.name || 'client',
    displayName: user?.name || 'BeOnEdge Client',
  });

  if (!result.ok) throw new Error('Biometric setup was cancelled.');
  await writeRaw(user, {
    ...current,
    biometricEnabled: true,
    biometricCredentialId: result.credentialId,
    biometricSetAt: new Date().toISOString(),
  });
  return getSecurityState(user);
}

export async function disableBiometric(user) {
  const current = await readRaw(user);
  await platformSecurity.biometric.disable({ credentialId: current.biometricCredentialId });
  await writeRaw(user, {
    ...current,
    biometricEnabled: false,
    biometricCredentialId: '',
    biometricSetAt: '',
  });
  return getSecurityState(user);
}

export async function authenticateBiometric(user) {
  const current = await readRaw(user);
  if (!current.biometricEnabled || !current.biometricCredentialId) return false;
  const availability = await platformSecurity.biometric.availability();
  if (!availability.available) return false;
  await platformSecurity.biometric.authenticate({
    credentialId: current.biometricCredentialId,
    reason: 'Unlock BeOnEdge',
  });
  markUnlocked(user, current.autoLockMs);
  return true;
}

export function markUnlocked(user, autoLockMs) {
  const ttl = Number(autoLockMs) || DEFAULT_AUTO_LOCK_MS;
  const payload = { unlockedAt: Date.now(), expiresAt: Date.now() + ttl };
  const key = unlockKey(user);
  unlockCache.set(key, payload);
  platformStorage.session.set(key, payload).catch(() => {});
}

export function clearUnlock(user) {
  const key = unlockKey(user);
  unlockCache.delete(key);
  platformStorage.session.remove(key).catch(() => {});
}

export function hasFreshUnlock(user, autoLockMs) {
  const cached = unlockCache.get(unlockKey(user));
  if (!cached) return false;
  try {
    const payload = cached;
    return Number(payload.expiresAt) > Date.now() && Number(payload.expiresAt) <= Date.now() + (Number(autoLockMs) || DEFAULT_AUTO_LOCK_MS);
  } catch {
    return false;
  }
}

export function currentSession(user) {
  return {
    id: platformSecurity.device.id(),
    label: platformSecurity.device.label(),
    user: user?.email || user?.phoneMasked || user?.name || 'Client session',
    lastActive: new Date().toISOString(),
  };
}
