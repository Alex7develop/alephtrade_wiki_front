import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
    proxy: {
      '/backend_wiki': {
        target: 'https://api.alephtrade.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path
      },
      // Proxy for Yandex Cloud storage to bypass CORS in dev
      '/yc': {
        target: 'https://storage.yandexcloud.net',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/yc/, '')
      }
    }
  },
  preview: {
    port: 5173
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});


