function detectOS() {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent || '';
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Windows|Win32|Win64|Macintosh|Mac OS X|Linux/i.test(ua)) return 'web';
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

const os = detectOS();

export const platformInfo = {
  target: 'web',
  runtime: 'browser',
  os,
  isNative: false,
  isAndroid: os === 'android',
  displayName: detectBrowser(),
};
