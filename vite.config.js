import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 1000 },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
});
