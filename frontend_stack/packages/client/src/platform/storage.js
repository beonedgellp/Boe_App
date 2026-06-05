import { Capacitor } from '@capacitor/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

const SECURE_PREFIX = 'boe.client.native.';

let securePrefixReady = null;

function getStore(kind = 'local') {
  if (typeof window === 'undefined') return null;
  try {
    return kind === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

function isNativeRuntime() {
  try {
    return Boolean(Capacitor.isNativePlatform?.());
  } catch {
    return false;
  }
}

async function prepareSecureStorage() {
  if (!isNativeRuntime()) return false;
  if (!securePrefixReady) {
    securePrefixReady = SecureStorage.setKeyPrefix(SECURE_PREFIX)
      .then(() => true)
      .catch(() => false);
  }
  return securePrefixReady;
}

async function secureAvailable() {
  if (!(await prepareSecureStorage())) return false;
  try {
    await SecureStorage.keys();
    return true;
  } catch {
    return false;
  }
}

async function secureGet(key) {
  if (!(await prepareSecureStorage())) return null;
  return SecureStorage.get(key, false);
}

async function secureSet(key, value) {
  if (!(await prepareSecureStorage())) {
    throw new Error('Secure storage is not available on this device.');
  }
  await SecureStorage.set(key, value, false);
}

async function secureRemove(key) {
  if (!(await prepareSecureStorage())) return;
  await SecureStorage.remove(key);
}

export const platformStorage = {
  local: {
    async get(key) {
      if (isNativeRuntime()) return secureGet(key);
      const store = getStore('local');
      if (!store) return null;
      try {
        const raw = store.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },
    async set(key, value) {
      if (isNativeRuntime()) {
        await secureSet(key, value);
        return;
      }
      const store = getStore('local');
      if (!store) throw new Error('localStorage unavailable');
      store.setItem(key, JSON.stringify(value));
    },
    async remove(key) {
      if (isNativeRuntime()) {
        await secureRemove(key);
        return;
      }
      const store = getStore('local');
      if (!store) return;
      store.removeItem(key);
    },
  },

  session: {
    async get(key) {
      const store = getStore('session');
      if (!store) return null;
      try {
        const raw = store.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },
    async set(key, value) {
      const store = getStore('session');
      if (!store) throw new Error('sessionStorage unavailable');
      store.setItem(key, JSON.stringify(value));
    },
    async remove(key) {
      const store = getStore('session');
      if (!store) return;
      store.removeItem(key);
    },
  },

  secure: {
    async available() {
      return secureAvailable();
    },
    async get(key) {
      return secureGet(key);
    },
    async set(key, value) {
      await secureSet(key, value);
    },
    async remove(key) {
      await secureRemove(key);
    },
  },
};
