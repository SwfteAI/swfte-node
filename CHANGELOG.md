# Changelog

## Unreleased

### Added

- `agents.chat(agentId, message, { userId?, conversationId? })` —
  `POST /v1/agents/{agentId}/chat/{userId}` with `{ message, conversationId? }`.
  Returns the reply as `response` (normalised from `content` when the server uses
  that key) plus `conversationId`. `userId` defaults to `"sdk-user"`
  (`DEFAULT_CHAT_USER_ID`).
- `workflows.invoke(workflowId, inputs)` — `POST /v2/workflows/{id}/invoke`, runs
  the published snapshot and returns `{ executionId, ... }` (HTTP 202).
- `workflows.invokeAndWait(workflowId, inputs, { timeoutMs, pollIntervalMs })` —
  invokes and polls to a terminal status. Success is any of `SUCCESS`,
  `SUCCEEDED`, `COMPLETED`; `FAILED`/`TIMEOUT`/`CANCELLED`/`CANCELED` reject with
  `WorkflowExecutionError`; the client-side deadline rejects with
  `WorkflowTimeoutError`.
- `catalog.search(params)`, `catalog.get(kind, id)`, `catalog.contract(kind, id)`
  over `/v2/catalog/*`.
- `apiBaseUrl` option (and `SWFTE_API_BASE_URL`) for the agents-service root.
  Defaults to `baseUrl` with the trailing `/v1/gateway` or `/v2/gateway` removed,
  which is what every management resource already computed; all of them now read
  it from one place.
- `APIError`, `RateLimitError`, `WorkflowExecutionError`, `WorkflowTimeoutError`
  raised by the new calls. The new calls are never retried (they are not
  idempotent).
- `npm run test:integration` for the live-gateway suite; `npm test` now runs the
  hermetic unit suite only.

### Changed

- `workflows.getExecutionStatus()` now returns `WorkflowExecutionStatus`: the
  server's `{ execution, nodeExecutions, progress }` with `executionId`, `status`
  (upper-cased), `workflowId`, `outputs` and `error` lifted to the top level.
  Previously it was typed as a flat `WorkflowExecution` that the server never
  returned, so `status` read `undefined`.
- `workflows.waitForCompletion()` recognised only `COMPLETED`; the server reports
  `SUCCESS`, so it polled until timeout on every successful run. It now shares the
  terminal-status rules and errors of `invokeAndWait`.

### Fixed

- Unit tests that described methods the SDK never had (`agents.execute`,
  `verify`, `clone`, `toggleActive`, `search`) or the pre-1.1.1 default URL were
  corrected or removed.

## 1.1.1 — 2026-09-01

### Fixed

- **The shipped default `baseUrl` pointed at a path that returns 403.** The
  gateway lives behind `/agents`; the default omitted it. Corrected to
  `https://api.swfte.com/agents/v2/gateway`.

  This SDK was the only one of the three that already carried the right default
  at the time of the 2026-09-01 audit — the Python and Java clients did not, and
  neither could make a request out of the box. The release pipeline now installs
  the packed tarball and asserts this exact value, so the class of defect cannot
  ship again unnoticed.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.1.0 — 2026-05-07

### Added
- Twelve new V2 resource clients exposed on the `Swfte` client:
  `agentWizard`, `chatflows` (with nested `builder` and `versions`),
  `datasets`, `documents`, `files`, `rag`, `mcp`, `modules`, `marketplace`,
  `voiceCalls`, `audit`, `costControl`, and `conversationsV2`.
- `docs/cookbook/` — runnable TypeScript recipes for every Top-15 V2
  controller (agents, agent-wizard, chatflows, workflows, conversations,
  datasets, documents, files, rag, mcp, modules, marketplace, voice-calls,
  audit, cost-control).
- `ABOUT.md` company profile.
- `README.md` — new About-Swfte and Resources sections, links to
  companion SDKs (Java, Python, Chat Widget, ChatFlow Widget).
- Strongly-typed request/response interfaces for every new resource,
  re-exported from the package root.

### Changed
- `package.json` — bumped to `1.1.0`, refreshed keywords, repo, homepage,
  and bugs URLs.
- `User-Agent` bumped to `swfte-js/1.1.0`.

### Compatibility
- 100% backwards-compatible with `1.0.x`. The existing V1 `conversations`
  namespace is preserved; the new V2 surface is exposed as
  `conversationsV2`.

## [Unreleased]

## [1.0.0] - 2025-01-XX

### Added
- Unified API client for all AI providers
- Chat completions with streaming support
- Image generation (DALL-E, Stable Diffusion)
- Audio transcription and text-to-speech
- Embeddings generation
- Agent management (CRUD operations)
- Workflow orchestration
- Automatic retry logic with exponential backoff
- Rate limit handling
- Full TypeScript definitions
- ESM and CommonJS module support
- Node.js 18+ and modern browser support

### Supported Providers
- OpenAI (GPT-4, GPT-3.5, DALL-E, Whisper, TTS)
- Anthropic (Claude 3 family)
- Google (Gemini Pro)
- Self-hosted models via RunPod

---

[Unreleased]: https://github.com/swfteai/swfte-node/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/swfteai/swfte-node/releases/tag/v1.0.0
