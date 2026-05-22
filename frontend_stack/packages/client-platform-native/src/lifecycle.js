import { App } from '@capacitor/app';

function canUseDom() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function addDomListener(target, event, handler, options) {
  if (!target?.addEventListener) return () => {};
  target.addEventListener(event, handler, options);
  return () => target.removeEventListener(event, handler, options);
}

function addAppStateListener(callback) {
  let active = true;
  let handle = null;

  Promise.resolve(App.addListener('appStateChange', callback))
    .then((nextHandle) => {
      if (!active) {
        nextHandle?.remove?.();
        return;
      }
      handle = nextHandle;
    })
    .catch(() => {});

  return () => {
    active = false;
    handle?.remove?.();
  };
}

export const platformLifecycle = {
  onActivity(callback) {
    if (!canUseDom()) return () => {};
    const events = ['pointerdown', 'keydown', 'touchstart'];
    const handler = () => callback();
    const cleanups = events.map((event) => addDomListener(window, event, handler, { passive: true }));
    return () => cleanups.forEach((cleanup) => cleanup());
  },

  onPause(callback) {
    const cleanups = [
      addAppStateListener(({ isActive }) => {
        if (!isActive) callback();
      }),
    ];

    if (canUseDom()) {
      cleanups.push(addDomListener(document, 'visibilitychange', () => {
        if (document.visibilityState === 'hidden') callback();
      }));
    }

    return () => cleanups.forEach((cleanup) => cleanup());
  },

  onResume(callback) {
    const cleanups = [
      addAppStateListener(({ isActive }) => {
        if (isActive) callback();
      }),
    ];

    if (canUseDom()) {
      cleanups.push(addDomListener(document, 'visibilitychange', () => {
        if (document.visibilityState === 'visible') callback();
      }));
    }

    return () => cleanups.forEach((cleanup) => cleanup());
  },

  onVisibilityChange(callback) {
    const cleanups = [
      addAppStateListener(({ isActive }) => callback(isActive ? 'visible' : 'hidden')),
    ];

    if (canUseDom()) {
      cleanups.push(addDomListener(document, 'visibilitychange', () => callback(document.visibilityState)));
    }

    return () => cleanups.forEach((cleanup) => cleanup());
  },
};
