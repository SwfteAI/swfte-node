/** N-2: the SDK carries a secret key and refuses to run in a browser unless told to. */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { SwfteClient } from '../../src/client';
import { SwfteError } from '../../src/errors';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('browser guard (N-2)', () => {
  it('constructs when process is undefined', () => {
    vi.stubGlobal('process', undefined);
    const c = new SwfteClient({ apiKey: 'sk-swfte-guard-test-key' });
    expect(c.baseUrl).toBe('https://api.swfte.com/agents/v2/gateway');
  });

  it('throws in a browser context with a secret key', () => {
    vi.stubGlobal('window', {});
    expect(() => new SwfteClient({ apiKey: 'sk-swfte-guard-test-key' })).toThrow(SwfteError);
    expect(() => new SwfteClient({ apiKey: 'sk-swfte-guard-test-key' })).toThrow(/dangerouslyAllowBrowser/);
  });

  it('throws when only document is defined', () => {
    vi.stubGlobal('document', {});
    expect(() => new SwfteClient({ apiKey: 'sk-swfte-guard-test-key' })).toThrow(/browser/);
  });

  it('allows a browser context with dangerouslyAllowBrowser', () => {
    vi.stubGlobal('window', {});
    const c = new SwfteClient({ apiKey: 'sk-swfte-guard-test-key', dangerouslyAllowBrowser: true });
    expect(c.baseUrl).toContain('https://');
  });

  it('does not refuse a plain server context', () => {
    expect(() => new SwfteClient({ apiKey: 'sk-swfte-guard-test-key' })).not.toThrow();
  });
});
