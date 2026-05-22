function getStore(kind = 'local') {
  if (typeof window === 'undefined') return null;
  try {
    return kind === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

export const platformStorage = {
  local: {
    async get(key) {
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
      const store = getStore('local');
      if (!store) throw new Error('localStorage unavailable');
      store.setItem(key, JSON.stringify(value));
    },
    async remove(key) {
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
    available() {
      return false;
    },
    async get() {
      return null;
    },
    async set() {
      throw new Error('Secure storage is not available in the browser.');
    },
    async remove() {
      // no-op
    },
  },
};
