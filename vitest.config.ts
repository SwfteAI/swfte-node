import { defineConfig } from 'vitest/config';

// `npm test` runs the hermetic unit suite (mocked fetch). The integration
// suite needs a live gateway and SWFTE_API_KEY: run it with `npm run test:integration`.
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
});
