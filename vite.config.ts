import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    outDir: 'dist',
    target: 'node20',
    ssr: true,
    rollupOptions: {
      external: [/^node:/, /^@modelcontextprotocol/, /^axios/, /^debug/, /^zod/],
      output: {
        banner: '#!/usr/bin/env node',
      },
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
    },
  },
});
