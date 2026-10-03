/** N-9: the User-Agent version can never drift from package.json. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { SwfteClient } from '../../src/client';
import { VERSION } from '../../src/version';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { version: string };

describe('version (N-9)', () => {
  it('User-Agent version equals package.json version', () => {
    const ua = new SwfteClient({ apiKey: 'sk-swfte-version-test-key' }).getHeaders()['User-Agent'];
    expect(ua).toBe(`swfte-js/${pkg.version}`);
    expect(VERSION).toBe(pkg.version);
  });

  it('package.json is at 1.2.0', () => {
    expect(pkg.version).toBe('1.2.0');
  });
});
