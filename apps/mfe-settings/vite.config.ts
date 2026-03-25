import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'mfe-settings',
      filename: 'remoteEntry.js',
      exposes: {
        './SettingsPage': './src/pages/SettingsPage.tsx',
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
  server: { port: 4206 },
  preview: { port: 4206 },
  build: {
    target: 'esnext',
    outDir: '../../dist/apps/mfe-settings',
  },
});
