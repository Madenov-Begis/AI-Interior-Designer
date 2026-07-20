# Results, History and Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Tests are deferred by user instruction; static/build verification is mandatory.

**Goal:** Завершить основной пользовательский поток защищённым результатом, before/after, скачиванием, историей и профилем с лимитом.

**Architecture:** Generation history and profile data come only from Prisma ownership-scoped queries. Binary download is proxied by an authenticated Route Handler; the browser never receives original unwatermarked file IDs. Client history uses cursor pagination and short-lived user-result signed URLs.

**Tech Stack:** Next.js 16, Prisma 7, TanStack Query, Supabase Storage.

## Tasks

- [ ] Добавить history list, cancel, retry-as-new metadata and soft delete APIs.
- [ ] Добавить protected user-result download endpoint.
- [ ] Добавить responsive before/after component and history cards.
- [ ] Добавить GET/PATCH profile and profile/usage UI.
- [ ] Обновить dashboard navigation and project list.
- [ ] Выполнить Prisma/typecheck/lint/build/diff/no-Data-API checks и commit.
