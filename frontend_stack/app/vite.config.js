import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const platformTarget = process.env.VITE_BEO_PLATFORM || (mode === 'android' ? 'native' : 'web');

  const clientPlatformPath = platformTarget === 'native'
    ? '../packages/client-platform-native/src'
    : '../packages/client-platform-web/src';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@beonedge/design-tokens': resolve(__dirname, '../packages/design-tokens/src'),
        '@beonedge/ui-kits': resolve(__dirname, '../packages/ui-kits/src'),
        '@beonedge/shared': resolve(__dirname, '../packages/shared/src'),
        '@beonedge/client': resolve(__dirname, '../packages/client/src'),
        '@beonedge/admin': resolve(__dirname, '../packages/admin/src'),
        '@beonedge/website': resolve(__dirname, '../packages/website/src'),
        '@beonedge/client-platform': resolve(__dirname, clientPlatformPath),
      },
    },
    server: { host: '127.0.0.1', port: 5173, open: false, strictPort: true },
  };
});