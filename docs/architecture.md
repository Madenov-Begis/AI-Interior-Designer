# Архитектура Ruvie

## 1. Назначение документа

Документ фиксирует границы модулей, направление зависимостей и правила размещения нового кода. Пользовательское поведение и бизнес-сценарии описаны отдельно в [`full-product-documentation.md`](full-product-documentation.md).

## 2. Контуры приложения

```text
Браузер пользователя
  → Next.js frontend (`src/client` через `src/app`)
  → HTTP API (`src/app/api/v1`)
  → бизнес-сервисы (`src/server/features`)
  → Prisma
  → PostgreSQL

                         ↘ Supabase Auth
                         ↘ Supabase Storage
                         ↘ Google Vertex AI / fake provider

Браузер администратора
  → Vite admin frontend (`admin/src`)
  → Admin HTTP API (`src/app/api/v1/admin`)
  → admin-сервисы (`src/server/features/admin`)
  → Prisma / приватный Storage
```

## 3. Пользовательский frontend

`src/client` организован по функциональным зонам:

- `_pages` — композиция законченных страниц;
- `widgets` — крупные общие блоки страниц;
- `features` — пользовательские действия и их состояние;
- `entities` — типы и представление доменных сущностей;
- `shared` — API-клиент, UI primitives, конфигурация и общие библиотеки.

Правила:

- страница не обращается к Prisma или server-модулям;
- server state загружается и инвалидируется через TanStack Query;
- HTTP-вызовы проходят через общий API-клиент;
- общий UI размещается в `shared/components`, а бизнес-композиция — в feature/page/widget;
- сложное локальное состояние хранится рядом с feature, которая им владеет;
- приватные media загружаются через owner-checked signed URL.

## 4. Next.js routing layer

`src/app` должен оставаться тонким:

- `page.tsx` подключает страницу из `src/client`;
- `layout.tsx` подключает оболочку и providers;
- Route Handler проверяет запрос и передаёт управление серверному сервису;
- глобальные metadata, error boundary и CSS допустимы в `src/app`.

Не размещай крупную бизнес-логику непосредственно в `page.tsx` или `route.ts`.

## 5. Backend

`src/server` содержит:

- `features` — auth, projects, rooms, visual prompt, references, generations, credits, payments и admin;
- `shared` — Prisma, конфигурацию, security, telemetry, интеграции и API primitives.

Обычный серверный поток:

```text
Route Handler
  → auth и origin policy
  → разбор body/query/params
  → Zod validation
  → service/operation
  → Prisma transaction и внешние интеграции
  → DTO
  → единый success/error response с requestId
```

Бизнес-инварианты должны находиться в service/operation/policy, чтобы их можно было тестировать без React и HTTP.

## 6. Данные

Prisma является единственным слоем чтения и записи бизнес-таблиц. Supabase Data API не используется для серверной бизнес-логики.

Основные группы данных:

- identity: `Profile`, `LegalAcceptance`;
- project: `Project`, `ProjectReference`, `MediaFile`;
- generation: `Generation`, `GenerationReference`, `RoomType`;
- credits: `CreditWallet`, `CreditTransaction`, `UsageEvent`;
- payments: `CreditPackage`, `PaymentOrder`, `PaymentEvent`;
- infrastructure: `RateLimitBucket`, `StorageUpload`, `StorageDeletion`.

Правила изменения схемы:

1. Измени `prisma/schema.prisma`.
2. Создай новую migration.
3. Обнови operations и DTO.
4. Добавь тесты ограничений и переходов состояния.
5. Обнови продуктовую документацию.
6. Проверь `pnpm prisma:validate` и статус migration на целевой среде.

Не переписывай уже применённую migration для нового поведения.

## 7. Авторизация

Пользовательская сессия:

- Google OAuth через Supabase;
- access token передаётся как Bearer;
- refresh token хранится в HttpOnly cookie;
- backend проверяет JWT, профиль и статус;
- owner scope проверяется в каждом сервисе.

Административная сессия независима от пользовательского UI:

- единый access code проверяется только backend;
- frontend получает подписанный admin-token;
- `/admin/session` повторно проверяет роль и статус;
- dev-вход по `AdminPhone` запрещён в production.

## 8. Генерации и асинхронная работа

Создание генерации отделено от выполнения:

1. reservation transaction создаёт snapshot, usage reserve и debit;
2. worker атомарно захватывает `QUEUED`;
3. provider создаёт изображение;
4. результат сохраняется в приватный Storage;
5. usage становится `CONSUMED` или выполняется refund.

Идемпотентность обязательна для root generation, retry, refinement, purchase, refund и admin credit adjustment.

Terminal states неизменяемы. Не создавай переходы из `SUCCEEDED`, `FAILED`, `REJECTED` или `CANCELLED` обратно в `PROCESSING`.

## 9. Storage

Большие файлы загружаются через временную staging-запись. Сервер проверяет владельца, target, expiry, MIME, размер и фактическое содержимое до переноса в постоянный приватный bucket.

Удаление Storage должно быть повторяемым:

- подтверждённое неудачное удаление записывается в `StorageDeletion`;
- maintenance использует lease и backoff;
- отсутствие объекта при повторе считается безопасным успехом;
- signed URL не хранится как постоянная ссылка.

## 10. Админ-панель

`admin` — самостоятельное Vite-приложение:

- собственный router и providers;
- Mantine design system;
- собственный API-клиент;
- отдельный build/deploy;
- общий backend с основным приложением.

Admin UI не должен импортировать пользовательские React-компоненты. Общность бизнес-правил обеспечивается сервером и контрактами API, а не общим frontend runtime.

## 11. Направление зависимостей

Разрешено:

```text
src/app → src/client
src/app/api → src/server
src/client/pages → widgets/features/entities/shared
src/client/features → entities/shared
src/server/features → src/server/shared
admin/pages → admin/shared
```

Запрещено:

```text
src/client → src/server
src/client → src/generated
src/server → src/client
src/server → React UI
admin/src → src/client runtime
```

ESLint уже проверяет ключевые границы. Новое исключение из архитектурного правила требует отдельного обоснования, а не локального отключения lint.

## 12. Критерии архитектурной готовности

Изменение считается архитектурно готовым, когда:

- код размещён в правильной зоне;
- источник истины не продублирован;
- ownership и auth проверены на сервере;
- финансовые и асинхронные операции идемпотентны;
- DTO не раскрывает внутренние поля;
- ошибки имеют безопасные code/message;
- тесты покрывают главный успех и критические отказы;
- документация соответствует фактическому поведению.
