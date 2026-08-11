# Ruvie

Веб-сервис AI-визуализации дизайна интерьера по фотографии помещения.

## Структура приложения

Код разделён на три независимые зоны:

- `src/client` — пользовательский frontend;
- `src/server` — backend и серверная инфраструктура;
- `admin/src` — отдельный admin frontend.

У каждой зоны есть собственная папка `shared` для переиспользования только
внутри этой зоны. Глобального `shared` между frontend и backend нет.

`src/app` остаётся тонким слоем маршрутизации Next.js: страницы подключают
модули из `src/client`, а Route Handlers — модули из `src/server`. Клиентские
приложения взаимодействуют с backend только через HTTP API.

```text
src/
├── app/       # Next.js routes и layouts
├── client/
│   ├── features/
│   ├── shared/
│   └── widgets/
├── server/
│   ├── features/
│   └── shared/
└── generated/

admin/src/
├── app/
├── features/
├── shared/
└── widgets/
```

## Работа с данными

- Prisma — единственный слой доступа к PostgreSQL: модели, запросы, транзакции и миграции находятся в `prisma/` и серверных сервисах.
- Supabase SDK используется только для Google OAuth, серверной сессии и приватного Storage.
- Сервер приложения не обращается к бизнес-таблицам через Supabase Data API (`from`, `rpc`). Для `authenticated` разрешено только owner-scoped чтение собственных `CreditWallet`, `CreditTransaction` и `PaymentOrder`, защищённое RLS; любые записи и таблица `PaymentEvent` остаются доступны только серверному Prisma-слою. У роли `anon` доступа к этим таблицам нет.
- Корневая папка `supabase/` не используется. Приватные Storage buckets создаются один раз в панели Supabase: `source-images`, `visual-prompts`, `reference-images`, `generation-originals`, `generation-results`, `branding`.

## Локальный запуск

```bash
corepack enable
pnpm install
cp .env.example .env.local
pnpm dev
```

Приложение откроется на `http://localhost:3000`. По умолчанию используется `AI_PROVIDER=fake`, поэтому реальные credentials Vertex AI для запуска интерфейса не нужны.

Основные пользовательские маршруты:

- `/app` — создать или переиспользовать пустой рабочий проект;
- `/app/projects` — каталог завершённых проектов с серверным поиском и пагинацией;
- `/app/[id]` — canvas workspace проекта;
- `/app/credits` — баланс, пакеты и журнал операций;
- `/app/profile` — профиль пользователя.

Visual Prompting использует Fabric.js 7. Ластик подключён через `@erase2d/fabric`, поскольку eraser был вынесен из стандартной сборки Fabric начиная с v6.

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

Актуальное ТЗ хранится в [`docs/requirements/technical-specification.md`](docs/requirements/technical-specification.md), а сводная история решений — в [`docs/project-history.md`](docs/project-history.md). Исходные материалы `superpowers` объединены в эту историю и при необходимости восстанавливаются из Git.
