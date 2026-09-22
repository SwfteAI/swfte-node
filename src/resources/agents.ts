import { InvalidRequestError } from '../errors';
import type { SwfteClient } from '../client';

/**
 * Agent interface
 */
export interface Agent {
  id: string;
  agentName: string;
  description?: string;
  systemPrompt?: string;
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  active?: boolean;
  verified?: boolean;
  inputType?: string;
  outputType?: string;
  workspaceId?: string;
  mode?: string;
  workflowId?: string;
  useWorkflow?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Agent creation parameters
 */
export interface CreateAgentParams {
  name: string;
  description?: string;
  systemPrompt?: string;
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  mode?: string;
  [key: string]: unknown;
}

/**
 * Agent update parameters
 */
export interface UpdateAgentParams {
  name?: string;
  description?: string;
  systemPrompt?: string;
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  mode?: string;
  active?: boolean;
  [key: string]: unknown;
}

/**
 * Agent list response
 */
export interface AgentListResponse {
  agents: Agent[];
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/**
 * IO Types response
 */
export interface IOTypesResponse {
  inputTypes: Array<{ value: string; label: string }>;
  outputTypes: Array<{ value: string; label: string }>;
}

/**
 * Model option
 */
export interface ModelOption {
  qualifier: string;
  modelName: string;
  label: string;
}

/**
 * Avatar configuration
 */
export interface AvatarConfig {
  type?: string;
  avatarUrl?: string;
  backgroundColor?: string;
  [key: string]: unknown;
}

/**
 * Default `userId` used by {@link Agents.chat} when none is given.
 *
 * The agents service keeps one conversation space per (agent, userId), so every
 * call that omits `userId` shares this identity. Pass your own end-user id when
 * several people talk to the same agent through your application.
 */
export const DEFAULT_CHAT_USER_ID = 'sdk-user';

/**
 * Options for {@link Agents.chat}.
 */
export interface AgentChatOptions {
  /** Conversation owner. Defaults to {@link DEFAULT_CHAT_USER_ID} (`"sdk-user"`). */
  userId?: string;
  /** Continue an existing conversation (the `conversationId` of an earlier reply). */
  conversationId?: string;
}

/**
 * Reply from `POST /v1/agents/{agentId}/chat/{userId}`.
 *
 * `response` is the agent's reply text. Some agents-service builds return it
 * under `content`; the SDK normalises both to `response` and leaves the raw
 * fields in place.
 */
export interface AgentChatResponse {
  /** The agent's reply text. */
  response: string;
  /** Pass back as `conversationId` to continue the conversation. */
  conversationId: string | null;
  sessionId?: string | null;
  agentId?: string;
  userId?: string;
  requestId?: string;
  durationMs?: number;
  model?: string;
  provider?: string;
  inputTokens?: number;
  outputTokens?: number;
  iterations?: number;
  reasoningContent?: string;
  toolExecutions?: unknown[];
  warnings?: unknown[];
  [key: string]: unknown;
}

/**
 * Agents resource for agent management.
 *
 * @example
 * ```typescript
 * const client = new Swfte({ apiKey: 'sk-swfte-...' });
 *
 * // Create an agent
 * const agent = await client.agents.create({
 *   name: 'My Assistant',
 *   systemPrompt: 'You are a helpful assistant.',
 *   provider: 'OPENAI',
 *   model: 'gpt-4'
 * });
 *
 * // List all agents
 * const agents = await client.agents.list();
 *
 * // Chat with it (reply text is `response`)
 * const reply = await client.agents.chat(agent.id, 'Hello!', { userId: 'user-42' });
 *
 * // Delete an agent
 * await client.agents.delete(agent.id);
 * ```
 */
export class Agents {
  private client: SwfteClient;

  constructor(client: SwfteClient) {
    this.client = client;
  }

  /**
   * Get the base URL for agent endpoints.
   */
  private getBaseUrl(): string {
    const base = this.client.apiBaseUrl;
    return `${base}/v1/agents`;
  }

  /**
   * Get the V2 base URL for agent endpoints.
   */
  private getV2BaseUrl(): string {
    const base = this.client.apiBaseUrl;
    return `${base}/v2/agents`;
  }

  /**
   * Make a request to the agent API.
   */
  private async makeRequest<T>(
    method: string,
    url: string,
    body?: unknown
  ): Promise<T> {
    const headers = this.client.getHeaders();
    
    const response = await fetch(url, {
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
   * Create a new agent.
   */
  async create(params: CreateAgentParams): Promise<Agent> {
    const payload = {
      agentName: params.name,
      description: params.description,
      systemPrompt: params.systemPrompt,
      provider: params.provider || 'OPENAI',
      model: params.model || 'gpt-4',
      temperature: params.temperature ?? 0.7,
      maxTokens: params.maxTokens ?? 2048,
      mode: params.mode || 'agent-chat',
      ...params,
    };

    return this.makeRequest<Agent>('POST', this.getBaseUrl(), payload);
  }

  /**
   * Get an agent by ID.
   */
  async get(agentId: string): Promise<Agent> {
    return this.makeRequest<Agent>('GET', `${this.getBaseUrl()}/${agentId}`);
  }

  /**
   * Update an existing agent.
   */
  async update(agentId: string, params: UpdateAgentParams): Promise<Agent> {
    const current = await this.get(agentId);
    const payload = { ...current, ...params };
    
    if (params.name !== undefined) {
      payload.agentName = params.name;
    }
    if (params.systemPrompt !== undefined) {
      payload.systemPrompt = params.systemPrompt;
    }
    if (params.maxTokens !== undefined) {
      payload.maxTokens = params.maxTokens;
    }

    return this.makeRequest<Agent>('PUT', `${this.getBaseUrl()}/${agentId}`, payload);
  }

  /**
   * Partially update an agent using PATCH.
   */
  async patch(agentId: string, updates: Partial<Agent>): Promise<Agent> {
    return this.makeRequest<Agent>('PATCH', `${this.getV2BaseUrl()}/${agentId}`, updates);
  }

  /**
   * Delete an agent.
   */
  async delete(agentId: string): Promise<void> {
    await this.makeRequest<void>('DELETE', `${this.getBaseUrl()}/${agentId}`);
  }

  /**
   * List all agents.
   */
  async list(page: number = 1, size: number = 20): Promise<Agent[]> {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    const response = await this.makeRequest<AgentListResponse>(
      'GET',
      `${this.getBaseUrl()}?${params}`
    );
    return response.agents || [];
  }

  /**
   * Get available input/output types.
   */
  async getIOTypes(): Promise<IOTypesResponse> {
    return this.makeRequest<IOTypesResponse>('GET', `${this.getBaseUrl()}/io-types`);
  }

  /**
   * Get available model options for a provider.
   */
  async getModelOptions(provider: string): Promise<ModelOption[]> {
    return this.makeRequest<ModelOption[]>(
      'GET',
      `${this.getBaseUrl()}/models/${provider.toUpperCase()}`
    );
  }

  /**
   * Associate a workflow with an agent.
   */
  async associateWorkflow(agentId: string, workflowId: string): Promise<Agent> {
    return this.makeRequest<Agent>(
      'POST',
      `${this.getV2BaseUrl()}/${agentId}/workflow`,
      { workflowId }
    );
  }

  /**
   * Update agent avatar configuration.
   */
  async updateAvatar(agentId: string, avatarConfig: AvatarConfig): Promise<Agent> {
    return this.makeRequest<Agent>(
      'PATCH',
      `${this.getV2BaseUrl()}/${agentId}/avatar`,
      avatarConfig
    );
  }

  /**
   * Get system agents.
   */
  async getSystemAgents(): Promise<Agent[]> {
    return this.makeRequest<Agent[]>('GET', `${this.getBaseUrl()}/system`);
  }

  /**
   * Send one message to an agent and return its reply.
   *
   * `POST {apiBaseUrl}/v1/agents/{agentId}/chat/{userId}` with body
   * `{ message, conversationId? }`. This is the same endpoint Studio's agent
   * tester uses; it runs the agent's full configuration (tools, knowledge,
   * memory) and keeps conversation history per (agent, userId).
   *
   * Not retried: a retry would send the message twice.
   *
   * @throws AuthenticationError on 401/403, RateLimitError on 429, APIError otherwise.
   */
  async chat(
    agentId: string,
    message: string,
    options: AgentChatOptions = {}
  ): Promise<AgentChatResponse> {
    if (!agentId) throw new InvalidRequestError('agentId is required');
    if (typeof message !== 'string' || message.length === 0) {
      throw new InvalidRequestError('message must be a non-empty string');
    }
    const userId = options.userId || DEFAULT_CHAT_USER_ID;
    const body: { message: string; conversationId?: string } = { message };
    if (options.conversationId) body.conversationId = options.conversationId;

    const raw = await this.client.apiRequest<Record<string, unknown> | null>(
      'POST',
      `/v1/agents/${encodeURIComponent(agentId)}/chat/${encodeURIComponent(userId)}`,
      { body }
    );
    const data = raw && typeof raw === 'object' ? raw : {};
    const reply = data.response ?? data.content ?? '';
    return {
      ...data,
      response: typeof reply === 'string' ? reply : JSON.stringify(reply),
      conversationId: (data.conversationId as string | undefined) ?? null,
    } as AgentChatResponse;
  }
}







