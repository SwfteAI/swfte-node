import type { SwfteClient } from '../client';

/**
 * Secret type enum
 */
export type SecretType = 'MANUAL' | 'OAUTH' | 'MCP';

/**
 * Secret status enum
 */
export type SecretStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'PENDING';

/**
 * Secret interface
 */
export interface Secret {
  id: string;
  name: string;
  workspaceId: string;
  secretType: SecretType;
  status: SecretStatus;
  description?: string;
  category?: string;
  environment?: string;
  toolId?: string;
  provider?: string;
  maskedValue?: string;
  expiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
  lastUsedAt?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create secret parameters
 */
export interface CreateSecretParams {
  name: string;
  value: string;
  description?: string;
  category?: string;
  environment?: string;
  toolId?: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create OAuth secret parameters
 */
export interface CreateOAuthParams {
  provider: string;
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  scope?: string;
  expiresIn?: number;
  toolId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create MCP secret parameters
 */
export interface CreateMcpParams {
  toolId: string;
  token: string;
  tokenType?: string;
  scope?: string;
  expiresIn?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Update secret parameters
 */
export interface UpdateSecretParams {
  name?: string;
  value?: string;
  description?: string;
  category?: string;
  environment?: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

/**
 * List secrets parameters
 */
export interface ListSecretsParams {
  environment?: string;
  toolId?: string;
  category?: string;
  status?: string;
  page?: number;
  size?: number;
}

/**
 * Secrets list response
 */
export interface SecretsListResponse {
  secrets: Secret[];
  totalElements?: number;
  totalPages?: number;
  currentPage?: number;
  pageSize?: number;
}

/**
 * Secrets resource for managing API keys, OAuth tokens, and MCP tokens.
 *
 * @example
 * ```typescript
 * const client = new Swfte({ apiKey: 'sk-swfte-...' });
 *
 * // Create a secret
 * const secret = await client.secrets.create({
 *   name: 'openai-api-key',
 *   value: 'sk-...',
 *   description: 'OpenAI API key'
 * });
 *
 * // List secrets
 * const secrets = await client.secrets.list();
 *
 * // Delete a secret
 * await client.secrets.delete(secret.id);
 * ```
 */
export class Secrets {
  private client: SwfteClient;

  constructor(client: SwfteClient) {
    this.client = client;
  }

  /**
   * Get the base URL for secret endpoints.
   */
  private getBaseUrl(): string {
    let base = this.client.baseUrl;
    if (base.includes('/gateway')) {
      base = base.replace('/v1/gateway', '').replace('/v2/gateway', '');
    }
    return `${base}/v1/secrets`;
  }

  /**
   * Make a request to the secrets API.
   */
  private async makeRequest<T>(
    method: string,
    url: string,
    body?: unknown,
    params?: Record<string, string>
  ): Promise<T> {
    const headers = this.client.getHeaders();

    let fullUrl = url;
    if (params) {
      const searchParams = new URLSearchParams(params);
      fullUrl = `${url}?${searchParams}`;
    }

    const response = await fetch(fullUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API error: ${response.status} - ${errorBody}`);
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return undefined as T;
    }

    return response.json();
  }

  /**
   * Create a new manual secret.
   */
  async create(params: CreateSecretParams): Promise<Secret> {
    const payload = {
      name: params.name,
      value: params.value,
      description: params.description,
      category: params.category,
      environment: params.environment,
      toolId: params.toolId,
      expiresAt: params.expiresAt,
      metadata: params.metadata,
    };

    // Remove undefined values
    Object.keys(payload).forEach(key => {
      if (payload[key as keyof typeof payload] === undefined) {
        delete payload[key as keyof typeof payload];
      }
    });

    return this.makeRequest<Secret>('POST', this.getBaseUrl(), payload);
  }

  /**
   * Create an OAuth token secret.
   */
  async createOAuth(params: CreateOAuthParams): Promise<Secret> {
    const payload = {
      provider: params.provider,
      accessToken: params.accessToken,
      refreshToken: params.refreshToken,
      tokenType: params.tokenType || 'Bearer',
      scope: params.scope,
      expiresIn: params.expiresIn,
      toolId: params.toolId,
      metadata: params.metadata,
    };

    // Remove undefined values
    Object.keys(payload).forEach(key => {
      if (payload[key as keyof typeof payload] === undefined) {
        delete payload[key as keyof typeof payload];
      }
    });

    return this.makeRequest<Secret>('POST', `${this.getBaseUrl()}/oauth`, payload);
  }

  /**
   * Create an MCP token secret.
   */
  async createMcp(params: CreateMcpParams): Promise<Secret> {
    const payload = {
      toolId: params.toolId,
      token: params.token,
      tokenType: params.tokenType || 'Bearer',
      scope: params.scope,
      expiresIn: params.expiresIn,
      metadata: params.metadata,
    };

    // Remove undefined values
    Object.keys(payload).forEach(key => {
      if (payload[key as keyof typeof payload] === undefined) {
        delete payload[key as keyof typeof payload];
      }
    });

    return this.makeRequest<Secret>('POST', `${this.getBaseUrl()}/mcp`, payload);
  }

  /**
   * Get a secret by ID.
   */
  async get(secretId: string): Promise<Secret> {
    return this.makeRequest<Secret>('GET', `${this.getBaseUrl()}/${secretId}`);
  }

  /**
   * List secrets with optional filtering.
   */
  async list(params: ListSecretsParams = {}): Promise<Secret[]> {
    const queryParams: Record<string, string> = {
      page: String(params.page ?? 0),
      size: String(params.size ?? 20),
    };

    if (params.environment) queryParams.environment = params.environment;
    if (params.toolId) queryParams.toolId = params.toolId;
    if (params.category) queryParams.category = params.category;
    if (params.status) queryParams.status = params.status;

    const response = await this.makeRequest<Secret[] | SecretsListResponse>(
      'GET',
      this.getBaseUrl(),
      undefined,
      queryParams
    );

    if (Array.isArray(response)) {
      return response;
    }

    return response.secrets || [];
  }

  /**
   * Update a secret.
   */
  async update(secretId: string, params: UpdateSecretParams): Promise<Secret> {
    const payload = { ...params };

    // Remove undefined values
    Object.keys(payload).forEach(key => {
      if (payload[key as keyof typeof payload] === undefined) {
        delete payload[key as keyof typeof payload];
      }
    });

    return this.makeRequest<Secret>('PUT', `${this.getBaseUrl()}/${secretId}`, payload);
  }

  /**
   * Delete a secret.
   */
  async delete(secretId: string): Promise<void> {
    await this.makeRequest<void>('DELETE', `${this.getBaseUrl()}/${secretId}`);
  }

  /**
   * Refresh an OAuth token.
   */
  async refreshOAuth(secretId: string): Promise<Secret> {
    return this.makeRequest<Secret>('POST', `${this.getBaseUrl()}/${secretId}/refresh`);
  }

  /**
   * Revoke a secret.
   */
  async revoke(secretId: string): Promise<Secret> {
    return this.makeRequest<Secret>('POST', `${this.getBaseUrl()}/${secretId}/revoke`);
  }

  /**
   * Get the actual secret value (decrypted).
   */
  async getValue(secretId: string): Promise<string> {
    const response = await this.makeRequest<{ value: string }>(
      'GET',
      `${this.getBaseUrl()}/${secretId}/value`
    );
    return response.value;
  }

  /**
   * Rotate a secret with a new value.
   */
  async rotate(secretId: string, newValue: string): Promise<Secret> {
    return this.makeRequest<Secret>(
      'POST',
      `${this.getBaseUrl()}/${secretId}/rotate`,
      { value: newValue }
    );
  }
}
