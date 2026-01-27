---
name: Bug Report
about: Report a bug to help us improve the Swfte JavaScript/TypeScript SDK
title: '[BUG] '
labels: bug
assignees: ''
---

## Description

A clear and concise description of what the bug is.

## Environment

- **SDK Version**: (e.g., 1.0.0)
- **Node.js Version**: (e.g., 20.10.0) or Browser (e.g., Chrome 120)
- **TypeScript Version**: (if applicable, e.g., 5.3.0)
- **Operating System**: (e.g., macOS 14.0, Ubuntu 22.04, Windows 11)
- **Package Manager**: (npm, yarn, pnpm)

## Steps to Reproduce

1. Initialize client with '...'
2. Call method '...'
3. See error

## Expected Behavior

A clear and concise description of what you expected to happen.

## Actual Behavior

A clear and concise description of what actually happened.

## Code Sample

```typescript
import Swfte from 'swfte-sdk';

const client = new Swfte({ apiKey: 'sk-swfte-...' });

// Minimal code to reproduce the issue
const response = await client.chat.completions.create({
  model: 'openai:gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

## Stack Trace

```
Paste the full error message and stack trace here
```

## Additional Context

Add any other context about the problem here (screenshots, logs, related issues, etc.).

## Possible Solution

(Optional) If you have suggestions on how to fix the bug.
