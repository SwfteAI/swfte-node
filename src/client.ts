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
import { SwfteError, AuthenticationError } from './errors';

export interface SwfteConfig {
  /** Your Swfte API key */
  apiKey: string;
  /** Base URL for the API. Defaults to https://api.swfte.com/v2/gateway */
  baseUrl?: string;
  /** Request timeout in milliseconds. Defaults to 60000 */
  timeout?: number;
  /** Maximum number of retries. Defaults to 3 */
  maxRetries?: number;
  /** Workspace ID */
  workspaceId?: string;
  /** Custom fetch implementation */
  fetch?: typeof fetch;
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
  readonly apiKey: string;
  readonly baseUrl: string;
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
  /** Conversations management API */
  readonly conversations: Conversations;

  constructor(config: SwfteConfig) {
    const apiKey = config.apiKey || process.env.SWFTE_API_KEY;
    if (!apiKey) {
      throw new AuthenticationError(
        'API key is required. Pass apiKey in config or set SWFTE_API_KEY environment variable.'
      );
    }

    this.apiKey = apiKey;
    this.baseUrl = (config.baseUrl || 'https://api.swfte.com/v2/gateway').replace(/\/$/, '');
    this.timeout = config.timeout || 60000;
    this.maxRetries = config.maxRetries || 3;
    this.workspaceId = config.workspaceId || process.env.SWFTE_WORKSPACE_ID;
    this._fetch = config.fetch || fetch;

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
  }

  /**
   * Get default headers for API requests.
   */
  getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'swfte-js/1.0.0',
    };
    if (this.workspaceId) {
      headers['X-Workspace-ID'] = this.workspaceId;
    }
    return headers;
  }

  /**
   * Make an HTTP request with retry logic.
   */
  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: { timeout?: number; stream?: boolean }
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const timeout = options?.timeout || this.timeout;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await this._fetch(url, {
          method,
          headers: this.getHeaders(),
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 401) {
          throw new AuthenticationError('Invalid API key');
        }

        if (!response.ok) {
          const errorBody = await response.text();
          throw new SwfteError(`API error: ${response.status} - ${errorBody}`);
        }

        if (options?.stream) {
          return response.body as unknown as T;
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;
        if (error instanceof AuthenticationError) {
          throw error;
        }
        if (attempt === this.maxRetries - 1) {
          throw lastError;
        }
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    }

    throw lastError || new SwfteError('Request failed');
  }
}

// Default export
export default SwfteClient;

