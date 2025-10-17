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


