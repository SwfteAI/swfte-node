import type { SwfteClient } from '../client';

/**
 * Internal base class for V2 resource clients.
 *
 * Centralises the request helper so each resource module stays focused on its
 * own endpoint shape. Every call goes through `client.apiRequest`, which owns
 * the timeout, custom `fetch`, redirect refusal, typed errors and retry policy.
 */
export class V2Resource {
  protected readonly client: SwfteClient;

  constructor(client: SwfteClient) {
    this.client = client;
  }

  protected qs(params?: Record<string, unknown>): string {
    if (!params) return '';
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) {
        for (const item of v) usp.append(k, String(item));
      } else {
        usp.append(k, String(v));
      }
    }
    const s = usp.toString();
    return s ? `?${s}` : '';
  }

  /**
   * `path` is always relative to the agents-service root ({@link SwfteClient.apiBaseUrl}).
   * An absolute URL is refused, so a caller-influenced value can never redirect the
   * bearer key to another host.
   */
  protected request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, unknown>
  ): Promise<T> {
    return this.client.apiRequest<T>(method, `${path}${this.qs(query)}`, {
      body,
      responseType: 'auto',
    });
  }
}
