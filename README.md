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
- Google OAuth и сессии приложения используют PostgreSQL через Prisma.
- Приватные изображения хранятся в файловом каталоге; доступ к ним выдаётся через проверяемые сервером короткоживущие ссылки.
- Генерации выполняет отдельный worker, который забирает задания из PostgreSQL.

## Локальный запуск

Подготовка переноса на VPS ведётся по [плану Timeweb](docs/launch/timeweb-migration-plan.md).
Для локальной проверки Docker нужны запущенный Docker Desktop, Node.js с Corepack
и `.env.local` (если файла нет, скопируйте `.env.example`):

```bash
pnpm docker:up    # собрать и запустить сайт, админку, worker и PostgreSQL
pnpm docker:test  # проверить локальную БД и интеграционные сценарии
pnpm docker:down  # остановить локальные контейнеры
```

Если Terminal пишет `pnpm: command not found`, запускайте те же команды через
`corepack pnpm` (например, `corepack pnpm docker:up`). Однократно добавить
команду `pnpm` в пользовательский PATH можно через
`corepack enable --install-directory "$HOME/.local/bin"`.

Сайт откроется на `http://localhost:3000`, админка — на
`http://localhost:8080`. Без настроенных OAuth-ключей Docker проверяет только
запуск контейнеров, а вход через Google недоступен. Для настоящего входа
создайте или выберите в Google Cloud OAuth-клиент типа **Web application**,
добавьте в его **Authorized redirect URIs**
`http://localhost:3000/auth/callback` и укажите его `GOOGLE_OAUTH_CLIENT_ID`
и `GOOGLE_OAUTH_CLIENT_SECRET` в локальном `.env.local`. Не помещайте секрет
в Git. После изменения файла повторите `pnpm docker:up`. Генерации в этом
контуре пока отключены.

```bash
corepack pnpm install
cp .env.example .env.local
pnpm docker:db:up
pnpm db:migrate:deploy
pnpm dev
```

Приложение откроется на `http://localhost:3000`. Для входа замените фиктивные
Google OAuth credentials в `.env.local` на свои. По умолчанию используется
`AI_PROVIDER=fake`, поэтому реальные credentials Vertex AI для запуска интерфейса не нужны.

Адрес API задают `NEXT_PUBLIC_API_BASE_URL` и `VITE_API_BASE_URL`; в локальном
Docker оба приложения обращаются к `http://localhost:3000`. Backend разрешает
browser-origin клиента только из exact allowlist `APP_ORIGINS`, а origin админки —
из `ADMIN_ORIGINS`.

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

Локальный Docker запускает пустую PostgreSQL и применяет три миграции из
`prisma/migrations` автоматически. Конфигурация `prisma.config.ts` жёстко
указывает на локальную тестовую базу; для VPS используется отдельный
`prisma.timeweb.config.ts`.

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
validation и production build. Интеграционные проверки локальной базы запускает
`pnpm docker:test`.

Перед beta-релизом запустите единую проверку:

```bash
pnpm release:check
```

Текущий статус переноса находится в
[`docs/launch/timeweb-migration-plan.md`](docs/launch/timeweb-migration-plan.md).

Навигация по документации находится в [`docs/README.md`](docs/README.md).
Полная карта страниц, пользовательских сценариев и бизнес-правил хранится в
[`docs/full-product-documentation.md`](docs/full-product-documentation.md),
архитектурные границы — в [`docs/architecture.md`](docs/architecture.md), а
стратегия проверок — в [`docs/testing.md`](docs/testing.md). Правила совместной
работы с Codex описаны в [`AGENTS.md`](AGENTS.md) и
[`docs/codex-workflow.md`](docs/codex-workflow.md). Исходные материалы
и завершённые отчёты при необходимости восстанавливаются из истории Git.

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
в `pnpm release:check`. Фоновое восстановление резервирований выполняет worker.

## Рефакторинг и выпуск

Актуальный порядок проверок описан в [`docs/testing.md`](docs/testing.md).
Новая пустая база создаётся из трёх миграций в `prisma/migrations`.

Файлы и большие состояния холста загружаются в приватную временную область
файлового хранилища. API получает
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
