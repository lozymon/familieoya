import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'mfe-reports',
      filename: 'remoteEntry.js',
      exposes: {
        './MonthlyReportPage': './src/pages/MonthlyReportPage.tsx',
        './YearlyReportPage': './src/pages/YearlyReportPage.tsx',
        './MemberReportPage': './src/pages/MemberReportPage.tsx',
        './ExportHistoryPage': './src/pages/ExportHistoryPage.tsx',
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
  server: { port: 4205 },
  preview: { port: 4205 },
  build: {
    target: 'esnext',
    outDir: '../../dist/apps/mfe-reports',
  },
});
