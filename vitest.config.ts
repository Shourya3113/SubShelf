import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

// Kept separate from vite.config.ts so tests don't load the CRX build plugin
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
