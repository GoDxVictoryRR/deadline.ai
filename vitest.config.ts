import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Vitest-specific config — separate from vite.config.ts so plain `vite build`
// doesn't see the `test` key and TypeScript stays happy.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'src/test/'],
    },
  },
});
