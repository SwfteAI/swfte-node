/**
 * Type definitions for the Swfte SDK.
 */

// ==================== Messages ====================

export interface Message {
  /** Role of the message author */
  role: 'system' | 'user' | 'assistant' | 'function' | 'tool';
  /** Content of the message */
  content: string | null;
  /** Name of the author (for function messages) */
  name?: string;
  /** Function call made by the assistant */
  function_call?: {
    name: string;
    arguments: string;
  };
  /** Tool calls made by the assistant */
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

export interface DeltaMessage {
  role?: 'system' | 'user' | 'assistant';
  content?: string | null;
  function_call?: {
    name?: string;
    arguments?: string;
  };
  tool_calls?: Array<{
    index: number;
    id?: string;
    type?: 'function';
    function?: {
      name?: string;
      arguments?: string;
    };
  }>;
}

// ==================== Chat Completions ====================

export interface ChatCompletionRequest {
  /** Model ID (e.g., "openai:gpt-4", "anthropic:claude-3-opus") */
  model: string;
  /** List of messages in the conversation */
  messages: Message[];
  /** Sampling temperature (0-2) */
  temperature?: number;
  /** Nucleus sampling parameter */
  top_p?: number;
  /** Maximum tokens to generate */
  max_tokens?: number;
  /** Whether to stream the response */
  stream?: boolean;
  /** Stop sequences */
  stop?: string | string[];
  /** Presence penalty (-2 to 2) */
  presence_penalty?: number;
  /** Frequency penalty (-2 to 2) */
  frequency_penalty?: number;
  /** User identifier */
  user?: string;
  /** Additional parameters */
  [key: string]: unknown;
}

export interface ChatCompletionChoice {
  index: number;
  message: Message;
  finish_reason: 'stop' | 'length' | 'function_call' | 'tool_calls' | 'content_filter' | null;
}

export interface ChatCompletionChunkChoice {
  index: number;
  delta: DeltaMessage;
  finish_reason: 'stop' | 'length' | 'function_call' | 'tool_calls' | 'content_filter' | null;
  /** Message field for wrapped non-streaming responses */
  message?: Message;
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatCompletion {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: Usage;
}

export interface ChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: ChatCompletionChunkChoice[];
}

// ==================== Images ====================

export interface ImageGenerationRequest {
  /** Model ID */
  model: string;
  /** Text prompt */
  prompt: string;
  /** Number of images (1-10) */
  n?: number;
  /** Image size */
  size?: '256x256' | '512x512' | '1024x1024' | '1024x1792' | '1792x1024';
  /** Image quality */
  quality?: 'standard' | 'hd';
  /** Image style */
  style?: 'vivid' | 'natural';
  /** Response format */
  response_format?: 'url' | 'b64_json';
  /** Negative prompt */
  negative_prompt?: string;
}

export interface ImageData {
  url?: string;
  b64_json?: string;
  revised_prompt?: string;
}

export interface ImageGenerationResponse {
  created: number;
  data: ImageData[];
}

// ==================== Embeddings ====================

export interface EmbeddingRequest {
  /** Model ID */
  model: string;
  /** Input text(s) */
  input: string | string[];
  /** Encoding format */
  encoding_format?: 'float' | 'base64';
}

export interface Embedding {
  object: 'embedding';
  index: number;
  embedding: number[];
}

export interface EmbeddingUsage {
  prompt_tokens: number;
  total_tokens: number;
}

export interface EmbeddingResponse {
  object: 'list';
  model: string;
  data: Embedding[];
  usage: EmbeddingUsage;
}

// ==================== Audio ====================

export interface TranscriptionRequest {
  /** Model ID */
  model: string;
  /** Audio file */
  file: Blob | ArrayBuffer;
  /** Language code (ISO-639-1) */
  language?: string;
  /** Optional prompt */
  prompt?: string;
  /** Response format */
  response_format?: 'json' | 'text' | 'srt' | 'vtt';
  /** Sampling temperature */
  temperature?: number;
}

export interface TranscriptionResponse {
  text: string;
}

export interface SpeechRequest {
  /** Model ID */
  model: string;
  /** Text to convert */
  input: string;
  /** Voice to use */
  voice?: string;
  /** Audio format */
  response_format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav';
  /** Speech speed (0.25-4.0) */
  speed?: number;
}

// ==================== Models ====================

export interface Model {
  id: string;
  object: 'model';
  created: number;
  owned_by: string;
}

export interface ModelsListResponse {
  object: 'list';
  data: Model[];
}

