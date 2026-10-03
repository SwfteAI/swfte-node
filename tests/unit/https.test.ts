/** N-6: the bearer key only travels over https (loopback http allowed for local development). */
import { describe, it, expect } from 'vitest';
import { SwfteClient } from '../../src/client';
import { InvalidRequestError } from '../../src/errors';

const make = (extra: Record<string, unknown>) => new SwfteClient({ apiKey: 'sk-swfte-https-test-key', ...extra });

describe('https required (N-6)', () => {
  it('rejects http baseUrl for a non-localhost host', () => {
    expect(() => make({ baseUrl: 'http://api.example.com/v2/gateway' })).toThrow(InvalidRequestError);
    expect(() => make({ baseUrl: 'http://api.example.com/v2/gateway' })).toThrow(/https/);
  });

  it('rejects http apiBaseUrl', () => {
    expect(() => make({ apiBaseUrl: 'http://api.example.com/agents' })).toThrow(InvalidRequestError);
  });

  it('rejects look-alike hosts that merely start with localhost', () => {
    expect(() => make({ baseUrl: 'http://localhost.evil.com/v2/gateway' })).toThrow(InvalidRequestError);
    expect(() => make({ baseUrl: 'http://127.0.0.1.evil.com' })).toThrow(InvalidRequestError);
  });

  it('rejects non-http schemes and garbage', () => {
    expect(() => make({ baseUrl: 'ftp://example.com' })).toThrow(InvalidRequestError);
    expect(() => make({ baseUrl: 'not a url' })).toThrow(InvalidRequestError);
  });

  it('accepts http for localhost', () => {
    expect(() => make({ baseUrl: 'http://localhost:8080/v2/gateway' })).not.toThrow();
    expect(() => make({ baseUrl: 'http://127.0.0.1:8080/v2/gateway' })).not.toThrow();
    expect(() => make({ baseUrl: 'http://[::1]:8080/v2/gateway' })).not.toThrow();
    expect(make({ baseUrl: 'http://localhost:8080/v2/gateway' }).apiBaseUrl).toBe('http://localhost:8080');
  });

  it('accepts https', () => {
    expect(() => make({ baseUrl: 'https://proxy.example.com/agents' })).not.toThrow();
  });

  it('applies to SWFTE_API_BASE_URL from the environment', () => {
    process.env.SWFTE_API_BASE_URL = 'http://evil.example.com';
    try {
      expect(() => make({})).toThrow(InvalidRequestError);
    } finally {
      delete process.env.SWFTE_API_BASE_URL;
    }
  });

  it('refuses request paths that could re-point the host', async () => {
    const c = make({ fetch: (async () => new Response('{}')) as unknown as typeof fetch });
    await expect(c.apiRequest('GET', '//evil.example.com/x')).rejects.toThrow(InvalidRequestError);
    await expect(c.apiRequest('GET', 'https://evil.example.com/x')).rejects.toThrow(InvalidRequestError);
  });
});
