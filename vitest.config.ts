import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

// `npm test` runs the hermetic unit suite (mocked fetch). The integration
// suite needs a live gateway and SWFTE_API_KEY: run it with `npm run test:integration`.
export default defineConfig({
  define: { __SDK_VERSION__: JSON.stringify(pkg.version) },
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
});
