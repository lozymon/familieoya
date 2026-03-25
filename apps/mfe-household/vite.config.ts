import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'mfe-household',
      filename: 'remoteEntry.js',
      exposes: {
        './HouseholdPage': './src/pages/HouseholdPage',
        './InvitationPage': './src/pages/InvitationPage',
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
  server: { port: 4203 },
  preview: { port: 4203 },
  build: {
    target: 'esnext',
    outDir: '../../dist/apps/mfe-household',
  },
});
