import { defineConfig } from 'vite';
export default defineConfig({
  server: { proxy: { '/social': { target: 'ws://127.0.0.1:3001', ws: true }, '/api': 'http://127.0.0.1:3001' } },
  preview: { proxy: { '/social': { target: 'ws://127.0.0.1:3001', ws: true }, '/api': 'http://127.0.0.1:3001' } },
});
