import type { SwfteClient } from '../client';
import type { ImageGenerationRequest, ImageGenerationResponse } from '../types';

/**
 * Image generation resource.
 */
export class Images {
  private client: SwfteClient;

  constructor(client: SwfteClient) {
    this.client = client;
  }

  /**
   * Generate images from a text prompt.
   *
   * @example
   * ```typescript
   * const response = await client.images.generate({
   *   model: 'openai:dall-e-3',
   *   prompt: 'A sunset over mountains',
   *   size: '1024x1024'
   * });
   * console.log(response.data[0].url);
   * ```
   */
  async generate(params: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    return this.client.request<ImageGenerationResponse>(
      'POST',
      '/images/generations',
      params,
      { timeout: this.client.timeout * 3 }
    );
  }

  /**
   * Edit an image using a prompt.
   */
  async edit(params: {
    model: string;
    image: Blob;
    prompt: string;
    mask?: Blob;
    n?: number;
    size?: string;
  }): Promise<ImageGenerationResponse> {
    const formData = new FormData();
    formData.append('model', params.model);
    formData.append('image', params.image);
    formData.append('prompt', params.prompt);
    if (params.mask) {
      formData.append('mask', params.mask);
    }
    if (params.n) {
      formData.append('n', params.n.toString());
    }
    if (params.size) {
      formData.append('size', params.size);
    }

    const response = await fetch(`${this.client.baseUrl}/images/edits`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.client.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }
}

