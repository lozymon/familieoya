import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'mfe-transaction',
      filename: 'remoteEntry.js',
      exposes: {
        './DashboardPage': './src/pages/DashboardPage',
        './TransactionListPage': './src/pages/TransactionListPage',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' } as never,
        'react-dom': { singleton: true },
        'react-router-dom': { singleton: true },
        '@tanstack/react-query': { singleton: true },
      },
    }),
  ],
  resolve: { conditions: ['@familieoya/source'] },
  server: { port: 4202 },
  preview: { port: 4202 },
  build: {
    target: 'esnext',
    outDir: '../../dist/apps/mfe-transaction',
  },
});
