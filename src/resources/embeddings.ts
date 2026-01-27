import type { SwfteClient } from '../client';
import type { EmbeddingRequest, EmbeddingResponse } from '../types';

/**
 * Embeddings resource.
 */
export class Embeddings {
  private client: SwfteClient;

  constructor(client: SwfteClient) {
    this.client = client;
  }

  /**
   * Create embeddings for the input text(s).
   *
   * @example
   * ```typescript
   * const response = await client.embeddings.create({
   *   model: 'openai:text-embedding-3-small',
   *   input: 'The quick brown fox jumps over the lazy dog'
   * });
   * console.log(response.data[0].embedding.length);
   * ```
   */
  async create(params: EmbeddingRequest): Promise<EmbeddingResponse> {
    return this.client.request<EmbeddingResponse>('POST', '/embeddings', params);
  }
}

