/**
 * Test helper (not a test file): call every public method of every resource with
 * hostile string arguments and report the URLs handed to the injected fetch.
 * Reflection means a resource added later is covered without touching the test.
 */
import { SwfteClient } from '../../src/client';
import { Analytics } from '../../src/resources/analytics';

export interface Seen {
  url: string;
  init: RequestInit;
}

const SKIP_METHODS = /^(constructor|makeRequest|request|host|url|qs|getBaseUrl|getV2BaseUrl|subscribe)$|wait|poll|stream|watch/i;

function collectTargets(client: SwfteClient): Array<{ path: string; obj: object }> {
  const roots: Array<{ path: string; obj: object }> = [];
  const seen = new Set<object>();
  const walk = (path: string, obj: unknown, depth: number) => {
    if (!obj || typeof obj !== 'object' || seen.has(obj as object) || obj === client || depth > 3) return;
    seen.add(obj as object);
    roots.push({ path, obj: obj as object });
    // own data properties (nested resources like audio.speech) and prototype getters (analytics.prompts)
    for (const key of Object.getOwnPropertyNames(obj)) {
      if (key.startsWith('_') || key === 'client') continue;
      walk(`${path}.${key}`, (obj as Record<string, unknown>)[key], depth + 1);
    }
    const proto = Object.getPrototypeOf(obj);
    for (const key of Object.getOwnPropertyNames(proto)) {
      const d = Object.getOwnPropertyDescriptor(proto, key);
      if (d?.get) walk(`${path}.${key}`, (obj as Record<string, unknown>)[key], depth + 1);
    }
  };
  for (const key of Object.getOwnPropertyNames(client)) {
    walk(key, (client as unknown as Record<string, unknown>)[key], 0);
  }
  walk('analytics', new Analytics(client), 0);
  return roots;
}

/** Drive every method; `arg` is used for every positional parameter. Returns what fetch saw. */
export async function sweep(
  make: (fetchImpl: typeof fetch) => SwfteClient,
  respond: (url: string) => Response,
  arg: unknown
): Promise<{ seen: Seen[]; methods: number }> {
  const seen: Seen[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    seen.push({ url: String(url), init });
    return respond(String(url));
  }) as unknown as typeof fetch;
  const client = make(fetchImpl);
  let methods = 0;
  for (const { path, obj } of collectTargets(client)) {
    const proto = Object.getPrototypeOf(obj);
    for (const name of Object.getOwnPropertyNames(proto)) {
      const d = Object.getOwnPropertyDescriptor(proto, name);
      if (typeof d?.value !== 'function' || SKIP_METHODS.test(name)) continue;
      methods++;
      try {
        const objArg = { id: arg, name: 'n', data: 'd', contentType: 'text/plain' };
        await Promise.race([
          (obj as Record<string, (...a: unknown[]) => unknown>)[name](arg, arg, arg),
          new Promise((r) => setTimeout(r, 300)),
        ]);
        await Promise.race([
          (obj as Record<string, (...a: unknown[]) => unknown>)[name](objArg, arg),
          new Promise((r) => setTimeout(r, 300)),
        ]);
      } catch {
        /* wrong argument shape or a typed API error: only the URLs matter */
      }
      void path;
    }
  }
  return { seen, methods };
}
