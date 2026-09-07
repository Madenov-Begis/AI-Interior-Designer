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
├── pages/
├── shared/
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

Клиентский frontend отправляет API-запросы на `https://api.ruvie.cc/api/v1`, отдельная админка — на `https://api.ruvie.cc/api/v1/admin`. Значение можно переопределить через `NEXT_PUBLIC_API_BASE_URL` и `VITE_API_BASE_URL`. Backend разрешает browser-origin клиента только из exact allowlist `APP_ORIGINS`, а origin админки — из `ADMIN_ORIGINS`.

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
- `MAX_PARALLEL_GENERATIONS`, `MAX_REFERENCE_IMAGES`, `MAX_REFERENCE_URLS`,
  `MAX_UPLOAD_SIZE_MB`, `MAX_OUTPUT_WIDTH` и `MAX_OUTPUT_HEIGHT` задают одинаковые
  продуктовые ограничения для всех пользователей. Тарифов, подписок и VIP-исключений нет.
- Все секреты хранятся только в `.env.local`; файл исключён из Git.

Mock-оплата позволяет локально завершать тестовые заказы без обращения к
платёжной системе. Она запрещена при `NODE_ENV=production` и при
`AI_PROVIDER=vertex`: приложение завершит валидацию окружения с ошибкой
`MOCK_PAYMENTS_NOT_SAFE`. В production элементы покупки остаются отключёнными,
пока не появятся реальный адаптер Payme/Click и договор с платёжным провайдером.

Безопасные переключатели для операторов:

```dotenv
GENERATIONS_ENABLED=false # emergency stop for all new AI operations
PAYMENT_PROVIDER=disabled  # production until Payme/Click is connected
PAYMENT_PROVIDER=mock      # local development only; requires AI_PROVIDER=fake
```

После первой авторизации администратора можно назначить через Prisma Studio: открыть `Profile`, выставить `role = ADMIN` и оставить `status = ACTIVE`. Административный UI является отдельным Vite-приложением; встроенного Next.js-маршрута `/admin` нет.

Каталог пакетов кредитов хранится в Prisma и управляется в админке на
`/finance/packages`. Лендинг и экран покупки читают один публичный каталог;
заказы сохраняют неизменяемый snapshot выбранного пакета.

```bash
pnpm admin:seed
pnpm admin:dev
```

Админка откроется на `http://localhost:5173`. В production вход выполняется по
единому коду: backend проверяет `ADMIN_ACCESS_CODE` и возвращает подписанный
admin-token. Секреты не попадают во frontend. `AdminPhone` доступен только как
dev-only fallback. Browser origins задаются точным списком `ADMIN_ORIGINS` через
запятую; wildcard не поддерживается.

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
pnpm test:ui
pnpm typecheck
pnpm lint
pnpm build
pnpm admin:server:test
pnpm admin:test
pnpm admin:typecheck
pnpm admin:build
```

Полная проверка включает unit/service тесты, строгую типизацию, ESLint, Prisma
validation и production build. Проверка миграций требует доступного PostgreSQL:
сначала выполните `pnpm db:migrate:deploy`, затем `pnpm db:status`.

Перед beta-релизом запустите единую проверку:

```bash
pnpm release:check
```

Текущий статус и обязательные внешние шаги находятся в
[`docs/launch/current-status.md`](docs/launch/current-status.md), полный checklist —
в [`docs/launch/closed-beta-checklist.md`](docs/launch/closed-beta-checklist.md).

Актуальное ТЗ хранится в [`docs/requirements/technical-specification.md`](docs/requirements/technical-specification.md), а сводная история решений — в [`docs/project-history.md`](docs/project-history.md). Исходные материалы `superpowers` объединены в эту историю и при необходимости восстанавливаются из Git.

## Надёжность рабочего пространства

Корневой запрос сохраняет ключ попытки в sessionStorage: повтор после сетевой
ошибки или reload той же вкладки использует тот же ключ при одинаковых входах.
После подтверждённого ответа следующая генерация получает новый ключ. Сохраняются
только хеш входов и ключ, без prompt и изображений. При отключённом browser storage
защита работает в памяти до размонтирования страницы.

Разметка исходника сохраняется в IndexedDB с синхронной резервной копией в
localStorage до 800-мс debounce серверного сохранения. Экспорт холста и HTTP-записи
выполняются в разных очередях: медленная сеть не блокирует рисование. После возврата в проект черновик
восстанавливается, включая очистку холста; успешный ответ удаляет только тот
снимок, который был отправлен. При другой серверной версии черновик показывается
с предупреждением и не отправляется автоматически до дальнейших действий.
Данные привязаны к пользователю и проекту; явный выход очищает локальные черновики.
Это локальная страховка на текущем устройстве, не замена серверного хранения.
При недоступном хранилище интерфейс предупреждает о необходимости дождаться
сохранения. Возвращение сети повторяет неудачное сохранение.

`pnpm test:ui` проверяет lifecycle редактора и повтор запроса после потери ответа
с React Testing Library и подменёнными сетевым/Fabric адаптерами. Проверка включена
в `pnpm release:check`. Фоновое восстановление кредитов описано в
`docs/launch/monitoring-runbook.md`.

## Рефакторинг и выпуск

Реализованные изменения, проверки и порядок публикации описаны в
[`docs/refactoring-2026-09-07.md`](docs/refactoring-2026-09-07.md).
Новая миграция `20260906090000_reliability_infrastructure` должна быть применена
перед публикацией кода. Она добавляет приватные служебные таблицы ограничений
запросов, временных загрузок и повторного удаления файлов.

Файлы и большие состояния холста загружаются напрямую в приватный bucket
`staging-uploads`; он создаётся сервером при первой загрузке. API получает
идентификаторы и проверяет владельца, назначение, срок, размер и содержимое.
Лимит файла остаётся 15 МБ. Временные файлы удаляются после истечения подписанного
разрешения загрузки; повторное удаление выполняет `pnpm maintain:storage --apply`.
Без `--apply` команды обслуживания только показывают состояние.

Refresh-токен хранится в HttpOnly cookie. Клиент отправляет access-токен как Bearer;
обновление сессии координируется между вкладками. Временные ошибки Auth сохраняют
сессию. При локальной разработке используйте API и frontend на одном hostname
(порты могут различаться), пустой `AUTH_COOKIE_DOMAIN` и соответствующий
`NEXT_PUBLIC_API_BASE_URL`; перенос refresh-токена через URL больше не поддерживается.

Sentry включается только при заданных `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`
и `VITE_SENTRY_DSN` для соответствующих приложений. Тела запросов, cookies, prompt,
изображения, произвольные extras и подписанные URL исключаются из событий.

Интеграционные тесты требуют отдельного PostgreSQL с именем базы
`ruvie_refactor_test` на localhost/127.0.0.1. После применения миграций выполните
`TEST_DATABASE_URL=postgresql://…/ruvie_refactor_test pnpm test:integration`.
Workflow `Pull request quality` поднимает такую базу автоматически и выполняет
миграции, интеграционные и UI-тесты, lint, типизацию и обе production-сборки.
