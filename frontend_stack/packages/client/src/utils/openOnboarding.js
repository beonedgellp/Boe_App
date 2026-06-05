import { Capacitor } from '@capacitor/core';

const url = import.meta.env.VITE_BEO_ONBOARDING_URL || 'http://127.0.0.1:3100/signup';

export async function openOnboarding() {
  if (Capacitor.isNativePlatform()) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url });
  } else {
    window.open(url, '_blank', 'noopener');
  }
}
