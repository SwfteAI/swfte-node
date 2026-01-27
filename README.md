# Swfte JavaScript/TypeScript SDK

[![npm Version](https://img.shields.io/npm/v/swfte-sdk.svg)](https://www.npmjs.com/package/swfte-sdk)
[![npm Downloads](https://img.shields.io/npm/dm/swfte-sdk.svg)](https://www.npmjs.com/package/swfte-sdk)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Build Status](https://img.shields.io/github/actions/workflow/status/swfte/agents-service/javascript-sdk.yml?branch=main)](https://github.com/swfte/agents-service/actions)
[![Coverage](https://img.shields.io/codecov/c/github/swfte/agents-service)](https://codecov.io/gh/swfte/agents-service)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/swfte-sdk)](https://bundlephobia.com/package/swfte-sdk)

The official TypeScript/JavaScript SDK for the Swfte AI Gateway - unified access to all AI providers through a single API.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Features](#features)
- [Supported Models](#supported-models)
- [Examples](#examples)
- [Configuration](#configuration)
- [Error Handling](#error-handling)
- [Browser Usage](#browser-usage)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

## Installation

```bash
npm install swfte-sdk
# or
yarn add swfte-sdk
# or
pnpm add swfte-sdk
```

## Quick Start

```typescript
import Swfte from 'swfte-sdk';

const client = new Swfte({ apiKey: 'sk-swfte-...' });

const response = await client.chat.completions.create({
  model: 'openai:gpt-4',  // or "anthropic:claude-3-opus", "deployed:my-model"
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello!' }
  ]
});

console.log(response.choices[0].message.content);
```

## Features

| Feature | Description |
|---------|-------------|
| **Unified API** | Access OpenAI, Anthropic, Google Gemini, and self-hosted models through one API |
| **OpenAI Compatible** | Drop-in replacement for the OpenAI SDK |
| **Streaming Support** | Real-time streaming responses with async iterators |
| **TypeScript First** | Full TypeScript support with comprehensive type definitions |
| **Tree-Shakeable** | Only import what you need for smaller bundles |
| **Browser & Node.js** | Works in both environments out of the box |
| **Automatic Retries** | Built-in retry logic with exponential backoff |

## Supported Models

### External Providers

| Provider | Models | Capabilities |
|----------|--------|--------------|
| **OpenAI** | `openai:gpt-4`, `openai:gpt-4-turbo`, `openai:gpt-3.5-turbo`, `openai:dall-e-3`, `openai:whisper-1`, `openai:tts-1` | Chat, Images, Audio, Embeddings |
| **Anthropic** | `anthropic:claude-3-opus`, `anthropic:claude-3-sonnet`, `anthropic:claude-3-haiku` | Chat |
| **Google** | `google:gemini-pro`, `google:gemini-pro-vision` | Chat, Vision |

### Self-Hosted (via RunPod)

| Model | Use Case |
|-------|----------|
| `deployed:llama-3-8b` | Text generation |
| `deployed:sdxl` | Image generation |
| `deployed:whisper-large` | Audio transcription |

## Examples

### Streaming

```typescript
const stream = await client.chat.completions.create({
  model: 'openai:gpt-4',
  messages: [{ role: 'user', content: 'Tell me a story' }],
  stream: true
});

for await (const chunk of stream) {
  if (chunk.choices[0]?.delta?.content) {
    process.stdout.write(chunk.choices[0].delta.content);
  }
}
```

### Image Generation

```typescript
const response = await client.images.generate({
  model: 'openai:dall-e-3',
  prompt: 'A sunset over mountains in watercolor style',
  size: '1024x1024'
});

console.log(response.data[0].url);
```

### Embeddings

```typescript
const response = await client.embeddings.create({
  model: 'openai:text-embedding-3-small',
  input: 'The quick brown fox jumps over the lazy dog'
});

console.log(`Embedding dimension: ${response.data[0].embedding.length}`);
```

### Audio Transcription

```typescript
import { readFile } from 'fs/promises';

const file = await readFile('audio.mp3');
const result = await client.audio.transcriptions.create({
  model: 'openai:whisper-1',
  file: new Blob([file])
});

console.log(result.text);
```

### Text-to-Speech

```typescript
import { writeFile } from 'fs/promises';

const audio = await client.audio.speech.create({
  model: 'openai:tts-1',
  input: 'Hello world!',
  voice: 'nova'
});

await writeFile('output.mp3', Buffer.from(audio));
```

### List Models

```typescript
const models = await client.models.list();
for (const model of models) {
  console.log(`${model.id} - ${model.owned_by}`);
}
```

## Configuration

```typescript
const client = new Swfte({
  apiKey: 'sk-swfte-...',                    // Required
  baseUrl: 'https://api.swfte.com/v1/gateway', // Optional: custom endpoint
  timeout: 60000,                             // Optional: request timeout in ms
  maxRetries: 3,                              // Optional: retry attempts
  workspaceId: 'ws-123'                       // Optional: workspace ID
});
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `SWFTE_API_KEY` | Default API key |
| `SWFTE_WORKSPACE_ID` | Default workspace ID |
| `SWFTE_BASE_URL` | Custom API base URL |

## Error Handling

```typescript
import Swfte, { AuthenticationError, RateLimitError, APIError } from 'swfte-sdk';

const client = new Swfte({ apiKey: 'sk-swfte-...' });

try {
  const response = await client.chat.completions.create({
    model: 'openai:gpt-4',
    messages: [{ role: 'user', content: 'Hello!' }]
  });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid API key');
  } else if (error instanceof RateLimitError) {
    console.error('Rate limit exceeded');
  } else if (error instanceof APIError) {
    console.error(`API error: ${error.message}`);
  }
}
```

## Browser Usage

The SDK works in both Node.js and browser environments:

```typescript
// Using native fetch in browser
const client = new Swfte({
  apiKey: 'sk-swfte-...',
  fetch: window.fetch.bind(window)
});
```

### CDN Usage

```html
<script src="https://unpkg.com/swfte-sdk@latest/dist/swfte.umd.js"></script>
<script>
  const client = new Swfte.default({ apiKey: 'sk-swfte-...' });
  // Use client...
</script>
```

## Documentation

- [API Reference](https://docs.swfte.com/javascript-sdk)
- [Migration Guide](https://docs.swfte.com/javascript-sdk/migration)
- [Examples](https://github.com/swfte/agents-service/tree/main/sdks/javascript/examples)
- [Changelog](CHANGELOG.md)

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

Built with love by the [Swfte](https://swfte.com) team.
