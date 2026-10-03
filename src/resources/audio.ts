import type { SwfteClient } from '../client';
import type { TranscriptionRequest, TranscriptionResponse, SpeechRequest } from '../types';

/**
 * Audio transcription resource.
 */
export class Transcriptions {
  private client: SwfteClient;

  constructor(client: SwfteClient) {
    this.client = client;
  }

  /**
   * Transcribe audio to text.
   *
   * @example
   * ```typescript
   * const file = await fs.readFile('audio.mp3');
   * const result = await client.audio.transcriptions.create({
   *   model: 'openai:whisper-1',
   *   file: new Blob([file])
   * });
   * console.log(result.text);
   * ```
   */
  async create(params: TranscriptionRequest): Promise<TranscriptionResponse> {
    const formData = new FormData();
    formData.append('model', params.model);
    // Include filename for proper content-type detection
    const blob = params.file instanceof Blob ? params.file : new Blob([params.file], { type: 'audio/mpeg' });
    formData.append('file', blob, 'audio.mp3');

    if (params.language) {
      formData.append('language', params.language);
    }
    if (params.prompt) {
      formData.append('prompt', params.prompt);
    }
    if (params.response_format) {
      formData.append('response_format', params.response_format);
    }
    if (params.temperature !== undefined) {
      formData.append('temperature', params.temperature.toString());
    }

    const asJson = params.response_format === 'json' || !params.response_format;
    const result = await this.client.request<TranscriptionResponse | string>(
      'POST',
      '/audio/transcriptions',
      undefined,
      { formData, responseType: asJson ? 'json-strict' : 'auto' }
    );
    return typeof result === 'string' ? { text: result } : result;
  }
}

/**
 * Text-to-speech resource.
 */
export class Speech {
  private client: SwfteClient;

  constructor(client: SwfteClient) {
    this.client = client;
  }

  /**
   * Generate speech from text.
   *
   * @example
   * ```typescript
   * const audio = await client.audio.speech.create({
   *   model: 'openai:tts-1',
   *   input: 'Hello world!',
   *   voice: 'nova'
   * });
   * // audio is an ArrayBuffer
   * ```
   */
  async create(params: SpeechRequest): Promise<ArrayBuffer> {
    return this.client.request<ArrayBuffer>('POST', '/audio/speech', params, {
      responseType: 'arrayBuffer',
    });
  }
}

/**
 * Audio API resource.
 */
export class Audio {
  /** Transcriptions API */
  readonly transcriptions: Transcriptions;
  /** Speech API */
  readonly speech: Speech;

  constructor(client: SwfteClient) {
    this.transcriptions = new Transcriptions(client);
    this.speech = new Speech(client);
  }
}

