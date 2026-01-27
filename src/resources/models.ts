import type { SwfteClient } from '../client';
import type { Model, ModelsListResponse } from '../types';

/**
 * Models listing resource.
 */
export class Models {
  private client: SwfteClient;

  constructor(client: SwfteClient) {
    this.client = client;
  }

  /**
   * List available models.
   *
   * @example
   * ```typescript
   * const models = await client.models.list();
   * for (const model of models.data) {
   *   console.log(`${model.id} - ${model.owned_by}`);
   * }
   * ```
   */
  async list(): Promise<Model[]> {
    const response = await this.client.request<ModelsListResponse | { models: Model[] }>(
      'GET',
      '/models'
    );
    return 'data' in response ? response.data : response.models;
  }

  /**
   * Retrieve a specific model.
   */
  async retrieve(modelId: string): Promise<Model> {
    return this.client.request<Model>('GET', `/models/${modelId}`);
  }
}

