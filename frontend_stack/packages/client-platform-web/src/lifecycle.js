export const platformLifecycle = {
  onActivity(callback) {
    const events = ['pointerdown', 'keydown', 'touchstart'];
    const handler = () => callback();
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
    };
  },

  onPause(callback) {
    const handler = () => {
      if (document.visibilityState === 'hidden') callback();
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  },

  onResume(callback) {
    const handler = () => {
      if (document.visibilityState === 'visible') callback();
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  },

  onVisibilityChange(callback) {
    const handler = () => callback(document.visibilityState);
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  },
};
