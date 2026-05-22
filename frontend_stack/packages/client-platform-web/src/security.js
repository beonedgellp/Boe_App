function randomBytes(length = 16) {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytes;
}

function bytesToBase64Url(bytes) {
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

function fallbackHash(value) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < value.length; i += 1) {
    const ch = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`;
}

async function digest(value) {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return bytesToBase64Url(new Uint8Array(hash));
  }
  return fallbackHash(value);
}

async function biometricAvailability() {
  if (typeof window === 'undefined') {
    return { available: false, enrolled: null, type: 'none', label: 'Not available in this browser', reason: 'not-supported' };
  }
  if (!window.isSecureContext) {
    return { available: false, enrolled: null, type: 'none', label: 'Not available in this browser', reason: 'not-secure-context' };
  }
  if (!window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable) {
    return { available: false, enrolled: null, type: 'none', label: 'Not available in this browser', reason: 'not-supported' };
  }
  try {
    const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) {
      return { available: false, enrolled: null, type: 'none', label: 'Not available in this browser', reason: 'not-enrolled' };
    }
    return { available: true, enrolled: null, type: 'webauthn-platform', label: 'Device unlock', reason: 'ok' };
  } catch {
    return { available: false, enrolled: null, type: 'none', label: 'Not available in this browser', reason: 'not-supported' };
  }
}

async function biometricEnroll({ userId, displayName }) {
  if (!window.PublicKeyCredential) {
    throw new Error('WebAuthn is not available.');
  }
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(32),
      rp: { name: 'BeOnEdge' },
      user: {
        id: randomBytes(16),
        name: userId || 'client',
        displayName: displayName || 'BeOnEdge Client',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60_000,
      attestation: 'none',
    },
  });

  if (!credential?.rawId) {
    const err = new Error('Biometric setup was cancelled.');
    err.code = 'BIOMETRIC_CANCELLED';
    throw err;
  }

  return {
    ok: true,
    credentialId: bytesToBase64Url(new Uint8Array(credential.rawId)),
  };
}

async function biometricAuthenticate({ credentialId }) {
  if (!window.PublicKeyCredential || !credentialId) {
    const err = new Error('Biometric unlock is not available.');
    err.code = 'BIOMETRIC_UNAVAILABLE';
    throw err;
  }
  await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      allowCredentials: [
        {
          type: 'public-key',
          id: base64UrlToBytes(credentialId),
        },
      ],
      userVerification: 'required',
      timeout: 60_000,
    },
  });
  return { ok: true };
}

function deviceId() {
  const KEY = 'boe.client.platform.deviceId.v1';
  if (typeof window === 'undefined') return 'device-unknown';
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing) return existing;
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    window.localStorage.setItem(KEY, id);
    return id;
  } catch {
    return `device-${Date.now()}`;
  }
}

function deviceLabel() {
  if (typeof navigator === 'undefined') return 'This device';
  const ua = navigator.userAgent || '';
  if (/Android/i.test(ua)) return 'Android device';
  if (/iPhone|iPad/i.test(ua)) return 'iOS device';
  if (/Chrome/i.test(ua)) return 'Chrome browser';
  if (/Firefox/i.test(ua)) return 'Firefox browser';
  if (/Safari/i.test(ua)) return 'Safari browser';
  return 'This device';
}

export const platformSecurity = {
  biometric: {
    availability: biometricAvailability,
    enroll: biometricEnroll,
    authenticate: biometricAuthenticate,
    disable: async () => ({ ok: true }),
  },
  crypto: {
    randomBytes,
    digest,
  },
  device: {
    id: deviceId,
    label: deviceLabel,
  },
};
