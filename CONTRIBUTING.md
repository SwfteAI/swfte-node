# Contributing to Swfte JavaScript SDK

Thank you for your interest in contributing to the Swfte JavaScript SDK! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Code Style](#code-style)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) to keep our community approachable and respectable.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Set up the development environment
4. Create a branch for your changes

## Development Setup

### Prerequisites

- Node.js 18 or higher
- npm, yarn, or pnpm

### Installation

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/swfte-js.git
cd swfte-js

# Install dependencies
npm install

# Build the project
npm run build
```

### Environment Variables

For running integration tests:

```bash
export SWFTE_API_KEY="your-api-key"
export SWFTE_BASE_URL="https://api.swfte.com"
```

## Making Changes

1. Create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following our code style guidelines

3. Add or update tests as needed

4. Update TypeScript types if you're changing public APIs

5. Commit your changes with clear, descriptive messages

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/unit/agents.test.ts
```

### Test Structure

- `tests/unit/` - Unit tests with mocked HTTP responses
- `tests/integration/` - Integration tests against real API

### Writing Tests

- Use Vitest as the test framework
- Use MSW (Mock Service Worker) for mocking HTTP requests
- Each new feature should have corresponding tests
- Aim for at least 80% code coverage

Example test:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { SwfteClient } from '../src/client';

describe('SwfteClient', () => {
  it('should create client with API key', () => {
    const client = new SwfteClient({ apiKey: 'test-key' });
    expect(client).toBeDefined();
  });
});
```

## Code Style

### Formatting and Linting

```bash
# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix

# Type check
npm run typecheck
```

### Style Guidelines

- Use TypeScript for all source files
- Export types alongside implementations
- Use `async/await` over raw Promises
- Prefer `const` over `let`
- Use descriptive variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused

### TypeScript Guidelines

- Avoid using `any` - use `unknown` if type is truly unknown
- Export interfaces for public types
- Use strict mode
- Document function parameters and return types

## Pull Request Process

1. **Update your branch**:
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Run all checks locally**:
   ```bash
   npm run lint
   npm run typecheck
   npm run build
   npm test
   ```

3. **Push and create PR**

4. **PR Requirements**:
   - Clear description of changes
   - Link to related issues
   - All CI checks passing
   - Code review approval
   - No merge conflicts

5. **After merge**: Delete your branch

## Commit Message Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add streaming support for chat completions
fix: handle network timeout errors
docs: add examples for image generation
test: add unit tests for workflows module
chore: upgrade TypeScript to 5.4
refactor: simplify error handling logic
```

## Building

```bash
# Build for production
npm run build

# Build outputs:
# - dist/index.js (CommonJS)
# - dist/index.mjs (ESM)
# - dist/index.d.ts (TypeScript definitions)
```

## Reporting Issues

### Bug Reports

Please include:

- Node.js version
- SDK version
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Error messages and stack traces

### Feature Requests

Please describe:

- The problem you're trying to solve
- Your proposed solution
- Any alternatives you've considered

## Questions?

- Open a [GitHub Discussion](https://github.com/swfte/swfte-js/discussions)
- Join our [Discord community](https://discord.gg/swfte)
- Email us at sdk@swfte.com

Thank you for contributing!
