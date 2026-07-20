# Project References Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Automated tests are deferred by the user's instruction; use typecheck, lint, build and focused manual verification.

**Goal:** Добавить проекту упорядоченные файловые и URL-референсы с приватным хранением и SSRF-защитой.

**Architecture:** Route Handlers получают identity из Supabase Auth, но все project/reference данные изменяют через Prisma. Файлы нормализуются Sharp и сохраняются server-only Storage client; URL importer ограничивает протоколы, DNS/IP, redirects, timeout и поток, затем обрабатывает direct image либо metadata HTML.

**Tech Stack:** Next.js 16, Prisma 7, Supabase Storage, Sharp, Node DNS/net, Zod.

## Global Constraints

- До 10 референсов по умолчанию, с учётом `Plan.maxReferenceImages`.
- JPG/JPEG, PNG, WEBP; максимум 15 МБ.
- Storage path: `users/{userId}/projects/{projectId}/references/{fileId}.{extension}`.
- Только Prisma для бизнес-таблиц; Storage service role остаётся server-only.
- URL: HTTP(S), timeout 15 секунд, redirects до 5, повторная IP-проверка, запрет private/loopback/link-local/metadata ranges.
- Импорт возвращает отдельный результат для каждой ссылки.

---

### Task 1: Reference files and ordering API

- [ ] Реализовать валидацию reference image и storage/Prisma service.
- [ ] Реализовать POST/DELETE references, PATCH reorder и DELETE одного reference.
- [ ] Проверять ownership и лимит тарифа на сервере.

### Task 2: Safe URL importer

- [ ] Нормализовать URL и проверять hostname/IP до каждого запроса.
- [ ] Ограничить redirects, timeout и streamed body size.
- [ ] Поддержать direct image, `og:image`, `twitter:image` и JSON-LD image.
- [ ] Вернуть частичный результат без отката успешных URL.

### Task 3: References UI

- [ ] Добавить tabs «Файлы»/«Ссылки», preview, reorder, delete и clear.
- [ ] Использовать signed URL через защищённый endpoint.
- [ ] Поддержать loading, partial success и error states.

### Task 4: Verification

- [ ] Prisma validate/generate, typecheck, lint, build и `git diff --check`.
- [ ] Проверить отсутствие Supabase Data API calls.
- [ ] Зафиксировать этап отдельным commit.
