# AI Interior Designer

Веб-сервис AI-визуализации дизайна интерьера по фотографии помещения.

## Работа с данными

- Prisma — единственный слой доступа к PostgreSQL: модели, запросы, транзакции и миграции находятся в `prisma/` и серверных сервисах.
- Supabase SDK используется только для Google OAuth, серверной сессии и приватного Storage.
- Приложение не обращается к таблицам через Supabase Data API (`from`, `rpc`). Роли `anon` и `authenticated` не имеют доступа к бизнес-таблицам.
- Корневая папка `supabase/` не используется. Приватные Storage buckets создаются один раз в панели Supabase: `source-images`, `visual-prompts`, `reference-images`, `generation-originals`, `generation-results`, `branding`.

## Локальный запуск

```bash
corepack enable
pnpm install
cp .env.example .env.local
pnpm dev
```

Приложение откроется на `http://localhost:3000`. По умолчанию используется `AI_PROVIDER=fake`, поэтому реальные credentials Vertex AI для запуска интерфейса не нужны.

## Режимы окружения

- `AI_PROVIDER=fake` — локальный mock генерации; ключи Google Cloud не требуются.
- `AI_PROVIDER=vertex` — production-режим, для которого нужны `GOOGLE_CLOUD_*` переменные.
- `TRIGGER_SECRET_KEY` и `SENTRY_DSN` пока необязательны: ошибки и жизненный цикл генерации сохраняются через Prisma.
- Все секреты хранятся только в `.env.local`; файл исключён из Git.

После первой авторизации администратора можно назначить через Prisma Studio: открыть `Profile`, выставить `role = ADMIN` и оставить `status = ACTIVE`. Затем становится доступна страница `/admin` и защищённые API `/api/v1/admin/*`.

## База данных

```bash
pnpm prisma:generate
pnpm db:migrate
pnpm db:status
pnpm db:studio
```

В production миграции применяются командой `pnpm db:migrate:deploy`.

Для transaction pooler используется `DATABASE_URL`, а миграции выполняются через session pooler из `DIRECT_URL`. Ошибка `password authentication failed` означает, что пароль базы нужно заменить в обеих строках; Supabase API-ключи не являются паролем Postgres.

## Проверки

```bash
pnpm typecheck
pnpm lint
pnpm build
```

Тестовые файлы намеренно пока не добавлены. Проверки текущего этапа: строгая типизация, ESLint, Prisma validation и production build.

Полное исходное ТЗ хранится в [`docs/requirements/technical-specification.md`](docs/requirements/technical-specification.md). Архитектурный дизайн и поэтапные планы находятся в `docs/superpowers/`.
