# Project Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Создать локально запускаемый Next.js-каркас с тестами, типизированной конфигурацией, единым API contract и сменной тёмно-лаймовой темой для последующей реализации полного ТЗ.

**Architecture:** Один Next.js App Router package с кодом в `src/`; серверная конфигурация и API contracts не импортируются в клиентские модули. Визуальный слой строится на семантических CSS tokens и небольших UI primitives, поэтому будущая смена темы не затронет маршруты и бизнес-логику.

**Tech Stack:** Node.js 24, pnpm 11, Next.js App Router, React, TypeScript strict, Tailwind CSS, Zod, Vitest, Testing Library, ESLint.

## Global Constraints

- Интерфейс на русском языке и адаптивен от 320 px.
- Секреты не используют префикс `NEXT_PUBLIC_`; клиенту доступны только URL и publishable key Supabase.
- Все REST endpoints располагаются под `/api/v1`, возвращают `{ data, meta }` либо `{ error, meta }` и включают `requestId`.
- Тема первой версии использует графитовый фон, лаймовый акцент и сетку по утверждённому направлению; бренд и контент Aidentika не копируются.
- Изменения выполняются через TDD и завершаются отдельными коммитами.

---

### Task 1: Next.js и тестовый каркас

**Files:**
- Create: `package.json`, `pnpm-lock.yaml`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`
- Create: `vitest.config.ts`, `vitest.setup.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Test: `src/app/page.test.tsx`

**Interfaces:**
- Produces: команды `dev`, `build`, `lint`, `typecheck`, `test`, `test:watch`; alias `@/* -> src/*`; App Router root layout.

- [ ] **Step 1: Создать manifests и конфигурацию**

`package.json` должен объявить private ESM package, package manager `pnpm@11.13.0`, Node `>=24`, scripts из Interfaces, runtime packages `next`, `react`, `react-dom`, `zod`, `clsx`, `tailwind-merge` и dev packages TypeScript, Tailwind/PostCSS, ESLint Next config, Vitest, jsdom и Testing Library.

- [ ] **Step 2: Написать падающий smoke test**

```tsx
import { render, screen } from "@testing-library/react";
import HomePage from "./page";

it("показывает основной призыв к созданию интерьера", () => {
  render(<HomePage />);
  expect(screen.getByRole("heading", { name: /преобразите комнату/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /создать новый интерьер/i })).toHaveAttribute("href", "/login");
});
```

- [ ] **Step 3: Запустить тест и подтвердить красное состояние**

Run: `corepack pnpm install && corepack pnpm test -- src/app/page.test.tsx`
Expected: FAIL, потому что `src/app/page.tsx` ещё не экспортирует требуемый UI.

- [ ] **Step 4: Реализовать минимальные layout и page**

`layout.tsx` задаёт `lang="ru"`, metadata рабочего названия и подключает `globals.css`. `page.tsx` экспортирует Server Component с `<h1>Преобразите комнату, сохранив её реальность</h1>` и ссылкой `<a href="/login">Создать новый интерьер</a>`.

- [ ] **Step 5: Проверить каркас**

Run: `corepack pnpm test -- src/app/page.test.tsx && corepack pnpm typecheck && corepack pnpm lint`
Expected: все команды завершаются с кодом 0.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml next.config.ts tsconfig.json postcss.config.mjs eslint.config.mjs vitest.config.ts vitest.setup.ts src/app
git commit -m "chore: scaffold Next.js application"
```

### Task 2: Типизированная конфигурация окружения

**Files:**
- Create: `.env.example`, `src/config/env.ts`
- Test: `src/config/env.test.ts`

**Interfaces:**
- Produces: `parseServerEnv(input: Record<string, string | undefined>): ServerEnv`; `serverEnv()` с memoized parse; тип `ServerEnv`.
- Consumes: Zod.

- [ ] **Step 1: Написать тесты правил env**

```ts
import { describe, expect, it } from "vitest";
import { parseServerEnv } from "./env";

const valid = {
  NODE_ENV: "test",
  APP_URL: "http://localhost:3000",
  APP_TIMEZONE: "Asia/Tashkent",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-key",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/app",
  DIRECT_URL: "postgresql://user:pass@localhost:5432/app",
};

describe("parseServerEnv", () => {
  it("принимает минимальную локальную конфигурацию", () => expect(parseServerEnv(valid).APP_TIMEZONE).toBe("Asia/Tashkent"));
  it("отклоняет невалидный APP_URL", () => expect(() => parseServerEnv({ ...valid, APP_URL: "local" })).toThrow());
  it("не требует AI credentials для fake provider", () => expect(parseServerEnv(valid).AI_PROVIDER).toBe("fake"));
});
```

- [ ] **Step 2: Подтвердить падение**

Run: `corepack pnpm test -- src/config/env.test.ts`
Expected: FAIL с ошибкой отсутствующего модуля `./env`.

- [ ] **Step 3: Реализовать env schema**

Zod schema задаёт обязательные поля из `valid`, `AI_PROVIDER: z.enum(["fake", "vertex"]).default("fake")`, опциональные server-only `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_CLOUD_LOCATION`, `GOOGLE_APPLICATION_CREDENTIALS_JSON`, `TRIGGER_SECRET_KEY`, `SENTRY_DSN`. Через `superRefine` режим `vertex` требует project ID и location. Экспортировать `z.infer` как `ServerEnv` и memoized getter без выполнения parse при импорте.

- [ ] **Step 4: Добавить `.env.example`**

Файл перечисляет все поля схемы с безопасными локальными демонстрационными значениями, `AI_PROVIDER=fake` и комментариями о credentials; реальные секреты отсутствуют.

- [ ] **Step 5: Проверить и зафиксировать**

Run: `corepack pnpm test -- src/config/env.test.ts && corepack pnpm typecheck`
Expected: PASS.

```bash
git add .env.example src/config
git commit -m "feat: validate server environment"
```

### Task 3: Единый REST contract и request ID

**Files:**
- Create: `src/lib/api/contracts.ts`, `src/lib/api/request-id.ts`, `src/app/api/v1/health/route.ts`
- Test: `src/lib/api/contracts.test.ts`, `src/app/api/v1/health/route.test.ts`

**Interfaces:**
- Produces: `ApiMeta`, `ApiSuccess<T>`, `ApiFailure`, `apiSuccess<T>(data, requestId, init?)`, `apiError(code, message, requestId, status, details?)`, `getRequestId(headers)`.
- HTTP: `GET /api/v1/health -> 200 { data: { status: "ok" }, meta: { requestId } }`.

- [ ] **Step 1: Написать contract tests**

Проверить, что success response сохраняет status и `{ data, meta.requestId }`; error response возвращает заданный HTTP status и `{ error: { code, message, details? }, meta.requestId }`; `getRequestId` принимает валидный входной `x-request-id`, иначе создаёт UUID.

- [ ] **Step 2: Запустить красные тесты**

Run: `corepack pnpm test -- src/lib/api/contracts.test.ts`
Expected: FAIL из-за отсутствующих экспортов.

- [ ] **Step 3: Реализовать contracts**

Использовать `NextResponse.json`; `ApiFailure.error.code` является строковым стабильным кодом, а `details` — JSON-safe unknown. UUID проверяется через `z.string().uuid()` и создаётся `crypto.randomUUID()`.

- [ ] **Step 4: Написать и реализовать health route test**

Вызвать `GET(new Request("http://localhost/api/v1/health", { headers: { "x-request-id": knownUuid } }))` и проверить status, payload и `x-request-id` response header. Route использует только helpers Task 3.

- [ ] **Step 5: Проверить и зафиксировать**

Run: `corepack pnpm test -- src/lib/api src/app/api/v1/health && corepack pnpm typecheck`
Expected: PASS.

```bash
git add src/lib/api src/app/api/v1/health
git commit -m "feat: add versioned API response contract"
```

### Task 4: Сменная дизайн-система и лендинг

**Files:**
- Create: `src/lib/cn.ts`, `src/components/ui/button.tsx`, `src/components/marketing/site-header.tsx`, `src/components/marketing/hero.tsx`, `src/components/marketing/process-section.tsx`
- Modify: `src/app/globals.css`, `src/app/page.tsx`
- Test: `src/components/marketing/hero.test.tsx`, `src/app/page.test.tsx`

**Interfaces:**
- Produces: `cn(...inputs)`, `Button` с variants `primary|secondary|ghost`, `SiteHeader`, `Hero`, `ProcessSection`.
- Design tokens: `--background`, `--surface`, `--surface-elevated`, `--foreground`, `--muted`, `--border`, `--accent`, `--accent-foreground`, `--radius-sm|md|lg`.

- [ ] **Step 1: Расширить UI tests**

Проверить единственный `<h1>`, русские CTA, навигационные ссылки `Как это работает`, `Примеры`, `Тарифы`, три шага `Фото помещения`, `Референсы`, `Инструкция` и отсутствие текста/логотипа Aidentika.

- [ ] **Step 2: Подтвердить падение**

Run: `corepack pnpm test -- src/app/page.test.tsx src/components/marketing/hero.test.tsx`
Expected: FAIL, пока компоненты не созданы.

- [ ] **Step 3: Реализовать tokens и primitives**

В `globals.css` определить тёмные семантические переменные, grid utility через два linear-gradient, focus-visible ring на accent и reduced-motion fallback. `Button` использует `cn` и не содержит hex-цветов — только token-based Tailwind/CSS классы.

- [ ] **Step 4: Собрать адаптивную страницу**

Header скрывает desktop navigation ниже 768 px, Hero содержит утверждённый текст о сохранении геометрии, CTA ведёт на `/login`, ProcessSection объясняет три шага. Max width 1280 px, горизонтальный padding не менее 16 px на 320 px viewport.

- [ ] **Step 5: Проверить страницу**

Run: `corepack pnpm test -- src/app/page.test.tsx src/components/marketing/hero.test.tsx && corepack pnpm typecheck && corepack pnpm lint && corepack pnpm build`
Expected: tests/typecheck/lint/build завершаются с кодом 0; routes `/` и `/api/v1/health` присутствуют в build output.

- [ ] **Step 6: Commit**

```bash
git add src/app src/components src/lib/cn.ts
git commit -m "feat: add themed marketing foundation"
```

### Task 5: Документация локального запуска и финальная проверка этапа

**Files:**
- Create: `README.md`, `.gitignore`
- Modify: `docs/superpowers/plans/2026-07-20-project-foundation.md`

**Interfaces:**
- Produces: повторяемые команды setup/dev/test/build и ссылка на полное ТЗ `docs/requirements/technical-specification.md`.

- [ ] **Step 1: Описать локальный workflow**

README фиксирует `corepack enable`, `pnpm install`, копирование `.env.example` в `.env.local`, `pnpm dev`, `pnpm test`, `pnpm build`; объясняет fake provider и перечисляет следующие этапы: data/auth, project media/editor, references, generation, results/history, admin/hardening.

- [ ] **Step 2: Защитить локальные данные**

`.gitignore` включает `.next/`, `node_modules/`, `.env*` с исключением `!.env.example`, `coverage/`, `test-results/`, `playwright-report/`, `.trigger/`, `.superpowers/`, OS/editor files.

- [ ] **Step 3: Выполнить полный gate**

Run: `corepack pnpm test && corepack pnpm typecheck && corepack pnpm lint && corepack pnpm build && git diff --check`
Expected: все команды завершаются с кодом 0 и рабочее дерево содержит только ожидаемые изменения README/ignore/plan checkbox.

- [ ] **Step 4: Commit**

```bash
git add README.md .gitignore docs/superpowers/plans/2026-07-20-project-foundation.md
git commit -m "docs: add local development workflow"
```

## Следующие отдельные планы

После этого этапа последовательно создаются и исполняются планы: Prisma data model + RLS; Google OAuth + profile/capabilities; projects + secure media; Fabric.js Visual Prompting; file/URL references; Trigger.dev + Vertex generation; results/watermark/history; admin; security/observability/acceptance hardening.
