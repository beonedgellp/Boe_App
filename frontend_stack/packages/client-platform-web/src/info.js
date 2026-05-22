function detectOS() {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent || '';
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Windows|Win32|Win64/i.test(ua)) return 'desktop';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'desktop';
  if (/Linux/i.test(ua)) return 'desktop';
  return 'unknown';
}

function detectBrowser() {
  if (typeof navigator === 'undefined') return 'This browser';
  const ua = navigator.userAgent || '';
  if (/Edg/i.test(ua)) return 'Edge browser';
  if (/Chrome/i.test(ua)) return 'Chrome browser';
  if (/Firefox/i.test(ua)) return 'Firefox browser';
  if (/Safari/i.test(ua)) return 'Safari browser';
  return 'This browser';
}

export const platformInfo = {
  target: 'web',
  runtime: 'browser',
  os: detectOS(),
  isNative: false,
  isAndroid: detectOS() === 'android',
  displayName: detectBrowser(),
};
