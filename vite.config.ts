import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [tailwindcss(), react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    // Exclude React Native / Expo packages from Vite's esbuild pre-bundler.
    // These are native-only packages that can't run on web.
    // lib/notifications.ts uses dynamic imports with a runtime guard so they
    // are never imported on web even if listed in package.json.
    optimizeDeps: {
      exclude: [
        'expo-notifications',
        'expo-device',
        'expo-constants',
        'expo-modules-core',
        'expo',
        'react-native',
      ]
    },
    build: {
      rollupOptions: {
        external: [
          'expo-notifications',
          'expo-device',
          'expo-constants',
          'expo-modules-core',
          'expo',
          'react-native',
        ]
      }
    }
  };
});