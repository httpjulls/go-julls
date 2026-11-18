/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  plugins: [react()],
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: {
    outDir: 'dist',
    target: 'es2019',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // worker do pdf.js como .js: o servidor local do Android pode não reconhecer .mjs como JavaScript
        assetFileNames: (info) => (info.name?.endsWith('.mjs') ? 'assets/[name]-[hash].js' : 'assets/[name]-[hash][extname]'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    // testes nunca falam com o Supabase de verdade (mesmo com .env preenchido)
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '', VITE_UPDATE_URL: '' },
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
});
