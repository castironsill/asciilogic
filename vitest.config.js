import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // jsdom gives us `document`, which some modules (notifications) touch at import time.
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
  },
});
