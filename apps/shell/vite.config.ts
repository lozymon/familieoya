import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig(async ({ mode }) => {
  // Dynamic import required — @tailwindcss/vite is ESM-only
  const { default: tailwindcss } = await import('@tailwindcss/vite');

  const env = loadEnv(mode, process.cwd(), '');
  const proxyBase = env.VITE_PROXY_URL ?? 'http://localhost:8000';

  return {
    plugins: [
      react(),
      tailwindcss(),
      federation({
        name: 'shell',
        remotes: {
          'mfe-auth': `${proxyBase}/remotes/auth/assets/remoteEntry.js`,
          'mfe-transaction': `${proxyBase}/remotes/transaction/assets/remoteEntry.js`,
          'mfe-household': `${proxyBase}/remotes/household/assets/remoteEntry.js`,
          'mfe-budget': `${proxyBase}/remotes/budget/assets/remoteEntry.js`,
          'mfe-reports': `${proxyBase}/remotes/reports/assets/remoteEntry.js`,
          'mfe-settings': `${proxyBase}/remotes/settings/assets/remoteEntry.js`,
        },
        shared: {
          react: { singleton: true, requiredVersion: '^19.0.0' },
          'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
          'react-router-dom': { singleton: true },
          '@tanstack/react-query': { singleton: true },
        } as never,
      }),
    ],
    resolve: {
      conditions: ['@familieoya/source'],
    },
    server: {
      port: 4200,
    },
    preview: {
      port: 4200,
    },
    build: {
      target: 'esnext',
      outDir: '../../dist/apps/shell',
    },
  };
});
