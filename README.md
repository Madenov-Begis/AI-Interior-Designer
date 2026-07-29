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
- `PAYMENT_PROVIDER=disabled` — production-режим оплаты до подключения Payme/Click.
- `PAYMENT_PROVIDER=mock` — только локальная разработка и только вместе с `AI_PROVIDER=fake`.
- `TRIGGER_SECRET_KEY` и `SENTRY_DSN` пока необязательны: ошибки и жизненный цикл генерации сохраняются через Prisma.
- Все секреты хранятся только в `.env.local`; файл исключён из Git.

Mock-оплата позволяет локально завершать тестовые заказы без обращения к
платёжной системе. Она запрещена при `NODE_ENV=production` и при
`AI_PROVIDER=vertex`: приложение завершит валидацию окружения с ошибкой
`MOCK_PAYMENTS_NOT_SAFE`. В production элементы покупки остаются отключёнными,
пока не появятся реальный адаптер Payme/Click и договор с платёжным провайдером.

Безопасные переключатели для операторов:

```dotenv
PAYMENT_PROVIDER=disabled  # production until Payme/Click is connected
PAYMENT_PROVIDER=mock      # local development only; requires AI_PROVIDER=fake
```

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
pnpm prisma:validate
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Полная проверка включает unit/service тесты, строгую типизацию, ESLint, Prisma
validation и production build. Проверка миграций требует доступного PostgreSQL:
сначала выполните `pnpm db:migrate:deploy`, затем `pnpm db:status`.

Полное исходное ТЗ хранится в [`docs/requirements/technical-specification.md`](docs/requirements/technical-specification.md). Архитектурный дизайн и поэтапные планы находятся в `docs/superpowers/`.
