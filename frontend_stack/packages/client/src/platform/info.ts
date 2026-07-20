import { Capacitor } from '@capacitor/core';

function detectCapacitor() {
  try {
    return Boolean(Capacitor.isNativePlatform?.());
  } catch {
    return false;
  }
}

function detectOS() {
  try {
    return Capacitor.getPlatform?.() || 'android';
  } catch {
    return 'android';
  }
}

const isNative = detectCapacitor();
const os = detectOS();

export const platformInfo = {
  target: 'native',
  runtime: 'capacitor',
  os,
  isNative,
  isAndroid: os === 'android',
  displayName: isNative ? 'Android app' : 'Android app (preview)',
};
