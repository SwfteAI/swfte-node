/**
 * N-1: typed errors and a retry policy that never repeats a request that may
 * already have run. Every test counts real calls to the injected fetch.
 */
import { describe, it, expect } from 'vitest';
import { SwfteClient } from '../../src/client';
import { AuthenticationError, RateLimitError, APIError } from '../../src/errors';
import { createMockResponse } from '../setup';

function stub(status: number, headers: Record<string, string> = {}) {
  const calls: string[] = [];
  const fetchImpl = (async (url: string) => {
    calls.push(String(url));
    return createMockResponse({ error: `status ${status}` }, { status, headers });
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

function client(fetchImpl: typeof fetch) {
  return new SwfteClient({ apiKey: 'sk-swfte-retry-test-key', fetch: fetchImpl, maxRetries: 3 });
}

describe('retry policy (N-1)', () => {
  it('400 makes exactly one fetch call', async () => {
    const { calls, fetchImpl } = stub(400);
    await expect(client(fetchImpl).request('POST', '/chat/completions', {})).rejects.toBeInstanceOf(APIError);
    expect(calls).toHaveLength(1);
  });

  it('401 makes exactly one fetch call', async () => {
    const { calls, fetchImpl } = stub(401);
    await expect(client(fetchImpl).request('GET', '/models')).rejects.toBeInstanceOf(AuthenticationError);
    expect(calls).toHaveLength(1);
  });

  it('403 makes exactly one fetch call', async () => {
    const { calls, fetchImpl } = stub(403);
    const err = await client(fetchImpl).request('GET', '/models').catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.status).toBe(403);
    expect(calls).toHaveLength(1);
  });

  it('429 on GET is retried', async () => {
    const { calls, fetchImpl } = stub(429, { 'Retry-After': '0' });
    const err = await client(fetchImpl).request('GET', '/models').catch((e) => e);
    expect(err).toBeInstanceOf(RateLimitError);
    expect(calls).toHaveLength(3);
  });

  it('429 honours Retry-After on the error', async () => {
    const { fetchImpl } = stub(429, { 'Retry-After': '7' });
    const c = new SwfteClient({ apiKey: 'sk-swfte-retry-test-key', fetch: fetchImpl, maxRetries: 1 });
    const err = (await c.request('POST', '/chat/completions', {}).catch((e) => e)) as RateLimitError;
    expect(err).toBeInstanceOf(RateLimitError);
    expect(err.retryAfter).toBe(7);
  });

  it('500 on GET is retried', async () => {
    const { calls, fetchImpl } = stub(500);
    await expect(client(fetchImpl).request('GET', '/models')).rejects.toBeInstanceOf(APIError);
    expect(calls).toHaveLength(3);
  });

  it('POST without an idempotency key is not retried', async () => {
    const { calls, fetchImpl } = stub(500);
    await expect(client(fetchImpl).request('POST', '/chat/completions', {})).rejects.toBeInstanceOf(APIError);
    expect(calls).toHaveLength(1);
  });

  it('POST with an idempotency key is retried on 5xx', async () => {
    const { calls, fetchImpl } = stub(503);
    await expect(
      client(fetchImpl).request('POST', '/chat/completions', {}, { idempotencyKey: 'k-1' })
    ).rejects.toBeInstanceOf(APIError);
    expect(calls).toHaveLength(3);
  });

  it('a network error on POST is not retried, on GET it is', async () => {
    let n = 0;
    const boom = (async () => {
      n++;
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    await expect(client(boom).request('POST', '/chat/completions', {})).rejects.toThrow('fetch failed');
    expect(n).toBe(1);
    n = 0;
    await expect(client(boom).request('GET', '/models')).rejects.toThrow('fetch failed');
    expect(n).toBe(3);
  });

  it('management calls (apiRequest) follow the same policy', async () => {
    const a = stub(403);
    await expect(client(a.fetchImpl).apiRequest('GET', '/v1/agents/x')).rejects.toBeInstanceOf(AuthenticationError);
    expect(a.calls).toHaveLength(1);
    const b = stub(500);
    await expect(client(b.fetchImpl).apiRequest('POST', '/v1/agents', { body: {} })).rejects.toBeInstanceOf(APIError);
    expect(b.calls).toHaveLength(1);
  });
});
