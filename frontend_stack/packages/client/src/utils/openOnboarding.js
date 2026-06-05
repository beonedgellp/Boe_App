import { Capacitor } from '@capacitor/core';

// Sign-up / learner-account creation now lives on the public Next.js landing
// page (#lead form), which posts to the same unchanged backend onboarding
// endpoint. Override per environment via VITE_BEO_WEB_ONBOARDING_URL.
const url = import.meta.env.VITE_BEO_WEB_ONBOARDING_URL || 'http://127.0.0.1:3100/#lead';

export async function openOnboarding() {
  if (Capacitor.isNativePlatform()) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url });
  } else {
    window.open(url, '_blank', 'noopener');
  }
}
