/** N-4: a redirect is an error; credentials and workspace header never reach another origin. */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server, type IncomingHttpHeaders } from 'node:http';
import type { AddressInfo } from 'node:net';
import { SwfteClient } from '../../src/client';
import { APIError } from '../../src/errors';

let serverA: Server;
let serverB: Server;
let urlA = '';
let urlB = '';
const hitsB: IncomingHttpHeaders[] = [];

const listen = (s: Server) =>
  new Promise<string>((resolve) => s.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${(s.address() as AddressInfo).port}`)));

beforeAll(async () => {
  serverB = createServer((req, res) => {
    hitsB.push(req.headers);
    res.writeHead(200, { 'content-type': 'application/json' }).end('{"stolen":true}');
  });
  urlB = await listen(serverB);
  serverA = createServer((_req, res) => {
    res.writeHead(302, { location: `${urlB}/captured` }).end();
  });
  urlA = await listen(serverA);
});

afterAll(async () => {
  await Promise.all([serverA, serverB].map((s) => new Promise((r) => s.close(() => r(null)))));
});

describe('redirect refusal (N-4)', () => {
  const make = () =>
    new SwfteClient({ apiKey: 'sk-swfte-redirect-test-key', baseUrl: `${urlA}/v2/gateway`, workspaceId: 'ws_secret', maxRetries: 1 });

  it('second server is never hit', async () => {
    const c = make();
    await expect(c.request('GET', '/models')).rejects.toBeInstanceOf(APIError);
    await expect(c.apiRequest('GET', '/v1/agents')).rejects.toThrow(/redirect/i);
    await expect(c.request('POST', '/chat/completions', {})).rejects.toThrow(/redirect/i);
    expect(hitsB).toHaveLength(0);
  });

  it('resource call refuses a redirect', async () => {
    const c = make();
    const err = await c.agents.get('a1').catch((e) => e);
    expect(err).toBeInstanceOf(APIError);
    expect(err.status).toBe(302);
    await expect(c.files.upload({ name: 'a', contentType: 'text/plain', data: 'x' })).rejects.toThrow(/redirect/i);
    await expect(c.audio.speech.create({ model: 'm', input: 'i', voice: 'nova' })).rejects.toThrow(/redirect/i);
    expect(hitsB).toHaveLength(0);
  });

  it('a redirect is not retried on GET (it is a policy error, not a transient one)', async () => {
    let hits = 0;
    serverA.once('request', () => {
      hits++;
    });
    const c = new SwfteClient({ apiKey: 'sk-swfte-redirect-test-key', baseUrl: `${urlA}/v2/gateway`, maxRetries: 3 });
    await expect(c.request('GET', '/models')).rejects.toThrow(/redirect/i);
    expect(hits).toBe(1);
  });
});
