import type { SwfteClient } from '../client';

/**
 * Internal base class for V2 resource clients.
 *
 * Centralises base-URL resolution and the request helper so each resource
 * module stays focused on its own endpoint shape.
 */
export class V2Resource {
  protected readonly client: SwfteClient;

  constructor(client: SwfteClient) {
    this.client = client;
  }

  /**
   * Resolve the workspace-service host from the configured baseUrl.
   *
   * Strips any `/v1/gateway` or `/v2/gateway` suffix so the resource module
   * can build absolute paths under `/v2/...` or `/api/v2/...`.
   */
  protected host(): string {
    let base = this.client.baseUrl;
    if (base.includes('/gateway')) {
      base = base.replace('/v2/gateway', '').replace('/v1/gateway', '');
    }
    return base.replace(/\/$/, '');
  }

  protected url(path: string): string {
    if (path.startsWith('http')) return path;
    return `${this.host()}${path.startsWith('/') ? '' : '/'}${path}`;
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

  protected async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, unknown>
  ): Promise<T> {
    const headers = this.client.getHeaders();
    const fullUrl = this.url(path) + this.qs(query);

    const response = await fetch(fullUrl, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API error: ${response.status} - ${errorBody}`);
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return undefined as T;
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return (await response.json()) as T;
    }
    // Binary or text payloads — return as ArrayBuffer cast for the caller.
    if (contentType.startsWith('text/')) {
      return (await response.text()) as unknown as T;
    }
    return (await response.arrayBuffer()) as unknown as T;
  }
}
