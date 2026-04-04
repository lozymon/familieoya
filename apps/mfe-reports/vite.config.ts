import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';

export default defineConfig(async () => {
  const { default: tailwindcss } = await import('@tailwindcss/vite');

  return {
    plugins: [
      react(),
      tailwindcss(),
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
    server: { port: 4205 },
    preview: { port: 4205 },
    build: {
      target: 'esnext',
      outDir: '../../dist/apps/mfe-reports',
    },
  };
});
