import type { SwfteClient } from '../client';
import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionRequest,
} from '../types';

/**
 * Chat completions resource.
 */
export class Completions {
  private client: SwfteClient;

  constructor(client: SwfteClient) {
    this.client = client;
  }

  /**
   * Create a chat completion.
   *
   * @example
   * ```typescript
   * const response = await client.chat.completions.create({
   *   model: 'openai:gpt-4',
   *   messages: [{ role: 'user', content: 'Hello!' }]
   * });
   * console.log(response.choices[0].message.content);
   * ```
   */
  async create(
    params: ChatCompletionRequest & { stream?: false }
  ): Promise<ChatCompletion>;
  async create(
    params: ChatCompletionRequest & { stream: true }
  ): Promise<AsyncIterable<ChatCompletionChunk>>;
  async create(
    params: ChatCompletionRequest
  ): Promise<ChatCompletion | AsyncIterable<ChatCompletionChunk>>;
  async create(
    params: ChatCompletionRequest
  ): Promise<ChatCompletion | AsyncIterable<ChatCompletionChunk>> {
    if (params.stream) {
      return this.createStream(params);
    }

    return this.client.request<ChatCompletion>('POST', '/chat/completions', params);
  }

  /**
   * Create a streaming chat completion.
   */
  private async createStream(
    params: ChatCompletionRequest
  ): Promise<AsyncIterable<ChatCompletionChunk>> {
    // Use the dedicated streaming endpoint
    const response = await this.client.request<ReadableStream<Uint8Array>>(
      'POST',
      '/chat/completions/stream',
      params,
      { stream: true }
    );

    return this.parseStream(response);
  }

  /**
   * Parse SSE stream into chunks.
   */
  private async *parseStream(
    stream: ReadableStream<Uint8Array>
  ): AsyncIterable<ChatCompletionChunk> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          // Handle both "data:" and "data: " formats
          if (trimmed.startsWith('data:')) {
            // Remove "data:" prefix and any leading whitespace
            const data = trimmed.slice(5).trimStart();
            if (data === '[DONE]') {
              return;
            }
            try {
              yield JSON.parse(data) as ChatCompletionChunk;
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

/**
 * Chat API resource.
 */
export class Chat {
  /** Completions API */
  readonly completions: Completions;

  constructor(client: SwfteClient) {
    this.completions = new Completions(client);
  }
}

