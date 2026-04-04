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
        name: 'mfe-auth',
        filename: 'remoteEntry.js',
        exposes: {
          './LoginPage': './src/pages/LoginPage',
          './RegisterPage': './src/pages/RegisterPage',
          './ProfilePage': './src/pages/ProfilePage',
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
      alias: {
        '@familieoya/ui': path.resolve(__dirname, '../../libs/ui/src/index.ts'),
        '@familieoya/api-client': path.resolve(
          __dirname,
          '../../libs/api-client/src/index.ts',
        ),
      },
    },
    server: {
      port: 4201,
    },
    preview: {
      port: 4201,
    },
    build: {
      target: 'esnext',
      outDir: '../../dist/apps/mfe-auth',
    },
  };
});
