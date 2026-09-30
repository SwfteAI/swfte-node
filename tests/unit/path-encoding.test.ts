/** N-10: an id containing ../ or ? must not be able to leave its endpoint. */
import { describe, it, expect } from 'vitest';
import { SwfteClient } from '../../src/client';
import { sweep } from './_sweep';
import { createMockResponse } from '../setup';

const EVIL = '../../admin?x=1#frag';

describe('path encoding (N-10)', () => {
  it('encodes traversal in ids for every id-taking method', async () => {
    const { seen, methods } = await sweep(
      (fetchImpl) => new SwfteClient({ apiKey: 'sk-swfte-path-test-key', fetch: fetchImpl, timeout: 100, maxRetries: 1 }),
      () => createMockResponse({}),
      EVIL
    );
    expect(methods).toBeGreaterThan(150);
    const carrying = seen.filter((s) => s.url.includes('admin'));
    // A large share of the surface takes an id; if the sweep stops reaching them the test is meaningless.
    expect(carrying.length).toBeGreaterThan(60);
    for (const { url } of carrying) {
      const path = url.split('?')[0];
      expect(path, url).not.toContain('../');
      expect(path, url).not.toContain('/admin');
      expect(url, url).not.toContain('#');
      expect(url, url).not.toMatch(/admin\?x=1/);
    }
  });
});
