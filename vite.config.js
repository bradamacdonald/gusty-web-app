import { resolve } from 'path';
import { defineConfig } from 'vite';

const pages = [
  'index',
  'forecast',
  'search',
  'saved',
  'settings',
  'detail',
  'gusty-design-system',
];

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: Object.fromEntries(
        pages.map((page) => [page, resolve(__dirname, `${page}.html`)])
      ),
    },
  },
  server: {
    port: 5173,
    open: '/index.html',
  },
});
