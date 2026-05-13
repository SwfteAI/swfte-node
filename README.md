# Swfte Node.js SDK

[![npm version](https://img.shields.io/npm/v/@swfte/sdk.svg)](https://www.npmjs.com/package/@swfte/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node 18+](https://img.shields.io/badge/node-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-first-blue.svg)](https://www.typescriptlang.org/)

The official Node.js/TypeScript client library for [Swfte](https://www.swfte.com) — a unified gateway to 200+ AI models from OpenAI, Anthropic, Google, and self-hosted infrastructure, plus production-grade agents, workflows, chatflows, RAG, voice, and MCP servers — all through a single interface.

## About Swfte

[**Swfte**](https://www.swfte.com) is the unified AI infrastructure platform — one API for **200+ models** from OpenAI, Anthropic, Google, Mistral, Meta and self-hosted GPU deployments, plus production-grade [agents](https://www.swfte.com/products/agents), [workflows](https://www.swfte.com/products/workflows), [chatflows](https://www.swfte.com/products/chatflows), [RAG](https://www.swfte.com/products/rag), [voice](https://www.swfte.com/products/voice), and [MCP servers](https://www.swfte.com/products/mcp).

Read the full company profile in [ABOUT.md](ABOUT.md), or visit [swfte.com](https://www.swfte.com) to get started for free.

| Resource | Link |
|---|---|
| Product home | [https://www.swfte.com](https://www.swfte.com) |
| Documentation | [swfte.com/resources](https://www.swfte.com/resources) |
| API reference | [swfte.com/developers](https://www.swfte.com/developers) |
| Pricing | [swfte.com/pricing](https://www.swfte.com/pricing) |
| Security | [swfte.com/security](https://www.swfte.com/security) |
| Status | [status.swfte.com](https://status.swfte.com) |
| GitHub org | [github.com/SwfteAI](https://github.com/SwfteAI) |

### Other official Swfte SDKs

- [swfte-python](https://github.com/SwfteAI/swfte-python) — Python SDK ([PyPI](https://pypi.org/project/swfte/))
- [swfte-node](https://github.com/SwfteAI/swfte-node) — Node.js / TypeScript SDK ([npm](https://www.npmjs.com/package/@swfte/sdk))
- [swfte-java](https://github.com/SwfteAI/swfte-java) — Java SDK ([Maven Central](https://search.maven.org/artifact/com.swfte/swfte-sdk))
- [swfte-chat-widget](https://github.com/SwfteAI/swfte-chat-widget) — embeddable chat widget ([npm](https://www.npmjs.com/package/@swfte/chat-widget))
- [swfte-chatflow-widget](https://github.com/SwfteAI/swfte-chatflow-widget) — embeddable conversational form widget ([npm](https://www.npmjs.com/package/@swfte/chatflow-widget))

## Documentation

Full API reference and guides are available at [swfte.com/developers](https://www.swfte.com/developers) and [swfte.com/resources](https://www.swfte.com/resources). Cookbook examples for every V2 controller are in [docs/cookbook/](docs/cookbook/).

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
  baseUrl: 'https://api.swfte.com/agents/v2/gateway',         // Default
  timeout: 60000,                                       // Request timeout in ms
  maxRetries: 3,                                        // Retry count for failed requests
  workspaceId: 'ws-...',                                // Workspace scoping. Also reads SWFTE_WORKSPACE_ID.
});
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | `SWFTE_API_KEY` env | Your Swfte API key |
| `baseUrl` | `string` | `https://api.swfte.com/agents/v2/gateway` | API base URL |
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

Copyright (c) 2024-2026 Swfte, Inc.

## Resources

- [Swfte product home](https://www.swfte.com) — sign up free, no credit card.
- [Documentation & guides](https://www.swfte.com/resources) — cookbooks, recipes, integration walkthroughs.
- [API reference](https://www.swfte.com/developers) — every endpoint, every model.
- [Pricing](https://www.swfte.com/pricing) — pay-as-you-go, transparent per-token + per-second compute.
- [Security & compliance](https://www.swfte.com/security) — data handling, encryption, SOC 2.
- [Status & uptime](https://status.swfte.com) — live platform health.

### Companion SDKs and widgets

- [swfte-java](https://github.com/SwfteAI/swfte-java) — official Java SDK
- [swfte-python](https://github.com/SwfteAI/swfte-python) — official Python SDK
- [swfte-chat-widget](https://github.com/SwfteAI/swfte-chat-widget) — drop-in chat widget for any website
- [swfte-chatflow-widget](https://github.com/SwfteAI/swfte-chatflow-widget) — embeddable conversational form widget
