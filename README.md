# Swfte Node.js SDK

[![npm version](https://img.shields.io/npm/v/@swfte/sdk.svg)](https://www.npmjs.com/package/@swfte/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node 18+](https://img.shields.io/badge/node-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-first-blue.svg)](https://www.typescriptlang.org/)

The official Node.js/TypeScript client library for the [Swfte API](https://docs.swfte.com) -- a unified gateway to 200+ AI models from OpenAI, Anthropic, Google, and self-hosted infrastructure through a single interface.

## Documentation

Full API reference and guides are available at [docs.swfte.com](https://docs.swfte.com).

## Installation

```bash
npm install @swfte/sdk
```

```bash
yarn add @swfte/sdk
```

```bash
pnpm add @swfte/sdk
```

## Quick Start

```typescript
import Swfte from '@swfte/sdk';

const client = new Swfte({ apiKey: 'sk-swfte-...' });

const response = await client.chat.completions.create({
  model: 'openai:gpt-4',
  messages: [{ role: 'user', content: 'Hello, world!' }],
});

console.log(response.choices[0].message.content);
```

## Usage

### Chat Completions

```typescript
const response = await client.chat.completions.create({
  model: 'anthropic:claude-3-opus',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Explain quantum computing in one sentence.' },
  ],
  temperature: 0.7,
  max_tokens: 256,
});
```

### Streaming

```typescript
const stream = await client.chat.completions.createStream({
  model: 'openai:gpt-4',
  messages: [{ role: 'user', content: 'Write a short poem.' }],
  stream: true,
});

for await (const chunk of stream) {
  const content = chunk.choices?.[0]?.delta?.content ?? '';
  process.stdout.write(content);
}
```

### Agents

```typescript
// Create an agent
const agent = await client.agents.create({
  name: 'Research Assistant',
  systemPrompt: 'You are a research assistant specializing in AI.',
  provider: 'OPENAI',
  model: 'gpt-4',
});

// List agents
const agents = await client.agents.list();

// Update an agent (V2 PATCH)
await client.agents.patch(agent.id, { description: 'Updated description' });

// Delete an agent
await client.agents.delete(agent.id);
```

### Workflows

```typescript
// Create a workflow
const workflow = await client.workflows.create({
  name: 'Content Pipeline',
  nodes: [
    { id: 'start', type: 'TRIGGER', config: { triggerType: 'MANUAL' } },
    { id: 'llm', type: 'LLM', config: { model: 'gpt-4', prompt: 'Summarize: {{input}}' } },
    { id: 'end', type: 'END', config: {} },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'llm' },
    { id: 'e2', source: 'llm', target: 'end' },
  ],
});

// Execute a workflow
const execution = await client.workflows.execute(workflow.id, { input: 'Hello' });

// Check execution status
const status = await client.workflows.getExecutionStatus(execution.executionId);
```

### GPU Model Deployments

```typescript
// Deploy a model to GPU infrastructure
const deployment = await client.deployments.create({
  modelName: 'meta-llama/Llama-3.2-8B-Instruct',
  modelType: 'chat',
});

// Wait for deployment to be ready
const ready = await client.deployments.waitForReady(deployment.id);
console.log(`Endpoint: ${ready.endpointUrl}`);

// Clean up
await client.deployments.terminate(deployment.id);
```

### Images

```typescript
const response = await client.images.generate({
  model: 'openai:dall-e-3',
  prompt: 'A sunset over a mountain range, oil painting style',
  size: '1024x1024',
  quality: 'hd',
});
```

### Embeddings

```typescript
const response = await client.embeddings.create({
  model: 'openai:text-embedding-3-small',
  input: 'The quick brown fox jumps over the lazy dog',
});
```

### Audio

```typescript
import { readFileSync } from 'fs';

// Speech to text
const transcript = await client.audio.transcriptions.create({
  model: 'openai:whisper-1',
  file: readFileSync('recording.mp3'),
});

// Text to speech
const audioBuffer = await client.audio.speech.create({
  model: 'openai:tts-1',
  input: 'Hello, welcome to Swfte.',
  voice: 'alloy',
});
```

### Secrets

```typescript
// Store an API key securely
const secret = await client.secrets.create({
  name: 'my-api-key',
  tokenType: 'API_KEY',
  value: 'sk-...',
  environment: 'production',
});

// Validate a secret
const isValid = await client.secrets.validate(secret.id);
```

### Conversations

```typescript
// Create a conversation
const conversation = await client.conversations.create({ title: 'Support Chat' });

// Add messages
await client.conversations.addMessage(conversation.id, {
  role: 'user',
  content: 'Hello!',
});

// Retrieve message history
const messages = await client.conversations.getMessages(conversation.id);
```

## Configuration

```typescript
const client = new Swfte({
  apiKey: 'sk-swfte-...',                              // Required. Also reads SWFTE_API_KEY env var.
  baseUrl: 'https://api.swfte.com/v2/gateway',         // Default
  timeout: 60000,                                       // Request timeout in ms
  maxRetries: 3,                                        // Retry count for failed requests
  workspaceId: 'ws-...',                                // Workspace scoping. Also reads SWFTE_WORKSPACE_ID.
});
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | `SWFTE_API_KEY` env | Your Swfte API key |
| `baseUrl` | `string` | `https://api.swfte.com/v2/gateway` | API base URL |
| `timeout` | `number` | `60000` | Request timeout (ms) |
| `maxRetries` | `number` | `3` | Max retry attempts |
| `workspaceId` | `string` | `SWFTE_WORKSPACE_ID` env | Workspace ID |

## Error Handling

```typescript
import Swfte, { SwfteError, AuthenticationError } from '@swfte/sdk';

const client = new Swfte({ apiKey: 'sk-swfte-...' });

try {
  const response = await client.chat.completions.create({
    model: 'openai:gpt-4',
    messages: [{ role: 'user', content: 'Hello' }],
  });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid API key');
  } else if (error instanceof SwfteError) {
    console.error(`API error: ${error.message}`);
  }
}
```

| Exception | Description |
|---|---|
| `SwfteError` | Base class for all SDK errors |
| `AuthenticationError` | Invalid or missing API key (HTTP 401) |

## Supported Providers

| Provider | Models | Qualifier Prefix |
|---|---|---|
| OpenAI | GPT-4, GPT-4o, o1, DALL-E, Whisper, TTS | `openai:` |
| Anthropic | Claude 3.5, Claude 3 Opus/Sonnet/Haiku | `anthropic:` |
| Google | Gemini 2.0, Gemini 1.5 Pro/Flash | `google:` |
| Self-hosted | Any model via RunPod/vLLM deployment | `runpod:` |

## Requirements

- Node.js 18 or later
- TypeScript 5.0+ (optional, for type definitions)
- Works in both Node.js and modern browsers (ESM and CJS)

## Contributing

We welcome contributions. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines and our [Code of Conduct](CODE_OF_CONDUCT.md).

All contributors must sign the [Swfte CLA](https://cla.swfte.com) before their first pull request can be merged.

## Security

To report a vulnerability, please see [SECURITY.md](SECURITY.md). Do not open a public issue for security concerns.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

Copyright (c) 2025 Swfte, Inc.
