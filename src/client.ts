import { Chat } from './resources/chat';
import { Images } from './resources/images';
import { Embeddings } from './resources/embeddings';
import { Audio } from './resources/audio';
import { Models } from './resources/models';
import { Agents } from './resources/agents';
import { Deployments } from './resources/deployments';
import { Workflows } from './resources/workflows';
import { Secrets } from './resources/secrets';
import { Conversations } from './resources/conversations';
import { ConversationsV2 } from './resources/conversationsV2';
import { AgentWizard } from './resources/agentWizard';
import { ChatFlows } from './resources/chatflows';
import { Datasets } from './resources/datasets';
import { Documents } from './resources/documents';
import { Files } from './resources/files';
import { Rag } from './resources/rag';
import { Mcp } from './resources/mcp';
import { Modules } from './resources/modules';
import { Marketplace } from './resources/marketplace';
import { VoiceCalls } from './resources/voiceCalls';
import { Audit } from './resources/audit';
import { CostControl } from './resources/costControl';
import { Catalog } from './resources/catalog';
import {
  SwfteError,
  AuthenticationError,
  RateLimitError,
  APIError,
  InvalidRequestError,
  RequestTimeoutError,
} from './errors';
import { VERSION } from './version';
import { redactDiagnostic } from './redaction';

/** Default gateway URL (OpenAI-compatible chat, images, embeddings, audio, models). */
export const DEFAULT_BASE_URL = 'https://api.swfte.com/agents/v2/gateway';

/**
 * Derive the agents-service API root from a gateway base URL by dropping a
 * trailing `/v1/gateway` or `/v2/gateway` segment.
 *
 *   https://api.swfte.com/agents/v2/gateway -> https://api.swfte.com/agents
 *   http://localhost:8080/v2/gateway        -> http://localhost:8080
 *   https://proxy.example.com/agents        -> https://proxy.example.com/agents (unchanged)
 */
export function deriveApiBaseUrl(baseUrl: string): string {
  // Same suffixes the Python SDK strips (BT-N13): /v2/gateway, /v1/gateway, /gateway.
  return baseUrl.replace(/\/+$/, '').replace(/\/(?:v[12]\/)?gateway$/, '');
}

export interface SwfteConfig {
  /** Your Swfte API key */
  apiKey: string;
  /** Base URL for the gateway API. Defaults to https://api.swfte.com/agents/v2/gateway */
  baseUrl?: string;
  /**
   * Root of the agents-service API, where agent chat (`/v1/agents/...`),
   * workflow invoke (`/v2/workflows/...`) and the catalog (`/v2/catalog/...`) live.
   * Defaults to `SWFTE_API_BASE_URL`, else `baseUrl` with its trailing
   * `/v1/gateway` or `/v2/gateway` removed (https://api.swfte.com/agents by default).
   */
  apiBaseUrl?: string;
  /** Per-attempt request timeout in milliseconds (covers reading the body). Defaults to 60000 */
  timeout?: number;
  /**
   * Maximum number of attempts (first try included). Defaults to 3. Only idempotent
   * calls are ever retried: GET/HEAD/OPTIONS, or a call that carries an idempotency key.
   */
  maxRetries?: number;
  /** Workspace ID */
  workspaceId?: string;
  /** Custom fetch implementation */
  fetch?: typeof fetch;
  /**
   * This SDK carries a SECRET key and is for servers only. In a browser-like
   * context (a global `window` or `document`) the constructor throws unless this
   * is `true`. Setting it ships your key to every visitor: use `@swfte/analytics`
   * with a `swfte_pk_` publishable key for browser telemetry instead.
   */
  dangerouslyAllowBrowser?: boolean;
}

/**
 * Swfte API client for accessing AI models through the unified gateway.
 *
 * @example
 * ```typescript
 * const client = new Swfte({ apiKey: 'sk-swfte-...' });
 *
 * const response = await client.chat.completions.create({
 *   model: 'openai:gpt-4',
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * });
 * ```
 */
export class SwfteClient {
  /** The API key lives in a true private field so it cannot be enumerated, logged or serialised. */
  readonly #apiKey: string;
  readonly baseUrl: string;
  /** Root of the agents-service API (see {@link SwfteConfig.apiBaseUrl}). */
  readonly apiBaseUrl: string;
  readonly timeout: number;
  readonly maxRetries: number;
  readonly workspaceId?: string;
  private readonly _fetch: typeof fetch;

  /** Chat completions API */
  readonly chat: Chat;
  /** Image generation API */
  readonly images: Images;
  /** Embeddings API */
  readonly embeddings: Embeddings;
  /** Audio API */
  readonly audio: Audio;
  /** Models API */
  readonly models: Models;
  /** Agents management API */
  readonly agents: Agents;
  /** Deployments management API (RunPod) */
  readonly deployments: Deployments;
  /** Workflows management API */
  readonly workflows: Workflows;
  /** Secrets management API */
  readonly secrets: Secrets;
  /** Conversations management API (V1 — preserved for backwards compatibility) */
  readonly conversations: Conversations;
  /** Conversations V2 API — multi-channel initiation, transcripts, recordings */
  readonly conversationsV2: ConversationsV2;
  /** Agent Wizard — generate agents from natural-language prompts */
  readonly agentWizard: AgentWizard;
  /** ChatFlows API — conversational forms with builder, sessions, versions, publish */
  readonly chatflows: ChatFlows;
  /** Datasets API — knowledge-base containers */
  readonly datasets: Datasets;
  /** Documents API — chunked, embedded knowledge content */
  readonly documents: Documents;
  /** Files API — workspace file uploads, downloads, previews */
  readonly files: Files;
  /** RAG API — hybrid search, reranking, vocabulary management */
  readonly rag: Rag;
  /** MCP (Model Context Protocol) API — connect servers, execute tools */
  readonly mcp: Mcp;
  /** Modules API — bundled, versioned agent/workflow packages */
  readonly modules: Modules;
  /** Marketplace API — browse and install published modules */
  readonly marketplace: Marketplace;
  /** Voice Calls API — list, transcripts, recordings, audit */
  readonly voiceCalls: VoiceCalls;
  /** Audit API — query and export the audit log */
  readonly audit: Audit;
  /** Cost Control API — routing rules, usage caps, autoscaling */
  readonly costControl: CostControl;
  /** Catalog API — search proven artifacts, read their detail and invoke contract */
  readonly catalog: Catalog;

  constructor(config: SwfteConfig) {
    const apiKey = config.apiKey || readEnv('SWFTE_API_KEY');
    if (!apiKey) {
      throw new AuthenticationError(
        'API key is required. Pass apiKey in config or set SWFTE_API_KEY environment variable.'
      );
    }

    if (isBrowserLike() && !config.dangerouslyAllowBrowser) {
      throw new SwfteError(
        'The Swfte Node SDK carries a secret API key and must not run in a browser: the key would be ' +
          'visible to every visitor. Call Swfte from your server, or use @swfte/analytics with a ' +
          'swfte_pk_ publishable key for browser telemetry. To override, pass dangerouslyAllowBrowser: true.'
      );
    }

    this.#apiKey = apiKey;
    this.baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
    const explicitApiBase = config.apiBaseUrl || readEnv('SWFTE_API_BASE_URL');
    this.apiBaseUrl = explicitApiBase
      ? explicitApiBase.replace(/\/+$/, '')
      : deriveApiBaseUrl(this.baseUrl);
    try {
      assertSecureUrl('baseUrl', this.baseUrl);
      assertSecureUrl('apiBaseUrl', this.apiBaseUrl);
    } catch (error) { throw this.redactError(error); }
    this.timeout = config.timeout || 60000;
    this.maxRetries = config.maxRetries ?? 3;
    this.workspaceId = config.workspaceId || readEnv('SWFTE_WORKSPACE_ID');
    this._fetch = config.fetch || ((...args) => fetch(...args));

    // Initialize resources
    this.chat = new Chat(this);
    this.images = new Images(this);
    this.embeddings = new Embeddings(this);
    this.audio = new Audio(this);
    this.models = new Models(this);
    this.agents = new Agents(this);
    this.deployments = new Deployments(this);
    this.workflows = new Workflows(this);
    this.secrets = new Secrets(this);
    this.conversations = new Conversations(this);
    this.conversationsV2 = new ConversationsV2(this);
    this.agentWizard = new AgentWizard(this);
    this.chatflows = new ChatFlows(this);
    this.datasets = new Datasets(this);
    this.documents = new Documents(this);
    this.files = new Files(this);
    this.rag = new Rag(this);
    this.mcp = new Mcp(this);
    this.modules = new Modules(this);
    this.marketplace = new Marketplace(this);
    this.voiceCalls = new VoiceCalls(this);
    this.audit = new Audit(this);
    this.costControl = new CostControl(this);
    this.catalog = new Catalog(this);
  }

  /**
   * Get default headers for API requests.
   */
  getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.#apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': `swfte-js/${VERSION}`,
    };
    if (this.workspaceId) {
      headers['X-Workspace-ID'] = this.workspaceId;
    }
    return headers;
  }

  /** Internal failure boundary shared with resources; successful payloads stay intact. */
  redactError<T>(error: T): T {
    return redactDiagnostic(error, this.#apiKey);
  }

  /** Never reveal the key when a client (or a resource that holds one) is logged. */
  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return this.redactError(`SwfteClient { baseUrl: '${this.baseUrl}', apiBaseUrl: '${this.apiBaseUrl}', apiKey: '${redactKey(this.#apiKey)}' }`);
  }

  /** Never reveal the key when a client is serialised. */
  toJSON(): Record<string, unknown> {
    return this.redactError({
      baseUrl: this.baseUrl,
      apiBaseUrl: this.apiBaseUrl,
      timeout: this.timeout,
      maxRetries: this.maxRetries,
      workspaceId: this.workspaceId,
      apiKey: redactKey(this.#apiKey),
    });
  }

  /**
   * Make a request against the agents-service API ({@link apiBaseUrl}). Every
   * management resource goes through here, so they all share one policy:
   *
   * - `timeout` bounds each attempt, including reading the body, even when a
   *   custom `fetch` ignores the abort signal;
   * - the configured (or default) `fetch` is used, never a bare global;
   * - redirects are never followed: a 3xx is an error (the bearer key and
   *   workspace header must not be replayed to another origin);
   * - errors are typed: 401/403 -> AuthenticationError, 429 -> RateLimitError
   *   (with `retryAfter`), timeout -> RequestTimeoutError, any other non-2xx ->
   *   APIError (with `status` and the parsed `body`);
   * - only idempotent calls (GET/HEAD/OPTIONS, or any call with an
   *   `idempotencyKey`) are retried, and only on network errors, timeouts, 429
   *   and 5xx. A POST that may already have run is never silently repeated.
   */
  async apiRequest<T>(
    method: string,
    path: string,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    try {
      assertPath(path);
      const url = `${this.apiBaseUrl}${path}${buildQuery(options.query)}`;
      return await this.send<T>(method, url, path, options.body, options);
    } catch (error) { throw this.redactError(error); }
  }

  /**
   * Like {@link apiRequest}, for resource modules that already hold an absolute
   * URL (built from {@link apiBaseUrl}, possibly with a query string). The URL
   * must sit under {@link apiBaseUrl}; anything else is refused so a value that
   * is influenced by a caller can never carry the bearer key to another origin.
   */
  async apiRequestUrl<T>(
    method: string,
    url: string,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    try {
      const base = new URL(this.apiBaseUrl).href.replace(/\/+$/, '');
      const target = new URL(url).href;
      if (!target.startsWith(`${base}/`)) {
        throw new InvalidRequestError(`Refusing to send credentials to a URL outside apiBaseUrl: ${url}`);
      }
      return await this.apiRequest<T>(method, target.slice(base.length), options);
    } catch (error) { throw this.redactError(error); }
  }

  /**
   * Make a request against the gateway ({@link baseUrl}): chat, images,
   * embeddings, models. Same policy as {@link apiRequest}. With `stream: true`
   * the raw response body is returned once headers arrive (timeout covers that
   * phase only) and the call is never retried.
   */
  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: {
      timeout?: number;
      stream?: boolean;
      idempotencyKey?: string;
      /** Multipart body (uploads); the JSON Content-Type header is dropped for it. */
      formData?: FormData;
      /** How to read a 2xx body. Default: strict JSON. */
      responseType?: 'json-strict' | 'auto' | 'arrayBuffer';
    }
  ): Promise<T> {
    try {
      assertPath(path);
      return await this.send<T>(method, `${this.baseUrl}${path}`, path, body, {
        timeout: options?.timeout,
        idempotencyKey: options?.idempotencyKey,
        formData: options?.formData,
        responseType: options?.stream ? 'stream' : options?.responseType ?? 'json-strict',
        noRetry: options?.stream,
      });
    } catch (error) { throw this.redactError(error); }
  }

  private async send<T>(
    method: string,
    url: string,
    path: string,
    body: unknown,
    options: Omit<ApiRequestOptions, 'responseType'> & { responseType?: ResponseType; noRetry?: boolean }
  ): Promise<T> {
    const label = `${method} ${path}`;
    const timeout = options.timeout || this.timeout;
    const upper = method.toUpperCase();
    const idempotent =
      !options.noRetry &&
      (upper === 'GET' || upper === 'HEAD' || upper === 'OPTIONS' || !!options.idempotencyKey);
    const attempts = Math.max(1, this.maxRetries);

    const headers = this.getHeaders();
    let payload: BodyInit | undefined;
    if (options.formData) {
      // Let fetch set the multipart boundary.
      delete headers['Content-Type'];
      payload = options.formData;
    } else if (body !== undefined) {
      payload = JSON.stringify(body);
    }
    if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        return await this.withDeadline(label, timeout, async (signal) => {
          const response = await this._fetch(url, {
            method,
            headers,
            body: payload,
            signal,
            // Never follow a redirect: it would replay the bearer key and workspace
            // header to wherever the server (or a spoofed hop) points.
            redirect: 'manual',
          });
          return this.consume<T>(response, label, options.responseType ?? 'json');
        });
      } catch (error) {
        if (!idempotent || attempt === attempts - 1 || !isRetryable(error)) throw error;
        await sleep(retryDelayMs(error, attempt));
      }
    }
    throw new SwfteError('Request failed');
  }

  /** Turn a response into a value or a typed error. Runs inside the deadline. */
  private async consume<T>(response: Response, label: string, type: ResponseType): Promise<T> {
    if ((response.status >= 300 && response.status < 400) || response.type === 'opaqueredirect') {
      throw new APIError(
        `Refusing to follow a redirect (${response.status}) for ${label}: the API never redirects, ` +
          'and following would send your credentials elsewhere. Check baseUrl/apiBaseUrl.',
        response.status || 302
      );
    }

    if (!response.ok) {
      const text = await response.text();
      let parsed: unknown = text || undefined;
      if (text) {
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = text;
        }
      }
      const message = `API error: ${response.status} ${label}${text ? ` - ${text}` : ''}`;
      if (response.status === 401 || response.status === 403) {
        throw new AuthenticationError(message, response.status);
      }
      if (response.status === 429) {
        throw new RateLimitError(message, parseRetryAfter(response.headers?.get?.('retry-after')));
      }
      throw new APIError(message, response.status, parsed);
    }

    switch (type) {
      case 'stream':
        return response.body as unknown as T;
      case 'json-strict':
        return (await response.json()) as T;
      case 'arrayBuffer':
        return (await response.arrayBuffer()) as unknown as T;
      case 'auto': {
        if (response.status === 204 || response.headers.get('content-length') === '0') {
          return undefined as T;
        }
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) return (await response.json()) as T;
        if (contentType.startsWith('text/')) return (await response.text()) as unknown as T;
        return (await response.arrayBuffer()) as unknown as T;
      }
      default: {
        // 'json': tolerant. Empty body -> undefined, non-JSON body -> the text.
        const text = await response.text();
        if (!text) return undefined as T;
        try {
          return JSON.parse(text) as T;
        } catch {
          return text as unknown as T;
        }
      }
    }
  }

  /**
   * Run `work` with a hard deadline. The deadline is a race, not just an abort
   * signal: a caller-supplied fetch that ignores the signal still cannot hang us.
   */
  private async withDeadline<T>(
    label: string,
    timeoutMs: number,
    work: (signal: AbortSignal) => Promise<T>
  ): Promise<T> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new RequestTimeoutError(`Request timed out after ${timeoutMs}ms: ${label}`));
      }, timeoutMs);
    });
    const running = work(controller.signal);
    running.catch(() => undefined); // if the deadline wins, do not leave an unhandled rejection
    try {
      return await Promise.race([running, deadline]);
    } finally {
      clearTimeout(timer);
    }
  }
}


// Default export
export default SwfteClient;


export interface ApiRequestOptions {
  body?: unknown;
  query?: Record<string, unknown>;
  timeout?: number;
  /** Multipart body (file uploads). The JSON Content-Type header is dropped for it. */
  formData?: FormData;
  /**
   * How to read a 2xx response. `'json'` (default): parsed JSON, empty -> undefined,
   * non-JSON -> text. `'auto'`: by Content-Type (JSON, text, else ArrayBuffer; 204 ->
   * undefined). `'arrayBuffer'`: raw bytes.
   */
  responseType?: 'json' | 'auto' | 'arrayBuffer';
  /**
   * Sent as `Idempotency-Key` and marks the call safe to retry. Only pass one when
   * the server deduplicates on it; otherwise a retry can run the operation twice.
   */
  idempotencyKey?: string;
}

type ResponseType = 'json' | 'json-strict' | 'auto' | 'arrayBuffer' | 'stream';

function buildQuery(params?: Record<string, unknown>): string {
  if (!params) return '';
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    usp.append(k, Array.isArray(v) ? v.map(String).join(',') : String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

/** Read an env var without assuming a Node `process` exists (Deno, workers, browsers). */
function readEnv(name: string): string | undefined {
  try {
    return typeof process !== 'undefined' ? process.env?.[name] : undefined;
  } catch {
    return undefined;
  }
}

function isBrowserLike(): boolean {
  const g = globalThis as { window?: unknown; document?: unknown };
  return typeof g.window !== 'undefined' || typeof g.document !== 'undefined';
}

/** `sk-swfte-abc...wxyz` -> `...wxyz`; short keys are fully masked. Never the whole key. */
function redactKey(key: string): string {
  return key.length >= 16 ? `...${key.slice(-4)}` : '[REDACTED]';
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Bearer credentials only travel over https (loopback http is allowed for local development). */
function assertSecureUrl(name: string, value: string): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new InvalidRequestError(`${name} is not a valid URL`);
  }
  if (url.protocol === 'https:') return;
  if (url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname)) return;
  throw new InvalidRequestError(
    `${name} must use https (http is allowed only for localhost, 127.0.0.1 and ::1); got ${url.protocol}//${url.host}`
  );
}

function assertPath(path: string): void {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new InvalidRequestError(`Request path must start with a single "/": ${path}`);
  }
}

function isRetryable(error: unknown): boolean {
  if (error instanceof RateLimitError || error instanceof RequestTimeoutError) return true;
  if (error instanceof APIError) return error.status >= 500;
  // Any other typed SDK error (auth, invalid request) is final; a bare Error is a network failure.
  return !(error instanceof SwfteError);
}

function retryDelayMs(error: unknown, attempt: number): number {
  if (error instanceof RateLimitError && error.retryAfter !== undefined) {
    return Math.min(error.retryAfter * 1000, 30_000);
  }
  return Math.pow(2, attempt) * 100;
}

function parseRetryAfter(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;
  const date = Date.parse(value);
  if (!Number.isNaN(date)) return Math.max(0, (date - Date.now()) / 1000);
  return undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
