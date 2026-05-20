import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT = '/home/nethunter07/.gemini/antigravity/brain/183336af-2ec6-4077-a350-bec1d11f9d30/scratch';
mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  // 1. Login via API
  const loginResp = await fetch('http://127.0.0.1:47502/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier: 'rahulkumarbhakat2234@gmail.com', password: 'RaHul.123' }),
  });
  const loginData = await loginResp.json();
  const { user, accessToken, refreshToken } = loginData.data;
  console.log('Login OK, user:', user.email);

  // Set localStorage on origin BEFORE the app loads
  await page.goto('http://127.0.0.1:5199/app/splash');
  await page.waitForTimeout(500);
  await page.evaluate(({ user, accessToken, refreshToken }) => {
    localStorage.setItem('boe.client.user', JSON.stringify(user));
    localStorage.setItem('boe.client.accessToken', accessToken);
    localStorage.setItem('boe.client.refreshToken', refreshToken);
  }, { user, accessToken, refreshToken });

  // Force reload so SessionProvider reads from localStorage
  await page.goto('http://127.0.0.1:5199/app/transactions', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const url = page.url();
  console.log('Page URL:', url);

  await page.screenshot({ path: `${OUT}/tx_desktop.png`, fullPage: true });
  console.log('tx_desktop saved');

  // Mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/tx_mobile.png`, fullPage: true });
  console.log('tx_mobile saved');

  // Statements
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('http://127.0.0.1:5199/app/statements', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/statements_desktop.png`, fullPage: true });
  console.log('statements_desktop saved');

  // Notifications
  await page.goto('http://127.0.0.1:5199/app/notifications', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/notifications_desktop.png`, fullPage: true });
  console.log('notifications_desktop saved');

  await browser.close();
  console.log('Done');
})();
