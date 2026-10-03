/** N-5: every resource call obeys timeout, uses the caller's fetch and raises typed errors. */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { SwfteClient } from '../../src/client';
import { AuthenticationError, RequestTimeoutError, APIError } from '../../src/errors';
import { Analytics } from '../../src/resources/analytics';
import { sweep } from './_sweep';

afterEach(() => vi.unstubAllGlobals());

const json = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('timeout and custom fetch (N-5)', () => {
  it('never-resolving fetch rejects within the timeout', async () => {
    const never = (() => new Promise(() => {})) as unknown as typeof fetch;
    const c = new SwfteClient({ apiKey: 'sk-swfte-timeout-test-key', fetch: never, timeout: 60, maxRetries: 1 });
    const started = Date.now();
    await expect(c.request('GET', '/models')).rejects.toBeInstanceOf(RequestTimeoutError);
    await expect(c.agents.get('a1')).rejects.toBeInstanceOf(RequestTimeoutError);
    await expect(c.files.upload({ name: 'a', contentType: 'text/plain', data: 'x' })).rejects.toBeInstanceOf(RequestTimeoutError);
    await expect(new Analytics(c).prompts.summary('a1')).rejects.toBeInstanceOf(RequestTimeoutError);
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('a body that never finishes is bounded by the timeout too', async () => {
    const slowBody = (async () => ({
      ok: true,
      status: 200,
      type: 'basic',
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () => new Promise(() => {}),
      json: () => new Promise(() => {}),
    })) as unknown as typeof fetch;
    const c = new SwfteClient({ apiKey: 'sk-swfte-timeout-test-key', fetch: slowBody, timeout: 60, maxRetries: 1 });
    await expect(c.workflows.get('w1')).rejects.toBeInstanceOf(RequestTimeoutError);
  });

  it('custom fetch is used for resource calls', async () => {
    const globalSpy = vi.fn(async () => json(200));
    vi.stubGlobal('fetch', globalSpy);
    const { seen, methods } = await sweep(
      (fetchImpl) => new SwfteClient({ apiKey: 'sk-swfte-custom-fetch-key', fetch: fetchImpl, timeout: 100, maxRetries: 1 }),
      () => json(200),
      'abc'
    );
    expect(methods).toBeGreaterThan(150);
    expect(seen.length).toBeGreaterThan(100);
    expect(globalSpy).not.toHaveBeenCalled();
    // every call carried the credentials through the caller's fetch, and none follow redirects
    for (const s of seen) {
      expect(s.init.redirect).toBe('manual');
      expect((s.init.headers as Record<string, string>).Authorization).toBe('Bearer sk-swfte-custom-fetch-key');
    }
  });

  it('typed errors from resource calls', async () => {
    const mk = (status: number) =>
      new SwfteClient({ apiKey: 'sk-swfte-typed-error-key', fetch: (async () => json(status, { error: 'x' })) as unknown as typeof fetch, maxRetries: 1 });
    await expect(mk(401).agents.get('a')).rejects.toBeInstanceOf(AuthenticationError);
    await expect(mk(403).workflows.get('w')).rejects.toBeInstanceOf(AuthenticationError);
    await expect(mk(403).files.list()).rejects.toBeInstanceOf(AuthenticationError);
    await expect(new Analytics(mk(403)).pii.check('t')).rejects.toBeInstanceOf(AuthenticationError);
    const err = await mk(404).secrets.get('s').catch((e) => e);
    expect(err).toBeInstanceOf(APIError);
    expect(err.status).toBe(404);
    const audio = await mk(403).audio.speech.create({ model: 'm', input: 'i', voice: 'nova' }).catch((e) => e);
    expect(audio).toBeInstanceOf(AuthenticationError);
  });

  it('response shapes are preserved', async () => {
    const c = (body: unknown, status = 200, ct = 'application/json') =>
      new SwfteClient({
        apiKey: 'sk-swfte-shape-key',
        fetch: (async () => new Response(status === 204 ? null : (body as string), { status, headers: { 'content-type': ct } })) as unknown as typeof fetch,
      });
    expect(await c('{"id":"a1"}').agents.get('a1')).toEqual({ id: 'a1' });
    expect(await c('', 204).agents.delete('a1')).toBeUndefined();
    const bytes = await c('abc', 200, 'audio/mpeg').audio.speech.create({ model: 'm', input: 'i', voice: 'nova' });
    expect(bytes).toBeInstanceOf(ArrayBuffer);
    expect(await c('{"text":"hi"}').audio.transcriptions.create({ model: 'm', file: new Blob(['x']) })).toEqual({ text: 'hi' });
    expect(await c('plain words', 200, 'text/plain').audio.transcriptions.create({ model: 'm', file: new Blob(['x']), response_format: 'text' })).toEqual({ text: 'plain words' });
  });
});
