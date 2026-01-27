/**
 * Comprehensive Gateway Integration Tests - JavaScript/TypeScript SDK
 *
 * This module provides comprehensive integration tests for all supported providers
 * and modalities through the Swfte unified gateway.
 *
 * Supports:
 * - Proprietary providers: OpenAI, Anthropic, Google, Mistral, Cohere, DeepSeek
 * - Self-hosted: RunPod deployments (LLM, TTS, STT, Image)
 * - All modalities: Chat, Streaming, Embeddings, Images, TTS, STT
 *
 * Usage:
 *   npx vitest run tests/integration/gateway-comprehensive.test.ts
 *   npx vitest run tests/integration/gateway-comprehensive.test.ts -t "openai"
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { SwfteClient } from '../../src';
import * as fs from 'fs';
import * as path from 'path';

// ==================== TYPES ====================

interface ProviderConfig {
  name: string;
  chatModel: string;
  embeddingModel?: string;
  imageModel?: string;
  ttsModel?: string;
  sttModel?: string;
  supportsStreaming: boolean;
  supportsFunctionCalling: boolean;
  skipReason?: string;
}

interface TestResult {
  provider: string;
  testName: string;
  passed: boolean;
  latencyMs: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

// ==================== PROVIDER CONFIGURATIONS ====================

const PROPRIETARY_PROVIDERS: Record<string, ProviderConfig> = {
  openai: {
    name: 'OpenAI',
    chatModel: 'gpt-4o-mini',
    embeddingModel: 'text-embedding-3-small',
    imageModel: 'dall-e-3',
    ttsModel: 'tts-1',
    sttModel: 'whisper-1',
    supportsStreaming: true,
    supportsFunctionCalling: true,
  },
  anthropic: {
    name: 'Anthropic',
    chatModel: 'claude-3-haiku-20240307',
    supportsStreaming: true,
    supportsFunctionCalling: true,
  },
  google: {
    name: 'Google',
    chatModel: 'gemini-1.5-flash',
    embeddingModel: 'text-embedding-004',
    supportsStreaming: true,
    supportsFunctionCalling: true,
  },
  mistral: {
    name: 'Mistral',
    chatModel: 'mistral-small-latest',
    embeddingModel: 'mistral-embed',
    supportsStreaming: true,
    supportsFunctionCalling: false,
  },
  cohere: {
    name: 'Cohere',
    chatModel: 'command-r',
    embeddingModel: 'embed-english-v3.0',
    supportsStreaming: true,
    supportsFunctionCalling: false,
  },
  deepseek: {
    name: 'DeepSeek',
    chatModel: 'deepseek-chat',
    supportsStreaming: true,
    supportsFunctionCalling: false,
  },
  groq: {
    name: 'Groq',
    chatModel: 'llama-3.1-8b-instant',
    supportsStreaming: true,
    supportsFunctionCalling: false,
  },
};

// ==================== RESULT COLLECTOR ====================

class ResultCollector {
  private results: TestResult[] = [];

  add(result: TestResult): void {
    this.results.push(result);
  }

  toJSON(): object {
    return {
      total: this.results.length,
      passed: this.results.filter((r) => r.passed).length,
      failed: this.results.filter((r) => !r.passed).length,
      results: this.results,
    };
  }

  save(filePath: string): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(this.toJSON(), null, 2));
  }
}

// ==================== TEST SETUP ====================

let client: SwfteClient;
let resultCollector: ResultCollector;
let testResultsDir: string;
let audioTestFile: string | null = null;

const deploymentIds = {
  qwen: process.env.QWEN_DEPLOYMENT_ID,
  llama: process.env.LLAMA_DEPLOYMENT_ID,
  tts: process.env.TTS_DEPLOYMENT_ID,
  stt: process.env.STT_DEPLOYMENT_ID,
  sdxl: process.env.SDXL_DEPLOYMENT_ID,
  flux: process.env.FLUX_DEPLOYMENT_ID,
};

beforeAll(async () => {
  const apiKey = process.env.SWFTE_API_KEY;
  if (!apiKey) {
    throw new Error('SWFTE_API_KEY environment variable not set');
  }

  client = new SwfteClient({
    apiKey,
    baseUrl: process.env.SWFTE_BASE_URL || 'http://localhost:3388/v2/gateway',
    workspaceId: process.env.SWFTE_WORKSPACE_ID || 'test-workspace',
    timeout: 120000,
    maxRetries: 2,
  });

  resultCollector = new ResultCollector();
  testResultsDir = path.join(__dirname, '../../../../scripts/comprehensive-model-tests/test-results/javascript');
  fs.mkdirSync(testResultsDir, { recursive: true });
});

afterAll(() => {
  resultCollector.save(path.join(testResultsDir, 'results.json'));
});

// Helper to generate audio for STT tests
async function ensureAudioTestFile(): Promise<string> {
  if (audioTestFile && fs.existsSync(audioTestFile)) {
    return audioTestFile;
  }

  const audioPath = path.join(testResultsDir, 'test_audio.mp3');

  try {
    const audioData = await client.audio.speech.create({
      model: 'tts-1',
      input: 'Hello, this is a test of speech synthesis for the comprehensive gateway tests.',
      voice: 'alloy',
    });

    fs.writeFileSync(audioPath, Buffer.from(audioData));
    audioTestFile = audioPath;
    return audioPath;
  } catch (error) {
    throw new Error(`Could not generate audio for STT tests: ${error}`);
  }
}

// ==================== PROPRIETARY PROVIDER TESTS ====================

describe('Proprietary Providers', () => {
  describe.each(Object.entries(PROPRIETARY_PROVIDERS))(
    '%s',
    (providerKey, config) => {
      it('should complete chat request', async () => {
        if (config.skipReason) {
          console.log(`Skipping ${config.name}: ${config.skipReason}`);
          return;
        }

        const startTime = Date.now();
        let error: string | undefined;
        let passed = false;
        let metadata: Record<string, unknown> | undefined;

        try {
          const response = await client.chat.completions.create({
            model: config.chatModel,
            messages: [
              {
                role: 'user',
                content: `Say 'Hello from ${config.name}' in exactly 4 words.`,
              },
            ],
            max_tokens: 30,
            temperature: 0,
          });

          const content = response.choices[0]?.message?.content;
          expect(content).toBeTruthy();
          expect(content!.length).toBeGreaterThan(0);

          passed = true;
          metadata = {
            model: config.chatModel,
            contentLength: content!.length,
            usage: response.usage,
          };
        } catch (e) {
          error = String(e);
        }

        const latencyMs = Date.now() - startTime;

        resultCollector.add({
          provider: providerKey,
          testName: 'chat_completion',
          passed,
          latencyMs,
          error,
          metadata,
        });

        if (!passed) {
          throw new Error(`${config.name} chat completion failed: ${error}`);
        }
      });

      if (config.supportsStreaming) {
        it('should stream chat response', async () => {
          if (config.skipReason) {
            return;
          }

          const startTime = Date.now();
          let error: string | undefined;
          let passed = false;
          let metadata: Record<string, unknown> | undefined;

          try {
            const chunks: unknown[] = [];
            let fullContent = '';

            const stream = await client.chat.completions.create({
              model: config.chatModel,
              messages: [
                { role: 'user', content: 'Count from 1 to 5, one number per line.' },
              ],
              max_tokens: 50,
              stream: true,
            });

            for await (const chunk of stream) {
              chunks.push(chunk);
              const delta = chunk.choices?.[0]?.delta?.content;
              if (delta) {
                fullContent += delta;
              }
            }

            expect(chunks.length).toBeGreaterThan(1);
            expect(fullContent.length).toBeGreaterThan(0);

            passed = true;
            metadata = {
              model: config.chatModel,
              chunkCount: chunks.length,
              contentLength: fullContent.length,
            };
          } catch (e) {
            error = String(e);
          }

          const latencyMs = Date.now() - startTime;

          resultCollector.add({
            provider: providerKey,
            testName: 'streaming_chat',
            passed,
            latencyMs,
            error,
            metadata,
          });

          if (!passed) {
            throw new Error(`${config.name} streaming failed: ${error}`);
          }
        });
      }

      if (config.embeddingModel) {
        it('should generate embeddings', async () => {
          if (config.skipReason) {
            return;
          }

          const startTime = Date.now();
          let error: string | undefined;
          let passed = false;
          let metadata: Record<string, unknown> | undefined;

          try {
            const response = await client.embeddings.create({
              model: config.embeddingModel!,
              input: 'Hello, world! This is a test of embedding generation.',
            });

            const embedding = response.data[0]?.embedding;
            expect(Array.isArray(embedding)).toBe(true);
            expect(embedding.length).toBeGreaterThan(0);
            expect(typeof embedding[0]).toBe('number');

            passed = true;
            metadata = {
              model: config.embeddingModel,
              dimensions: embedding.length,
            };
          } catch (e) {
            error = String(e);
          }

          const latencyMs = Date.now() - startTime;

          resultCollector.add({
            provider: providerKey,
            testName: 'embeddings',
            passed,
            latencyMs,
            error,
            metadata,
          });

          if (!passed) {
            throw new Error(`${config.name} embeddings failed: ${error}`);
          }
        });
      }
    }
  );
});

// ==================== OPENAI SPECIFIC TESTS ====================

describe('OpenAI Specific', () => {
  it('should generate image with DALL-E 3', async () => {
    const startTime = Date.now();
    let error: string | undefined;
    let passed = false;
    let metadata: Record<string, unknown> | undefined;

    try {
      const response = await client.images.generate({
        model: 'dall-e-3',
        prompt: 'A simple blue square on a white background, minimalist style',
        size: '1024x1024',
        n: 1,
      });

      expect(response.data).toBeTruthy();
      expect(response.data.length).toBeGreaterThan(0);

      const imageData = response.data[0];
      expect(imageData.url || imageData.b64_json).toBeTruthy();

      passed = true;
      metadata = {
        model: 'dall-e-3',
        hasUrl: Boolean(imageData.url),
        hasB64: Boolean(imageData.b64_json),
      };
    } catch (e) {
      error = String(e);
    }

    const latencyMs = Date.now() - startTime;

    resultCollector.add({
      provider: 'openai',
      testName: 'image_generation_dalle3',
      passed,
      latencyMs,
      error,
      metadata,
    });

    if (!passed) {
      throw new Error(`DALL-E 3 image generation failed: ${error}`);
    }
  });

  it('should generate speech with TTS', async () => {
    const startTime = Date.now();
    let error: string | undefined;
    let passed = false;
    let metadata: Record<string, unknown> | undefined;

    try {
      const audioData = await client.audio.speech.create({
        model: 'tts-1',
        input: 'Hello, this is a test of OpenAI text to speech synthesis.',
        voice: 'alloy',
      });

      expect(audioData).toBeTruthy();
      expect(audioData.byteLength || audioData.length).toBeGreaterThan(0);

      // Save for later use
      const audioPath = path.join(testResultsDir, 'openai_tts_test.mp3');
      fs.writeFileSync(audioPath, Buffer.from(audioData));

      passed = true;
      metadata = {
        model: 'tts-1',
        voice: 'alloy',
        audioSizeBytes: audioData.byteLength || audioData.length,
      };
    } catch (e) {
      error = String(e);
    }

    const latencyMs = Date.now() - startTime;

    resultCollector.add({
      provider: 'openai',
      testName: 'text_to_speech',
      passed,
      latencyMs,
      error,
      metadata,
    });

    if (!passed) {
      throw new Error(`OpenAI TTS failed: ${error}`);
    }
  });

  it('should transcribe speech with Whisper', async () => {
    const startTime = Date.now();
    let error: string | undefined;
    let passed = false;
    let metadata: Record<string, unknown> | undefined;

    try {
      const audioPath = await ensureAudioTestFile();
      const audioData = fs.readFileSync(audioPath);

      const response = await client.audio.transcriptions.create({
        model: 'whisper-1',
        file: audioData,
      });

      expect(response.text).toBeTruthy();
      expect(response.text.length).toBeGreaterThan(0);

      passed = true;
      metadata = {
        model: 'whisper-1',
        transcriptLength: response.text.length,
        transcriptPreview: response.text.substring(0, 100),
      };
    } catch (e) {
      error = String(e);
    }

    const latencyMs = Date.now() - startTime;

    resultCollector.add({
      provider: 'openai',
      testName: 'speech_to_text',
      passed,
      latencyMs,
      error,
      metadata,
    });

    if (!passed) {
      throw new Error(`OpenAI STT failed: ${error}`);
    }
  });

  it('should handle function calling', async () => {
    const startTime = Date.now();
    let error: string | undefined;
    let passed = false;
    let metadata: Record<string, unknown> | undefined;

    try {
      const tools = [
        {
          type: 'function' as const,
          function: {
            name: 'get_weather',
            description: 'Get the current weather in a given location',
            parameters: {
              type: 'object',
              properties: {
                location: {
                  type: 'string',
                  description: 'The city and state, e.g. San Francisco, CA',
                },
                unit: {
                  type: 'string',
                  enum: ['celsius', 'fahrenheit'],
                  description: 'Temperature unit',
                },
              },
              required: ['location'],
            },
          },
        },
      ];

      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: "What's the weather like in San Francisco?" },
        ],
        tools,
        tool_choice: 'auto',
        max_tokens: 100,
      });

      const message = response.choices[0]?.message;
      expect(message?.tool_calls || message?.content).toBeTruthy();

      passed = true;
      metadata = {
        model: 'gpt-4o-mini',
        hasToolCalls: Boolean(message?.tool_calls),
        toolCount: message?.tool_calls?.length || 0,
      };
    } catch (e) {
      error = String(e);
    }

    const latencyMs = Date.now() - startTime;

    resultCollector.add({
      provider: 'openai',
      testName: 'function_calling',
      passed,
      latencyMs,
      error,
      metadata,
    });

    if (!passed) {
      throw new Error(`OpenAI function calling failed: ${error}`);
    }
  });
});

// ==================== SELF-HOSTED TESTS ====================

describe('Self-Hosted Deployments', () => {
  describe('RunPod Qwen', () => {
    it('should complete chat request', async () => {
      if (!deploymentIds.qwen) {
        console.log('Skipping: QWEN_DEPLOYMENT_ID not set');
        return;
      }

      const startTime = Date.now();
      let error: string | undefined;
      let passed = false;
      let metadata: Record<string, unknown> | undefined;

      try {
        const response = await client.chat.completions.create({
          model: `deployed:${deploymentIds.qwen}`,
          messages: [
            { role: 'user', content: 'Explain machine learning in 2 sentences.' },
          ],
          max_tokens: 100,
          temperature: 0.7,
        });

        const content = response.choices[0]?.message?.content;
        expect(content).toBeTruthy();

        passed = true;
        metadata = {
          deploymentId: deploymentIds.qwen,
          contentLength: content!.length,
        };
      } catch (e) {
        error = String(e);
      }

      const latencyMs = Date.now() - startTime;

      resultCollector.add({
        provider: 'runpod_qwen',
        testName: 'chat_completion',
        passed,
        latencyMs,
        error,
        metadata,
      });

      if (!passed) {
        throw new Error(`RunPod Qwen chat failed: ${error}`);
      }
    });

    it('should stream chat response', async () => {
      if (!deploymentIds.qwen) {
        return;
      }

      const startTime = Date.now();
      let error: string | undefined;
      let passed = false;
      let metadata: Record<string, unknown> | undefined;

      try {
        const chunks: unknown[] = [];
        let fullContent = '';

        const stream = await client.chat.completions.create({
          model: `deployed:${deploymentIds.qwen}`,
          messages: [{ role: 'user', content: 'Count from 1 to 5.' }],
          max_tokens: 50,
          stream: true,
        });

        for await (const chunk of stream) {
          chunks.push(chunk);
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
          }
        }

        expect(chunks.length).toBeGreaterThan(1);
        expect(fullContent.length).toBeGreaterThan(0);

        passed = true;
        metadata = {
          deploymentId: deploymentIds.qwen,
          chunkCount: chunks.length,
        };
      } catch (e) {
        error = String(e);
      }

      const latencyMs = Date.now() - startTime;

      resultCollector.add({
        provider: 'runpod_qwen',
        testName: 'streaming',
        passed,
        latencyMs,
        error,
        metadata,
      });

      if (!passed) {
        throw new Error(`RunPod Qwen streaming failed: ${error}`);
      }
    });
  });

  describe('RunPod Llama', () => {
    it('should complete chat request', async () => {
      if (!deploymentIds.llama) {
        console.log('Skipping: LLAMA_DEPLOYMENT_ID not set');
        return;
      }

      const startTime = Date.now();
      let error: string | undefined;
      let passed = false;
      let metadata: Record<string, unknown> | undefined;

      try {
        const response = await client.chat.completions.create({
          model: `deployed:${deploymentIds.llama}`,
          messages: [
            { role: 'user', content: 'What is Python? Answer in one sentence.' },
          ],
          max_tokens: 80,
          temperature: 0.5,
        });

        const content = response.choices[0]?.message?.content;
        expect(content).toBeTruthy();

        passed = true;
        metadata = {
          deploymentId: deploymentIds.llama,
          contentLength: content!.length,
        };
      } catch (e) {
        error = String(e);
      }

      const latencyMs = Date.now() - startTime;

      resultCollector.add({
        provider: 'runpod_llama',
        testName: 'chat_completion',
        passed,
        latencyMs,
        error,
        metadata,
      });

      if (!passed) {
        throw new Error(`RunPod Llama chat failed: ${error}`);
      }
    });
  });

  describe('RunPod Image Generation', () => {
    it('should generate image with SDXL', async () => {
      if (!deploymentIds.sdxl) {
        console.log('Skipping: SDXL_DEPLOYMENT_ID not set');
        return;
      }

      const startTime = Date.now();
      let error: string | undefined;
      let passed = false;
      let metadata: Record<string, unknown> | undefined;

      try {
        const response = await client.images.generate({
          model: 'comfy:sdxl',
          prompt: 'A futuristic city at sunset, cyberpunk style, highly detailed',
          size: '1024x1024',
          n: 1,
        });

        expect(response.data).toBeTruthy();
        expect(response.data.length).toBeGreaterThan(0);

        const imageData = response.data[0];
        expect(imageData.url || imageData.b64_json).toBeTruthy();

        passed = true;
        metadata = {
          model: 'comfy:sdxl',
          hasUrl: Boolean(imageData.url),
        };
      } catch (e) {
        error = String(e);
      }

      const latencyMs = Date.now() - startTime;

      resultCollector.add({
        provider: 'runpod_sdxl',
        testName: 'image_generation',
        passed,
        latencyMs,
        error,
        metadata,
      });

      if (!passed) {
        throw new Error(`RunPod SDXL image generation failed: ${error}`);
      }
    });
  });

  describe('RunPod TTS', () => {
    it('should generate speech', async () => {
      if (!deploymentIds.tts) {
        console.log('Skipping: TTS_DEPLOYMENT_ID not set');
        return;
      }

      const startTime = Date.now();
      let error: string | undefined;
      let passed = false;
      let metadata: Record<string, unknown> | undefined;

      try {
        const audioData = await client.audio.speech.create({
          model: `deployed:${deploymentIds.tts}`,
          input: 'Hello from self-hosted text to speech on RunPod.',
          voice: 'default',
        });

        expect(audioData).toBeTruthy();
        expect(audioData.byteLength || audioData.length).toBeGreaterThan(0);

        // Save for STT test
        const audioPath = path.join(testResultsDir, 'runpod_tts_test.mp3');
        fs.writeFileSync(audioPath, Buffer.from(audioData));

        passed = true;
        metadata = {
          deploymentId: deploymentIds.tts,
          audioSizeBytes: audioData.byteLength || audioData.length,
        };
      } catch (e) {
        error = String(e);
      }

      const latencyMs = Date.now() - startTime;

      resultCollector.add({
        provider: 'runpod_tts',
        testName: 'text_to_speech',
        passed,
        latencyMs,
        error,
        metadata,
      });

      if (!passed) {
        throw new Error(`RunPod TTS failed: ${error}`);
      }
    });
  });

  describe('RunPod STT', () => {
    it('should transcribe speech', async () => {
      if (!deploymentIds.stt) {
        console.log('Skipping: STT_DEPLOYMENT_ID not set');
        return;
      }

      const startTime = Date.now();
      let error: string | undefined;
      let passed = false;
      let metadata: Record<string, unknown> | undefined;

      try {
        // Prefer RunPod TTS audio if available
        let audioPath = path.join(testResultsDir, 'runpod_tts_test.mp3');
        if (!fs.existsSync(audioPath)) {
          audioPath = await ensureAudioTestFile();
        }

        const audioData = fs.readFileSync(audioPath);

        const response = await client.audio.transcriptions.create({
          model: `deployed:${deploymentIds.stt}`,
          file: audioData,
        });

        expect(response.text).toBeTruthy();
        expect(response.text.length).toBeGreaterThan(0);

        passed = true;
        metadata = {
          deploymentId: deploymentIds.stt,
          transcriptLength: response.text.length,
        };
      } catch (e) {
        error = String(e);
      }

      const latencyMs = Date.now() - startTime;

      resultCollector.add({
        provider: 'runpod_stt',
        testName: 'speech_to_text',
        passed,
        latencyMs,
        error,
        metadata,
      });

      if (!passed) {
        throw new Error(`RunPod STT failed: ${error}`);
      }
    });
  });
});

// ==================== ERROR HANDLING TESTS ====================

describe('Error Handling', () => {
  it('should handle invalid model', async () => {
    const startTime = Date.now();
    let passed = false;
    let metadata: Record<string, unknown> | undefined;

    try {
      await client.chat.completions.create({
        model: 'invalid-model-xyz-12345',
        messages: [{ role: 'user', content: 'Hello' }],
      });
    } catch (e) {
      passed = true;
      metadata = { exceptionType: e?.constructor?.name || 'Error' };
    }

    const latencyMs = Date.now() - startTime;

    resultCollector.add({
      provider: 'error_handling',
      testName: 'invalid_model',
      passed,
      latencyMs,
      error: passed ? undefined : 'Expected exception not raised',
      metadata,
    });

    expect(passed).toBe(true);
  });

  it('should handle empty messages', async () => {
    const startTime = Date.now();
    let passed = false;
    let metadata: Record<string, unknown> | undefined;

    try {
      await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [],
      });
    } catch (e) {
      passed = true;
      metadata = { exceptionType: e?.constructor?.name || 'Error' };
    }

    const latencyMs = Date.now() - startTime;

    resultCollector.add({
      provider: 'error_handling',
      testName: 'empty_messages',
      passed,
      latencyMs,
      error: passed ? undefined : 'Expected exception not raised',
      metadata,
    });

    expect(passed).toBe(true);
  });
});

// ==================== DEPLOYMENT MANAGEMENT TESTS ====================

describe('Deployment Management', () => {
  it('should list models', async () => {
    const startTime = Date.now();
    let error: string | undefined;
    let passed = false;
    let metadata: Record<string, unknown> | undefined;

    try {
      const models = await client.models.list();

      expect(models).toBeTruthy();
      expect(Array.isArray(models)).toBe(true);

      passed = true;
      metadata = {
        modelCount: models.length,
      };
    } catch (e) {
      error = String(e);
    }

    const latencyMs = Date.now() - startTime;

    resultCollector.add({
      provider: 'gateway',
      testName: 'list_models',
      passed,
      latencyMs,
      error,
      metadata,
    });

    if (!passed) {
      throw new Error(`List models failed: ${error}`);
    }
  });

  it('should list deployments', async () => {
    const startTime = Date.now();
    let error: string | undefined;
    let passed = false;
    let metadata: Record<string, unknown> | undefined;

    try {
      const deployments = await client.deployments.list();

      expect(deployments).toBeTruthy();

      passed = true;
      metadata = {
        deploymentCount: Array.isArray(deployments) ? deployments.length : 'unknown',
      };
    } catch (e) {
      error = String(e);
    }

    const latencyMs = Date.now() - startTime;

    resultCollector.add({
      provider: 'gateway',
      testName: 'list_deployments',
      passed,
      latencyMs,
      error,
      metadata,
    });

    if (!passed) {
      throw new Error(`List deployments failed: ${error}`);
    }
  });
});

// ==================== PERFORMANCE TESTS ====================

describe('Performance', () => {
  const providers = [
    { key: 'openai', config: PROPRIETARY_PROVIDERS.openai },
    { key: 'anthropic', config: PROPRIETARY_PROVIDERS.anthropic },
  ];

  describe.each(providers)('$config.name Latency', ({ key, config }) => {
    it('should measure baseline latency', async () => {
      const latencies: number[] = [];

      for (let i = 0; i < 3; i++) {
        const startTime = Date.now();

        try {
          await client.chat.completions.create({
            model: config.chatModel,
            messages: [{ role: 'user', content: "Say 'OK'." }],
            max_tokens: 5,
            temperature: 0,
          });

          latencies.push(Date.now() - startTime);
        } catch {
          // Skip failed requests
        }
      }

      if (latencies.length > 0) {
        const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

        resultCollector.add({
          provider: key,
          testName: 'latency_baseline',
          passed: true,
          latencyMs: avgLatency,
          metadata: {
            samples: latencies.length,
            minMs: Math.min(...latencies),
            maxMs: Math.max(...latencies),
            avgMs: avgLatency,
          },
        });
      } else {
        resultCollector.add({
          provider: key,
          testName: 'latency_baseline',
          passed: false,
          latencyMs: 0,
          error: 'All requests failed',
        });

        throw new Error('All latency test requests failed');
      }
    });
  });
});
