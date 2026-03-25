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
          'mfe-auth': 'http://localhost:4201/assets/remoteEntry.js',
          'mfe-transaction': 'http://localhost:4202/assets/remoteEntry.js',
          'mfe-household': 'http://localhost:4203/assets/remoteEntry.js',
          'mfe-budget': 'http://localhost:4204/assets/remoteEntry.js',
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
