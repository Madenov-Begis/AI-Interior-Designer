# Visual Prompting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Automated tests are intentionally deferred by the user's instruction; every task must pass Prisma validation, typecheck, lint, production build, and manual API/UI verification where credentials permit.

**Goal:** Добавить адаптивный редактор разметки комнаты с сохранением JSON-состояния через Prisma и объединённого изображения через приватный Supabase Storage.

**Architecture:** Fabric.js работает только в Client Component и рисует прозрачный overlay в стабильном editor coordinate space до 1600 px. Сервер повторно проверяет владельца проекта, JSON и PNG, масштабирует overlay к исходному изображению, создаёт flattened WebP, загружает его в `visual-prompts`, а затем транзакционно обновляет `Project.canvasState`, `Project.visualPromptId` и `Project.visualPromptUsed` через Prisma.

**Tech Stack:** Next.js 16 App Router, React 19, Fabric.js 7.4, Prisma 7, Supabase Storage, Sharp, Zod.

## Global Constraints

- Supabase SDK используется только для Auth и Storage; бизнес-данные читаются и изменяются только Prisma.
- Исходное изображение не перезаписывается.
- Поддерживаются select, pen, translucent marker, rectangle, color, width, undo, redo, delete, clear и restore.
- Canvas state содержит версию и размеры editor/source, чтобы координаты однозначно масштабировались к оригиналу.
- Overlay принимается только как валидный PNG не более 15 МБ.
- Все маршруты повторно проверяют текущую Supabase identity и владение проектом.

---

### Task 1: Editor route and project transition

**Files:** `src/components/design/source-upload.tsx`, `src/app/app/design/[id]/page.tsx`, `src/features/projects/service.ts`

- [ ] После успешной загрузки направлять пользователя на `/app/design/{projectId}`.
- [ ] Добавить серверную страницу существующего проекта с ownership check, source preview signed URL и начальными размерами/state.
- [ ] Не раскрывать Storage path клиенту.

### Task 2: Fabric editor

**Files:** `package.json`, `pnpm-lock.yaml`, `src/features/visual-prompt/types.ts`, `src/components/design/visual-prompt-editor.tsx`, `src/app/globals.css`

- [ ] Установить точную версию `fabric@7.4.0` и зафиксировать lockfile.
- [ ] Реализовать инструменты select, pen, marker и rectangle.
- [ ] Реализовать цвет, толщину, undo/redo, delete, clear и restore.
- [ ] Хранить историю сериализованных состояний без захвата control layer.
- [ ] Масштабировать UI через CSS при неизменном editor coordinate space, чтобы pointer mapping работал на mouse/touch.

### Task 3: Persistence API

**Files:** `src/features/visual-prompt/schema.ts`, `src/features/visual-prompt/service.ts`, `src/app/api/v1/projects/[id]/visual-prompt/route.ts`

- [ ] Валидировать versioned canvas state и PNG overlay.
- [ ] Скачать исходник через server-only Storage client, масштабировать overlay и создать flattened WebP через Sharp.
- [ ] Загрузить новый объект с `upsert: false`, затем транзакционно создать `MediaFile` и обновить Project через Prisma.
- [ ] При ошибке БД удалить новый Storage object; после успеха удалить заменённый старый object.
- [ ] Реализовать DELETE для отключения разметки без удаления исходного фото.

### Task 4: Verification and commit

- [ ] Выполнить `pnpm prisma:validate`, `pnpm prisma:generate`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `git diff --check`.
- [ ] Проверить отсутствие Supabase Data API calls.
- [ ] Зафиксировать этап отдельным commit.
