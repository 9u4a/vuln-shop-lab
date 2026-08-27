import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const nodeTarget = process.env.NODE_BACKEND_URL || 'http://localhost:3000';
const javaTarget = process.env.JAVA_BACKEND_URL || 'http://localhost:8081';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api/node': {
        target: nodeTarget,
        changeOrigin: true,
        headers: { 'X-Forwarded-Proto': 'https' },
        rewrite: (path) => path.replace(/^\/api\/node/, '/api'),
      },
      '/api/java': {
        target: javaTarget,
        changeOrigin: true,
        headers: { 'X-Forwarded-Proto': 'https' },
        rewrite: (path) => path.replace(/^\/api\/java/, '/api'),
      },
      '/uploads/node': {
        target: nodeTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/uploads\/node/, '/uploads'),
      },
      '/uploads/java': {
        target: javaTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/uploads\/java/, '/uploads'),
      },
    },
  },
});
