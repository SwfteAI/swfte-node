/**
 * Vitest test setup for Swfte JavaScript SDK
 *
 * This file configures MSW (Mock Service Worker) for mocking HTTP requests
 * and provides global test utilities.
 */

import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock process.env for browser environments
if (typeof process === 'undefined') {
  (global as any).process = { env: {} };
}

// Helper to create mock responses
export function createMockResponse<T>(
  data: T,
  options: { status?: number; headers?: Record<string, string> } = {}
): Response {
  const { status = 200, headers = {} } = options;

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers({ 'Content-Type': 'application/json', ...headers }),
    json: async () => data,
    text: async () => JSON.stringify(data),
    body: null,
    bodyUsed: false,
    clone: () => createMockResponse(data, options),
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
  } as Response;
}

// Helper to create streaming mock response
export function createStreamingMockResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  let chunkIndex = 0;

  const stream = new ReadableStream({
    pull(controller) {
      if (chunkIndex < chunks.length) {
        controller.enqueue(encoder.encode(chunks[chunkIndex]));
        chunkIndex++;
      } else {
        controller.close();
      }
    },
  });

  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({ 'Content-Type': 'text/event-stream' }),
    body: stream,
    json: async () => { throw new Error('Cannot parse stream as JSON'); },
    text: async () => chunks.join(''),
    bodyUsed: false,
    clone: () => createStreamingMockResponse(chunks),
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
  } as Response;
}

// Mock data factories
export const mockData = {
  apiKey: 'sk-swfte-test-key-12345',
  workspaceId: 'ws-test-12345',
  baseUrl: 'https://api.test.swfte.com/v1/gateway',

  agent: {
    id: 'agent-123',
    name: 'Test Agent',
    agentName: 'Test Agent',
    description: 'A test agent for unit testing',
    systemPrompt: 'You are a helpful test assistant.',
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2048,
    active: true,
    verified: false,
    inputType: 'TEXT',
    outputType: 'TEXT',
    workspaceId: 'ws-test-12345',
    mode: 'agent-chat',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },

  agentList: {
    agents: [
      {
        id: 'agent-123',
        name: 'Test Agent',
        agentName: 'Test Agent',
        description: 'A test agent',
        provider: 'openai',
        model: 'gpt-4',
        active: true,
      },
      {
        id: 'agent-456',
        name: 'Second Agent',
        agentName: 'Second Agent',
        description: 'Another test agent',
        provider: 'anthropic',
        model: 'claude-3-opus',
        active: true,
      },
    ],
    total: 2,
    page: 0,
    size: 20,
  },

  chatCompletion: {
    id: 'chatcmpl-123',
    object: 'chat.completion',
    created: 1699000000,
    model: 'gpt-4',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: 'Hello! How can I help you today?',
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    },
  },

  deployment: {
    id: 'deploy-123',
    name: 'Test Deployment',
    workspaceId: 'ws-test-12345',
    modelId: 'model-123',
    state: 'RUNNING',
    gpuType: 'NVIDIA A100',
    gpuCount: 1,
    endpoint: 'https://api.runpod.ai/v2/deploy-123',
    createdAt: '2024-01-01T00:00:00Z',
  },

  workflow: {
    id: 'wf-123',
    name: 'Test Workflow',
    description: 'A test workflow',
    workspaceId: 'ws-test-12345',
    nodes: [
      { id: 'node-1', type: 'input', position: { x: 0, y: 0 }, data: {} },
      { id: 'node-2', type: 'agent', position: { x: 200, y: 0 }, data: { agentId: 'agent-123' } },
    ],
    edges: [
      { id: 'edge-1', source: 'node-1', target: 'node-2' },
    ],
    active: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
};

// Reset mock between tests
beforeAll(() => {
  mockFetch.mockReset();
});

afterEach(() => {
  mockFetch.mockReset();
});

afterAll(() => {
  vi.restoreAllMocks();
});

// Export mock fetch for test access
export { mockFetch };
