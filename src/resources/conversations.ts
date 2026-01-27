import type { SwfteClient } from '../client';

/**
 * Message interface
 */
export interface Message {
  id: string;
  role: string;
  content: string;
  conversationId?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  name?: string;
}

/**
 * Tool call interface
 */
export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Conversation interface
 */
export interface Conversation {
  id: string;
  workspaceId: string;
  title?: string;
  agentId?: string;
  model?: string;
  systemPrompt?: string;
  createdAt?: string;
  updatedAt?: string;
  messageCount?: number;
  totalTokens?: number;
  metadata?: Record<string, unknown>;
  messages?: Message[];
}

/**
 * Create conversation parameters
 */
export interface CreateConversationParams {
  title?: string;
  agentId?: string;
  model?: string;
  systemPrompt?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Update conversation parameters
 */
export interface UpdateConversationParams {
  title?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Add message parameters
 */
export interface AddMessageParams {
  role: string;
  content: string;
  name?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Get messages parameters
 */
export interface GetMessagesParams {
  limit?: number;
  beforeToken?: string;
  afterToken?: string;
  order?: 'asc' | 'desc';
}

/**
 * Message page response
 */
export interface MessagePage {
  messages: Message[];
  hasMore: boolean;
  nextToken?: string;
  totalCount?: number;
}

/**
 * List conversations parameters
 */
export interface ListConversationsParams {
  agentId?: string;
  page?: number;
  size?: number;
}

/**
 * Conversations list response
 */
export interface ConversationsListResponse {
  conversations: Conversation[];
  totalElements?: number;
  totalPages?: number;
  currentPage?: number;
  pageSize?: number;
}

/**
 * Conversations resource for managing conversation history.
 *
 * @example
 * ```typescript
 * const client = new Swfte({ apiKey: 'sk-swfte-...' });
 *
 * // Create a conversation
 * const conversation = await client.conversations.create({
 *   title: 'Chat about AI',
 *   model: 'gpt-4o'
 * });
 *
 * // Add a message
 * const message = await client.conversations.addMessage(conversation.id, {
 *   role: 'user',
 *   content: 'What is machine learning?'
 * });
 *
 * // Get messages
 * const page = await client.conversations.getMessages(conversation.id, { limit: 10 });
 * ```
 */
export class Conversations {
  private client: SwfteClient;

  constructor(client: SwfteClient) {
    this.client = client;
  }

  /**
   * Get the base URL for conversation endpoints.
   */
  private getBaseUrl(): string {
    let base = this.client.baseUrl;
    if (base.includes('/gateway')) {
      base = base.replace('/v1/gateway', '').replace('/v2/gateway', '');
    }
    return `${base}/v1/conversations`;
  }

  /**
   * Make a request to the conversations API.
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
   * Create a new conversation.
   */
  async create(params: CreateConversationParams = {}): Promise<Conversation> {
    const payload = { ...params };

    // Remove undefined values
    Object.keys(payload).forEach(key => {
      if (payload[key as keyof typeof payload] === undefined) {
        delete payload[key as keyof typeof payload];
      }
    });

    return this.makeRequest<Conversation>('POST', this.getBaseUrl(), payload);
  }

  /**
   * Get a conversation by ID.
   */
  async get(conversationId: string): Promise<Conversation> {
    return this.makeRequest<Conversation>('GET', `${this.getBaseUrl()}/${conversationId}`);
  }

  /**
   * List conversations.
   */
  async list(params: ListConversationsParams = {}): Promise<Conversation[]> {
    const queryParams: Record<string, string> = {
      page: String(params.page ?? 0),
      size: String(params.size ?? 20),
    };

    if (params.agentId) queryParams.agentId = params.agentId;

    const response = await this.makeRequest<Conversation[] | ConversationsListResponse>(
      'GET',
      this.getBaseUrl(),
      undefined,
      queryParams
    );

    if (Array.isArray(response)) {
      return response;
    }

    return response.conversations || [];
  }

  /**
   * Update a conversation.
   */
  async update(conversationId: string, params: UpdateConversationParams): Promise<Conversation> {
    const payload = { ...params };

    // Remove undefined values
    Object.keys(payload).forEach(key => {
      if (payload[key as keyof typeof payload] === undefined) {
        delete payload[key as keyof typeof payload];
      }
    });

    return this.makeRequest<Conversation>('PUT', `${this.getBaseUrl()}/${conversationId}`, payload);
  }

  /**
   * Delete a conversation.
   */
  async delete(conversationId: string): Promise<void> {
    await this.makeRequest<void>('DELETE', `${this.getBaseUrl()}/${conversationId}`);
  }

  /**
   * Add a message to a conversation.
   */
  async addMessage(conversationId: string, params: AddMessageParams): Promise<Message> {
    const payload = {
      role: params.role,
      content: params.content,
      name: params.name,
      toolCalls: params.toolCalls,
      toolCallId: params.toolCallId,
      metadata: params.metadata,
    };

    // Remove undefined values
    Object.keys(payload).forEach(key => {
      if (payload[key as keyof typeof payload] === undefined) {
        delete payload[key as keyof typeof payload];
      }
    });

    return this.makeRequest<Message>(
      'POST',
      `${this.getBaseUrl()}/${conversationId}/messages`,
      payload
    );
  }

  /**
   * Get messages from a conversation with pagination.
   */
  async getMessages(conversationId: string, params: GetMessagesParams = {}): Promise<MessagePage> {
    const queryParams: Record<string, string> = {
      limit: String(params.limit ?? 50),
      order: params.order || 'desc',
    };

    if (params.beforeToken) queryParams.beforeToken = params.beforeToken;
    if (params.afterToken) queryParams.afterToken = params.afterToken;

    return this.makeRequest<MessagePage>(
      'GET',
      `${this.getBaseUrl()}/${conversationId}/messages`,
      undefined,
      queryParams
    );
  }

  /**
   * Get a specific message.
   */
  async getMessage(conversationId: string, messageId: string): Promise<Message> {
    return this.makeRequest<Message>(
      'GET',
      `${this.getBaseUrl()}/${conversationId}/messages/${messageId}`
    );
  }

  /**
   * Delete a message from a conversation.
   */
  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    await this.makeRequest<void>(
      'DELETE',
      `${this.getBaseUrl()}/${conversationId}/messages/${messageId}`
    );
  }

  /**
   * Clear all messages from a conversation.
   */
  async clearMessages(conversationId: string): Promise<void> {
    await this.makeRequest<void>(
      'POST',
      `${this.getBaseUrl()}/${conversationId}/messages/clear`
    );
  }

  /**
   * Get conversation context optimized for LLM input.
   */
  async getContext(
    conversationId: string,
    maxTokens: number = 4000,
    includeSystem: boolean = true
  ): Promise<Message[]> {
    const queryParams: Record<string, string> = {
      maxTokens: String(maxTokens),
      includeSystem: String(includeSystem),
    };

    const response = await this.makeRequest<{ messages: Message[] }>(
      'GET',
      `${this.getBaseUrl()}/${conversationId}/context`,
      undefined,
      queryParams
    );

    return response.messages || [];
  }

  /**
   * Fork a conversation from a specific point.
   */
  async fork(
    conversationId: string,
    fromMessageId?: string,
    title?: string
  ): Promise<Conversation> {
    const payload: Record<string, string> = {};
    if (fromMessageId) payload.fromMessageId = fromMessageId;
    if (title) payload.title = title;

    return this.makeRequest<Conversation>(
      'POST',
      `${this.getBaseUrl()}/${conversationId}/fork`,
      payload
    );
  }

  /**
   * Export a conversation.
   */
  async export(conversationId: string, format: string = 'json'): Promise<unknown> {
    return this.makeRequest<unknown>(
      'GET',
      `${this.getBaseUrl()}/${conversationId}/export`,
      undefined,
      { format }
    );
  }

  /**
   * Get a summary of the conversation.
   */
  async summarize(conversationId: string, maxLength: number = 500): Promise<string> {
    const response = await this.makeRequest<{ summary: string }>(
      'GET',
      `${this.getBaseUrl()}/${conversationId}/summarize`,
      undefined,
      { maxLength: String(maxLength) }
    );

    return response.summary || '';
  }
}
