/**
 * SDK version, injected from package.json at build time (tsup `define`, and the
 * same `define` in vitest.config.ts) so the User-Agent can never drift from the
 * published version. The fallback only appears when running unbundled TypeScript
 * outside those two tools.
 */
declare const __SDK_VERSION__: string | undefined;

export const VERSION: string =
  typeof __SDK_VERSION__ === 'string' ? __SDK_VERSION__ : '0.0.0-unbundled';
