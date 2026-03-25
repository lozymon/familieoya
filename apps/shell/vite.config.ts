import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig(async () => {
  // Dynamic import required — @tailwindcss/vite is ESM-only
  const { default: tailwindcss } = await import('@tailwindcss/vite');

  return {
    plugins: [
      react(),
      tailwindcss(),
      federation({
        name: 'shell',
        remotes: {
          'mfe-auth': 'http://localhost/remotes/auth/assets/remoteEntry.js',
          'mfe-transaction':
            'http://localhost/remotes/transaction/assets/remoteEntry.js',
          'mfe-household':
            'http://localhost/remotes/household/assets/remoteEntry.js',
          'mfe-budget': 'http://localhost/remotes/budget/assets/remoteEntry.js',
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
