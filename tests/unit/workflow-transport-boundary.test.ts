import { describe, expect, it } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { SwfteClient } from '../../src/client';
import { isValidCallsiteId } from '../../src/callsite';

const ID = 'cs_' + 'a'.repeat(24);
const INPUT = { text: 'héllo 世界 🦊', sessionId: 'session-transport', nested: { enabled: true } };
async function listen(server: http.Server): Promise<string> {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}
async function close(server: http.Server): Promise<void> {
  server.closeIdleConnections();
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
const client = (base: string) => new SwfteClient({ apiKey: 'transport-test-token', baseUrl: base, apiBaseUrl: base, workspaceId: 'workspace-A', maxRetries: 3 });

describe('actual workflow execute transport boundary', () => {
  it('accepts exactly27 callsite bytes and drops terminal line endings', async () => {
    expect(isValidCallsiteId(ID)).toBe(true);
    for (const suffix of ['\n', '\r', '\r\n', ' ', '\u2028', '\u2029']) expect(isValidCallsiteId(ID + suffix)).toBe(false);
    expect(isValidCallsiteId(ID.slice(1))).toBe(false);
  });

  it('preserves Unicode/session payload, auth/workspace/callsite and legacy skipValidation', async () => {
    const seen: Array<{ url: string; method: string; headers: http.IncomingHttpHeaders; body: unknown }> = [];
    const server = http.createServer(async (req, res) => {
      const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
      seen.push({ url: req.url!, method: req.method!, headers: req.headers, body: JSON.parse(Buffer.concat(chunks).toString('utf8')) });
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ executionId: 'execution-transport', sessionId: 'session-transport', status: 'PENDING' }));
    });
    const base = await listen(server);
    try {
      const c = client(base);
      const response = await c.workflows.execute('wf_transport', INPUT, { skipValidation: true, callsite: ID });
      expect(response).toMatchObject({ executionId: 'execution-transport', sessionId: 'session-transport' });
      await c.workflows.execute('wf_transport', INPUT, true);
      await c.workflows.execute('wf_transport', INPUT, { callsite: ID + '\n' });
      expect(seen).toHaveLength(3);
      expect(seen[0]).toMatchObject({ method: 'POST', url: '/v2/workflows/wf_transport/execute?skipValidation=true', body: INPUT,
        headers: { authorization: 'Bearer transport-test-token', 'x-workspace-id': 'workspace-A', 'x-swfte-callsite': ID } });
      expect(seen[1].url).toBe('/v2/workflows/wf_transport/execute?skipValidation=true');
      expect(seen[1].headers['x-swfte-callsite']).toBeUndefined();
      expect(seen[2].headers['x-swfte-callsite']).toBeUndefined();
      expect(seen[2].body).toEqual(INPUT);
    } finally { await close(server); }
  });

  for (const status of [302, 307]) it(`refuses actual execute ${status} without a second-listener request`, async () => {
    let firstRequests = 0, secondRequests = 0;
    const second = http.createServer((req, res) => { secondRequests++; req.resume(); res.end('{}'); });
    const destination = await listen(second);
    const first = http.createServer(async (req, res) => {
      for await (const _chunk of req) { /* fully accept the original effect body */ }
      firstRequests++;
      res.writeHead(status, { Location: destination + '/credential-receiver' }); res.end();
    });
    const base = await listen(first);
    try {
      await expect(client(base).workflows.execute('wf_transport', INPUT, { callsite: ID })).rejects.toThrow();
      expect(firstRequests).toBe(1);
      expect(secondRequests).toBe(0); // Removing redirect:error must cause this exact assertion to fail.
    } finally { await close(first); await close(second); }
  });
});
