/** N-3: the secret key must not leak through inspect, JSON, string coercion or enumeration. */
import { describe, it, expect } from 'vitest';
import { inspect } from 'node:util';
import { SwfteClient } from '../../src/client';

const KEY = 'sk-swfte-SUPERSECRETVALUE-0123456789abcd';

describe('key redaction (N-3)', () => {
  const client = new SwfteClient({ apiKey: KEY, workspaceId: 'ws_1' });

  it('util.inspect never contains the key', () => {
    for (const opts of [{}, { depth: 10 }, { showHidden: true, depth: 10 }, { getters: true }]) {
      expect(inspect(client, opts)).not.toContain(KEY);
      expect(inspect(client, opts)).not.toContain('SUPERSECRET');
    }
    expect(inspect({ nested: { client } }, { depth: 10 })).not.toContain('SUPERSECRET');
  });

  it('JSON.stringify never contains the key', () => {
    expect(JSON.stringify(client)).not.toContain('SUPERSECRET');
    expect(JSON.stringify({ a: [client] })).not.toContain('SUPERSECRET');
  });

  it('exposes no enumerable or own property holding the key', () => {
    const own = Object.getOwnPropertyNames(client).concat(Object.keys(client));
    expect(own).not.toContain('apiKey');
    for (const name of own) {
      const v = (client as unknown as Record<string, unknown>)[name];
      if (typeof v === 'string') expect(v).not.toContain('SUPERSECRET');
    }
    expect((client as unknown as Record<string, unknown>).apiKey).toBeUndefined();
  });

  it('string coercion and the serialised form keep a redacted tail only', () => {
    expect(String(client)).not.toContain('SUPERSECRET');
    expect(inspect(client)).toContain('...abcd');
  });

  it('still sends the key on the wire', () => {
    expect(client.getHeaders().Authorization).toBe(`Bearer ${KEY}`);
  });
});
