# Changelog

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
