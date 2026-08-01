# Техническое задание Renoa

- Версия: 2.0
- Дата актуализации: 1 августа 2026 года
- Статус: спецификация текущей реализации и ближайших обязательных ограничений
Связанная история: [`docs/project-history.md`](../project-history.md)

## 1. Назначение

Renoa — веб-сервис AI-визуализации дизайна интерьера. Пользователь загружает фотографию помещения, описывает желаемые изменения, при необходимости рисует визуальные указания и добавляет референсы, после чего получает фотореалистичный вариант обновлённого интерьера.

Система должна сохранять:

- ракурс камеры;
- геометрию и пропорции помещения;
- положение стен, окон и дверей;
- основные архитектурные элементы;
- логическую связь между исходником, результатом и последующими доработками.

## 2. Статус продукта

### 2.1. Реализовано

- публичные landing и login;
- Google OAuth через Supabase Auth;
- профиль пользователя и блокировка аккаунта;
- проекты, загрузка и замена исходной фотографии;
- файловые и URL-референсы;
- Visual Prompting на Fabric.js;
- шесть интерьерных стилей;
- пять форматов изображения;
- fake и Vertex AI providers;
- корневые генерации, retry, cancel и дерево доработок;
- история, signed media URLs, сравнение и JPEG download;
- дневные лимиты FREE/VIP;
- транзакционный кредитный баланс;
- локальная mock-оплата;
- Next.js admin overview и отдельная локальная desktop-админка;
- административные API пользователей, генераций, тарифов, финансов и статистики.

### 2.2. Не входит в текущую реализацию

- выбор AI-модели пользователем;
- хранение AI-моделей в таблице `AiModel`;
- системные уведомления;
- глобальные настройки в таблице `SystemSetting`;
- постоянный административный `AuditLog`;
- production-платежи Payme/Click;
- production login UX отдельной Vite-админки;
- Trigger.dev и Sentry как обязательные runtime-зависимости.

## 3. Пользователи и доступ

### 3.1. Неавторизованный посетитель

Может открыть landing, перейти на login и начать Google OAuth. Не может создавать проекты, загружать медиа, просматривать приватные результаты или пользоваться API приложения.

### 3.2. Пользователь

Пользователь со статусом `ACTIVE` может:

- создавать, переименовывать, архивировать и дублировать свои проекты;
- загружать или заменять фотографию помещения;
- рисовать и сохранять визуальную разметку;
- добавлять, удалять и переставлять референсы;
- импортировать референсы по URL;
- создавать генерации и дочерние доработки;
- отменять допустимые задачи и повторять неуспешные;
- просматривать историю и скачивать JPEG;
- изменять профиль;
- просматривать баланс и журнал кредитов;
- создавать mock-заказы только в безопасном development-режиме.

Профили со статусом `BLOCKED` или `DELETED` не получают доступ к защищённым операциям.

### 3.3. Администратор

Администратор — активный профиль с ролью `ADMIN`. Он может:

- просматривать dashboard и статистику за 1, 7 или 30 дней;
- искать и просматривать пользователей;
- изменять роль, статус, тариф и индивидуальные лимиты;
- просматривать генерации и их детали;
- отменять допустимые генерации;
- вручную корректировать кредитный баланс с указанием причины;
- просматривать credit transactions и payment orders;
- создавать и изменять тарифы.

Администратор не должен иметь возможность заблокировать, удалить или лишить роли `ADMIN` собственный аккаунт через API.

## 4. Авторизация

### 4.1. Основное приложение

Основной пользовательский вход выполняется через Google OAuth и Supabase Auth. Сессия хранится в защищённых cookies, обновляется proxy-слоем и повторно проверяется в Server Components и Route Handlers.

Клиентские claims не считаются достаточным основанием для доступа. Сервер проверяет подпись токена через Supabase и статус профиля через Prisma.

### 4.2. Административный доступ

Поддерживаются два доверенных варианта:

- cookie session основного Next.js-приложения;
- Supabase Bearer token для отдельного доверенного frontend.

Локальная desktop-админка может отправлять `Authorization: AdminPhone +998XXXXXXXXX` только при `NODE_ENV != production`. Этот режим предназначен для локальной разработки и обязан отклоняться в production.

Административный Supabase Auth user создаётся или обновляется командой `pnpm admin:seed` с `ADMIN_PHONE_E164` и `ADMIN_PASSWORD`. Пароль должен содержать минимум 12 символов.

## 5. Карта интерфейсов

### 5.1. Основное приложение

| Маршрут | Назначение |
| --- | --- |
| `/` | Landing Renoa |
| `/login` | Google OAuth вход |
| `/app` | Создание или выбор рабочего проекта |
| `/app/[id]` | Канонический canvas workspace |
| `/app/history` | История проектов и генераций |
| `/app/profile` | Профиль пользователя |
| `/app/credits` | Баланс, пакеты и операции |
| `/app/credits/checkout/[id]` | Локальный mock checkout |
| `/admin` | Встроенный административный overview |

Старые `/app/design` и `/app/design/[id]` должны сохраняться только как совместимые redirect-маршруты.

### 5.2. Отдельная админ-панель

Workspace `admin` запускается отдельно на Vite и ориентирован на desktop. Он использует Mantine, React Router и TanStack Query и содержит:

- обзор;
- пользователей;
- генерации;
- финансы;
- тарифы.

Разрешённый origin задаётся `ADMIN_ORIGIN`, по умолчанию `http://localhost:5173`.

## 6. Рабочий процесс проекта

### 6.1. Создание и открытие

`/app` создаёт новый проект или направляет пользователя к существующему. `/app/[id]` является единым экраном независимо от наличия исходной фотографии.

Пустой проект показывает upload-state. После успешной загрузки тот же экран отображает canvas workspace без промежуточного мастера.

### 6.2. Исходная фотография

Разрешены JPEG, PNG и WebP:

- максимальный размер — 15 МБ;
- минимальная ширина и высота — 512 px;
- максимальная сторона — 6000 px;
- EXIF orientation нормализуется;
- preview имеет максимальную ширину 1600 px;
- оригинал и preview сохраняются в приватном Storage.

Повторная загрузка заменяет source текущего проекта. Клиент должен защищаться от устаревших ответов параллельных upload-запросов.

### 6.3. Visual Prompting

Редактор должен поддерживать:

- кисть и геометрические аннотации;
- выбор, undo, redo и clear;
- pan и pointer-centered zoom;
- сохранение Fabric JSON и прозрачного overlay;
- восстановление состояния после reload;
- сериализацию persistence-операций;
- миграцию legacy coordinate space;
- видимые ошибки сохранения.

Очистка разметки не удаляет исходную фотографию, проект, референсы или историю. Она должна быть подтверждена пользователем и сохранена на сервере.

### 6.4. Референсы

Референсы добавляются файлами или URL:

- JPEG, PNG, WebP;
- до 15 МБ на файл;
- минимум 128×128 px;
- максимум 6000 px по стороне;
- не более 10 изображений;
- порядок хранится явно;
- URL-import принимает до 10 URL и защищается от SSRF, unsafe redirects, private IP, чрезмерных размеров и timeout.

Частично успешный URL-import может возвращать HTTP 207 с результатом по каждому URL.

### 6.5. Стили и форматы

Доступные стили:

- `modern` — Современный;
- `japandi` — Джапанди;
- `minimalism` — Минимализм;
- `neoclassic` — Неоклассика;
- `loft` — Лофт;
- `scandinavian` — Скандинавский.

Доступные aspect ratios: `1:1`, `16:9`, `9:16`, `4:3`, `3:4`.

Стиль является allowlisted code. Его prompt modifier добавляется только на сервере. Произвольный model ID от клиента не принимается.

## 7. Генерация изображений

### 7.1. Создание

Для корневой генерации требуются:

- `projectId`;
- prompt длиной 3–4000 символов;
- допустимый aspect ratio;
- необязательный style code;
- заголовок `Idempotency-Key` длиной 16–128 символов.

Перед созданием сервер проверяет владельца проекта, наличие source, тариф, дневной лимит, параллельный лимит и кредитный баланс. Разметка сохраняется до резервирования генерации.

### 7.2. Выбор AI

Provider и model ID определяются сервером:

- `AI_PROVIDER=fake` — детерминированная локальная имитация;
- `AI_PROVIDER=vertex` — Google Vertex AI;
- Vertex model по умолчанию — `gemini-3-pro-image`, переопределяемая через `VERTEX_IMAGE_MODEL`.

Клиент не видит credentials и не управляет списком моделей.

### 7.3. Snapshot и дерево

Каждая `Generation` сохраняет неизменяемые входы: prompt, final prompt, style, aspect ratio, source, visual prompt, ordered references и связь с родителем.

Доработка создаётся от успешного результата через `parentGenerationId`. Она может иметь собственный prompt, временные референсы и visual overlay. Дочерняя генерация не изменяет родителя.

### 7.4. Жизненный цикл

Допустимые статусы:

- `QUEUED`;
- `PROCESSING`;
- `SUCCEEDED`;
- `FAILED`;
- `CANCELLED`;
- `REJECTED`.

Worker атомарно захватывает queued-задачу, загружает приватные входы, вызывает provider, сохраняет original/result WebP и завершает usage/credit operation.

Техническая ошибка должна:

- удалить частично загруженные результаты;
- записать безопасный error code/message;
- перевести генерацию в terminal status;
- выполнить идемпотентный возврат кредитов.

### 7.5. Результаты

Успешный результат отображается на холсте отдельной карточкой. Пользователь может:

- выбрать результат;
- сравнить с исходником;
- открыть плавающий composer доработки;
- скачать JPEG;
- скрыть неуспешную карточку локально;
- удалить запись через owner-checked API там, где это предусмотрено UI.

Storage сохраняет WebP; download endpoint конвертирует его в JPEG без изменения сохранённого объекта.

## 8. Тарифы, лимиты и кредиты

### 8.1. Системные тарифы

При инициализации создаются:

| Тариф | Дневной лимит | Параллельно | Watermark | Приоритет |
| --- | ---: | ---: | --- | --- |
| FREE | 10 | 1 | Да | Нет |
| VIP | 100 | 3 | Нет | Да |

Индивидуальные `dailyLimitOverride` и `maxParallelOverride` имеют приоритет над тарифом.

### 8.2. Кредитный баланс

- стартовый grant — 10 кредитов;
- стоимость root generation — 4 кредита;
- стоимость refinement — 4 кредита;
- отрицательный баланс запрещён;
- каждое движение записывается в `CreditTransaction`;
- `CreditWallet.balance` является транзакционно обновляемой проекцией;
- повтор одного idempotency key не должен менять баланс повторно.

Виды операций: signup grant, purchase, generation debit, technical refund, cancellation refund и admin adjustment.

### 8.3. Пакеты

| Пакет | Кредиты | Цена |
| --- | ---: | ---: |
| Мини | 20 | 25 000 UZS |
| Стандарт | 60 | 69 000 UZS |
| Про | 160 | 169 000 UZS |

### 8.4. Платежи

`PaymentOrder` хранит snapshot пакета и проходит переход из `PENDING` только в один terminal status: `PAID`, `FAILED`, `CANCELLED` или `EXPIRED`.

`PaymentEvent` уникален по provider/event ID. Зачисление покупки идемпотентно.

`PAYMENT_PROVIDER=mock` разрешён только вне production и вместе с `AI_PROVIDER=fake`. Во всех остальных production-конфигурациях покупки должны оставаться отключёнными до реализации Payme/Click adapter.

## 9. Администрирование

### 9.1. Dashboard

Статистика включает общее число пользователей, активных пользователей, проектов, генераций, ошибки, очередь и дневной ряд генераций за выбранный период.

### 9.2. Пользователи

Поддерживаются:

- cursor pagination и поиск;
- просмотр профиля, тарифа, подписок и счётчиков;
- изменение роли, статуса, тарифа, VIP expiry и overrides;
- ручная кредитная корректировка;
- защита от self-lockout.

### 9.3. Генерации

Поддерживаются список, фильтр по статусу, detail и отмена допустимой задачи. Администратор не должен удалять готовые медиа или изменять snapshot генерации через эти endpoints.

### 9.4. Тарифы и финансы

Поддерживаются список/создание/изменение тарифов, просмотр payment orders и последних credit transactions.

Управление моделями, уведомлениями, глобальными настройками и audit log не входит в текущий admin scope.

## 10. API

Все ответы используют единый success/error envelope и `requestId`. Ошибки валидации не должны раскрывать stack trace или секреты.

### 10.1. Auth и профиль

```text
GET    /api/v1/auth/google
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
GET    /api/v1/profile
PATCH  /api/v1/profile
GET    /api/v1/plans
GET    /api/v1/credits
```

### 10.2. Проекты и медиа

```text
POST   /api/v1/projects
GET    /api/v1/projects
GET    /api/v1/projects/:id
PATCH  /api/v1/projects/:id
DELETE /api/v1/projects/:id
POST   /api/v1/projects/:id/duplicate
POST   /api/v1/projects/:id/source
PUT    /api/v1/projects/:id/visual-prompt
DELETE /api/v1/projects/:id/visual-prompt
POST   /api/v1/projects/:id/references
DELETE /api/v1/projects/:id/references
POST   /api/v1/projects/:id/references/from-url
PATCH  /api/v1/projects/:id/references/reorder
DELETE /api/v1/projects/:id/references/:referenceId
GET    /api/v1/media/:id/signed-url
```

### 10.3. Генерации

```text
POST   /api/v1/generations
GET    /api/v1/generations
GET    /api/v1/generations/:id
DELETE /api/v1/generations/:id
POST   /api/v1/generations/:id/retry
POST   /api/v1/generations/:id/cancel
POST   /api/v1/generations/:id/refinement-references
POST   /api/v1/generations/:id/refinements
GET    /api/v1/generations/:id/download
```

### 10.4. Платежи

```text
POST   /api/v1/payment-orders
GET    /api/v1/payment-orders/:id
POST   /api/v1/payment-orders/:id/mock-outcome
```

### 10.5. Администрирование

```text
GET    /api/v1/admin/stats
GET    /api/v1/admin/users
GET    /api/v1/admin/users/:id
PATCH  /api/v1/admin/users/:id
POST   /api/v1/admin/users/:id/credit-adjustments
GET    /api/v1/admin/generations
GET    /api/v1/admin/generations/:id
POST   /api/v1/admin/generations/:id/cancel
GET    /api/v1/admin/plans
POST   /api/v1/admin/plans
PATCH  /api/v1/admin/plans/:id
GET    /api/v1/admin/payment-orders
GET    /api/v1/admin/credit-transactions
```

## 11. Данные

### 11.1. Prisma как source of truth

Сервер не должен читать или изменять бизнес-таблицы через Supabase Data API. Prisma используется для моделей, запросов, транзакций и миграций.

Supabase SDK разрешён для:

- Auth;
- проверки токенов;
- административного создания Auth user;
- приватного Storage;
- signed URLs.

### 11.2. Текущие модели

- `Profile`;
- `Plan`;
- `Subscription`;
- `Project`;
- `MediaFile`;
- `ProjectReference`;
- `Generation`;
- `GenerationReference`;
- `UsageEvent`;
- `CreditWallet`;
- `CreditTransaction`;
- `PaymentOrder`;
- `PaymentEvent`.

Удалённые модели `AiModel`, `PlanModel`, `Notification`, `SystemSetting` и `AuditLog` не должны использоваться новым кодом без отдельной миграции и нового утверждённого решения.

### 11.3. Важные ограничения

- email и phone профиля nullable, но уникальны при наличии;
- project/generation используют soft delete;
- generation idempotency уникален в пределах пользователя;
- payment provider order и provider event уникальны;
- позиции reference уникальны внутри project/generation;
- wallet имеет ровно одну запись на пользователя.

## 12. Storage

Приватные buckets:

- `source-images`;
- `visual-prompts`;
- `reference-images`;
- `generation-originals`;
- `generation-results`;
- `branding`.

Рекомендуемая структура пути:

```text
users/{userId}/projects/{projectId}/...
users/{userId}/generations/{generationId}/...
```

Файлы не должны быть публичными. Клиент получает signed URL только после server-side owner/admin проверки.

## 13. Безопасность

Обязательные меры:

- проверка Supabase JWT на сервере;
- проверка `Profile.status` и роли;
- owner-scoped Prisma queries;
- Zod validation запросов;
- rate limiting для дорогих upload/import/admin mutations;
- проверка MIME по содержимому;
- лимиты размера и геометрии изображений;
- SSRF-защита URL importer;
- короткоживущие signed URLs;
- secrets только в server environment;
- CORS только для точного `ADMIN_ORIGIN`;
- запрет `AdminPhone` и mock payments в production;
- идемпотентность генераций, платежей, списаний и возвратов;
- отсутствие stack trace и credentials в API errors.

## 14. Окружение

Минимальные переменные:

```dotenv
NODE_ENV=development
NEXT_PUBLIC_APP_NAME=Renoa
APP_URL=http://localhost:3000
APP_TIMEZONE=Asia/Tashkent

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

DATABASE_URL=...
DIRECT_URL=...

AI_PROVIDER=fake
PAYMENT_PROVIDER=disabled
ADMIN_ORIGIN=http://localhost:5173
```

Для Vertex AI требуются `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_CLOUD_LOCATION` и credentials. Model ID может задаваться `VERTEX_IMAGE_MODEL`.

Для `admin:seed` требуются `ADMIN_PHONE_E164` и `ADMIN_PASSWORD`.

`TRIGGER_SECRET_KEY` и `SENTRY_DSN` остаются необязательными до подключения соответствующих runtime-интеграций.

## 15. Технологический стек

- Node.js 24+;
- pnpm workspace;
- Next.js 16 App Router;
- React 19;
- TypeScript;
- Tailwind CSS 4;
- shadcn/ui, Radix UI, Lucide;
- Fabric.js;
- Prisma 7 и PostgreSQL;
- Supabase Auth/Storage;
- Google Gen AI SDK / Vertex AI;
- Sharp;
- Zod;
- TanStack Query;
- отдельная админка: Vite, Mantine, React Router, Vitest.

## 16. Нефункциональные требования

### 16.1. Интерфейс

- тёмная дизайн-система Renoa;
- desktop, tablet и mobile layouts;
- keyboard-visible focus;
- touch targets не менее 44 px для основных действий;
- live regions для значимых async-статусов;
- responsive canvas без потери доступа к inspector и результатам.

Отдельная Mantine-админка в текущей версии ориентирована на desktop и не обязана повторять mobile UX основного приложения.

### 16.2. Производительность

- не загружать приватные original images без необходимости;
- использовать preview и signed URL;
- не опрашивать полное дерево генераций на каждом коротком интервале;
- применять cursor pagination к большим спискам;
- ограничивать параллельные генерации тарифом;
- не выполнять N+1-запросы для списков.

### 16.3. Надёжность

- все финансовые изменения выполняются транзакционно;
- partial Storage uploads очищаются при ошибке;
- terminal generation status не должен возвращаться в processing;
- terminal payment status не должен переходить в другой terminal status;
- retry не должен создавать двойное списание;
- неоднозначный сетевой результат сохраняет idempotency key для безопасного повтора.

## 17. Проверка и критерии готовности

Перед выпуском изменения должны проходить релевантный набор:

```bash
pnpm prisma:validate
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm admin:test
pnpm admin:typecheck
pnpm admin:build
git diff --check
```

Для миграций дополнительно:

```bash
pnpm db:migrate:deploy
pnpm db:status
```

Функциональная приёмка должна проверять:

1. Google login и сохранение сессии;
2. создание проекта и upload/replace source;
3. разметку, undo/redo/clear и reload;
4. файловые и URL-референсы;
5. root generation через fake provider;
6. success, failure, cancellation, retry и credit refund;
7. выбор результата и дочернюю refinement generation;
8. signed preview, compare и JPEG download;
9. историю, профиль и credits;
10. mock checkout только в development;
11. административную авторизацию и self-lockout protection;
12. desktop/mobile keyboard and touch behavior основного приложения.

## 18. Ближайшие отдельные проекты

Следующие задачи требуют самостоятельной спецификации перед реализацией:

1. production payment adapter Payme или Click и webhook verification;
2. production-ready authentication отдельной админ-панели;
3. новый административный audit trail;
4. observability через Sentry и/или job orchestration;
5. политика управления AI-моделями без раскрытия model ID клиенту;
6. системные уведомления, если они снова войдут в продуктовый scope;
7. эксплуатационные backup, retention и disaster recovery procedures.
