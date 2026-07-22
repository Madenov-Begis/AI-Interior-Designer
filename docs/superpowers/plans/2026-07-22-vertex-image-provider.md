# Vertex Image Provider Implementation Plan

> **For agentic workers:** Execute inline. Automated tests remain deferred by explicit user instruction; static checks and a live provider smoke test are mandatory.

**Goal:** Replace the source-preserving fake result with real Vertex AI image-to-image generation while retaining the existing reservation, persistence, watermark, and refund lifecycle.

**Architecture:** Authenticate server-side with a Google service-account JSON file referenced only from `.env.local`. A focused Vertex provider sends the source/visual-prompt image, ordered reference images, prompt, and aspect ratio to a configurable Google image model and extracts the returned image bytes. The worker chooses the provider from the Prisma `AiModel.provider` snapshot rather than exposing credentials or model IDs to the client.

**Tech Stack:** Next.js 16, Prisma 7, Google Gen AI SDK for Vertex AI, Sharp, Supabase Storage.

## Global constraints

- Keep `FAKE` available for local fallback, but make the configured Vertex model the default for the new environment.
- Never commit or log the service-account JSON/private key.
- Preserve source geometry, use ordered generation-reference snapshots, and keep normal-plan watermark behavior.
- Refund the reserved usage event on every provider/auth/response failure.
- Do not add automated test files yet; run Prisma validation, TypeScript, ESLint, production build, and a live Vertex smoke request.

## Tasks

- [x] Add the pinned Google Gen AI SDK and server-only environment configuration.
- [x] Implement the Vertex request/response adapter with source, visual prompt, and ordered reference images.
- [x] Pass model ID, aspect ratio, timeout, and reference buffers from the worker into the provider.
- [x] Upsert the production Vertex model and link it to active plans through Prisma.
- [x] Run live authentication/model smoke checks and static/build verification.
