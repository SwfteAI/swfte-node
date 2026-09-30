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

> **Server-side only.** `sk-swfte-...` keys and `pat_...` tokens are secrets. Use this SDK
> from Node.js, a server or a worker you control, never from browser code. See
> [Security](#security).

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

// Chat with an agent: POST /v1/agents/{id}/chat/{userId}, reply text in `response`
const reply = await client.agents.chat(agent.id, 'What changed in Q3?', { userId: 'user-42' });
console.log(reply.response);

// Continue the same conversation
const followUp = await client.agents.chat(agent.id, 'And Q4?', {
  userId: 'user-42',
  conversationId: reply.conversationId ?? undefined,
});

// Delete an agent
await client.agents.delete(agent.id);
```

### Workflows

```typescript
import { WorkflowExecutionError, WorkflowTimeoutError } from '@swfte/sdk';

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

// Production: run the PUBLISHED version (POST /v2/workflows/{id}/invoke, 202 + executionId)
const { executionId } = await client.workflows.invoke(workflow.id, { input: 'Hello' });
const status = await client.workflows.getExecutionStatus(executionId);
console.log(status.status, status.progress);

// ...or invoke and poll until the run finishes
try {
  const done = await client.workflows.invokeAndWait(
    workflow.id,
    { input: 'Hello' },
    { timeoutMs: 120_000, pollIntervalMs: 2_000 }
  );
  console.log(done.status, done.outputs); // SUCCESS / SUCCEEDED / COMPLETED
} catch (err) {
  if (err instanceof WorkflowExecutionError) console.error('run ended', err.status, err.message);
  else if (err instanceof WorkflowTimeoutError) console.error('still running', err.executionId);
  else throw err;
}

// Test run of the current (unpublished) definition — Studio's draft path
const execution = await client.workflows.execute(workflow.id, { input: 'Hello', testingFlag: true });
```

`invoke()` runs the published snapshot and is what production callers should use;
edits you have not published do not affect it, and a never-published workflow
answers 409. `execute()` runs the editable definition (the draft) and exists for
test runs. Neither call is retried by the SDK, so a network blip never starts a
run twice.

### Catalog

```typescript
// Find proven artifacts across kinds
const { items, nextCursor, degraded } = await client.catalog.search({
  q: 'invoice triage',
  kinds: ['workflow', 'agent'],
  scope: 'all',
  minEvidence: 'corroborated',
  limit: 10,
});

// Evidence, reviews and dependencies for one entry
const detail = await client.catalog.get('workflow', items[0].id);
console.log(detail.evidence.level, detail.evidence.reasons);

// How to call it: method, path, input/output JSON Schema and code snippets
const contract = await client.catalog.contract('workflow', items[0].id);
console.log(contract.invoke.method, contract.invoke.path);
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
  timeout: 60000,                                       // Per-attempt deadline in ms (includes reading the body)
  maxRetries: 3,                                        // Max attempts; only idempotent calls are retried
  workspaceId: 'ws-...',                                // Workspace scoping. Also reads SWFTE_WORKSPACE_ID.
  // apiBaseUrl: 'https://api.swfte.com/agents',        // Optional; derived from baseUrl by default
});
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | `SWFTE_API_KEY` env | Your Swfte API key (`sk-swfte-...`) or personal access token (`pat_...`) |
| `baseUrl` | `string` | `https://api.swfte.com/agents/v2/gateway` | Gateway URL (chat completions, images, embeddings, audio, models) |
| `apiBaseUrl` | `string` | `SWFTE_API_BASE_URL` env, else `baseUrl` minus `/v1/gateway` or `/v2/gateway` | agents-service root used by agents, workflows, catalog and the other management resources |
| `timeout` | `number` | `60000` | Per-attempt deadline (ms), enforced for every call including reading the body. Exceeding it throws `RequestTimeoutError` |
| `maxRetries` | `number` | `3` | Max attempts (first try included). Only idempotent calls are retried, see [Security](#retries-timeouts-and-redirects) |
| `workspaceId` | `string` | `SWFTE_WORKSPACE_ID` env | Workspace ID |
| `fetch` | `typeof fetch` | global `fetch` | Custom fetch (proxy, tracing, tests). Used for every call, without exception |
| `dangerouslyAllowBrowser` | `boolean` | `false` | The constructor throws in a browser-like context unless this is `true`. Setting it ships your secret key to every visitor |

`baseUrl` and `apiBaseUrl` must be `https://`. Plain `http://` is accepted only for
`localhost`, `127.0.0.1` and `::1`.

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
| `AuthenticationError` | Invalid or missing API key (HTTP 401 or 403), from every call. Never retried |
| `RateLimitError` | HTTP 429, from every call. Carries `retryAfter` (seconds) when the server sent `Retry-After` |
| `RequestTimeoutError` | The call did not finish within `timeout` |
| `InvalidRequestError` | The client refused to send: `baseUrl` is not https, or a request path could re-point the host |
| `APIError` | Any other non-2xx, or a refused redirect; carries `status` and the parsed `body` |
| `WorkflowExecutionError` | `invokeAndWait` / `waitForCompletion`: the run ended FAILED, TIMEOUT or CANCELLED/CANCELED; carries `executionId`, `status`, `execution` |
| `WorkflowTimeoutError` | `invokeAndWait` / `waitForCompletion`: gave up polling; the run is not cancelled (`executionId` still pollable) |

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
- Server-side JavaScript (Node.js, or a worker/edge runtime you control), ESM and CJS. **Not for browsers**: this SDK carries a secret key. For browser telemetry use `@swfte/analytics` with a publishable `swfte_pk_...` key.

## Contributing

We welcome contributions. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines and our [Code of Conduct](CODE_OF_CONDUCT.md).

All contributors must sign the [Swfte CLA](https://cla.swfte.com) before their first pull request can be merged.

## Security

### Server-side only

`@swfte/sdk` authenticates with a **secret** key (`sk-swfte-...`) or personal access token
(`pat_...`) that can spend money and read your workspace. Anything bundled into a web page
is public, so this SDK must never run in a browser. The constructor enforces it: with a
global `window` or `document` it throws unless you pass `dangerouslyAllowBrowser: true`,
which you should not do. For browsers use [`@swfte/analytics`](https://www.npmjs.com/package/@swfte/analytics) with a
publishable `swfte_pk_...` key, or call your own backend, which holds the secret.

### Key handling

- Load the key from the environment (`SWFTE_API_KEY`) or a secrets manager, not from source.
- The client keeps the key in a private field. `console.log(client)`, `util.inspect(client)`,
  `JSON.stringify(client)` and error reports show only a redacted `...abcd` tail, never the key.
- The key is sent only in the `Authorization` header, never in a URL.
- Rotate a key that has been logged or committed; redaction protects the client object,
  not strings you build yourself.

### Retries, timeouts and redirects

- **Retries.** Only idempotent calls are retried: `GET`/`HEAD`/`OPTIONS`, or a call that
  carries an idempotency key. They are retried only on network errors, timeouts, `429`
  (honouring `Retry-After`) and `5xx`. A `POST` that may already have run, such as a chat
  completion, is never repeated silently. `400`-class errors and `401`/`403` are never retried.
- **Timeouts.** `timeout` bounds every attempt, including reading the response body, even
  if a custom `fetch` ignores the abort signal.
- **Redirects.** Redirects are never followed. The API does not redirect, and following
  one would replay your bearer key and workspace header to another host. A `3xx`
  throws an `APIError` naming the redirect.
- **Custom `fetch`.** Every request, without exception, goes through the `fetch` you
  configure, so a proxy or hardened client applies to the whole SDK.

### Transport

`baseUrl` and `apiBaseUrl` must use `https://`; `http://` is accepted only for
`localhost`, `127.0.0.1` and `::1` so local development works. Path segments built from ids
are percent-encoded, so an id such as `../admin` cannot address a different endpoint.

### Reporting a vulnerability

Please see [SECURITY.md](SECURITY.md). Do not open a public issue for security concerns.

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
