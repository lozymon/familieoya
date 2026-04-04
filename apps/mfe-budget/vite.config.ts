import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'mfe-budget',
      filename: 'remoteEntry.js',
      exposes: {
        './BudgetPage': './src/pages/BudgetPage',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' } as never,
        'react-dom': { singleton: true },
        'react-router-dom': { singleton: true },
        '@tanstack/react-query': { singleton: true },
      },
    }),
  ],
  resolve: {
    conditions: ['@familieoya/source'],
    alias: {
      '@familieoya/ui': path.resolve(__dirname, '../../libs/ui/src/index.ts'),
      '@familieoya/api-client': path.resolve(
        __dirname,
        '../../libs/api-client/src/index.ts',
      ),
    },
  },
  server: { port: 4204 },
  preview: { port: 4204 },
  build: {
    target: 'esnext',
    outDir: '../../dist/apps/mfe-budget',
  },
});
