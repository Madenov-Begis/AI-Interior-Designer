# Стратегия тестирования Ruvie

## 1. Принцип

Проверка должна быть пропорциональна риску. Локальная правка текста не требует полной production-сборки, а изменение auth, credits, payments, generations, Prisma или маршрутизации требует более широкого набора.

Codex не должен объявлять задачу завершённой только потому, что код компилируется. Нужно проверить изменённое поведение на подходящем уровне.

## 2. Уровни тестирования

### Чистая бизнес-логика

Файлы `*.test.ts` запускаются через Node test runner:

```bash
pnpm test
```

Подходит для:

- policies и state transitions;
- validation helpers;
- naming и presentation;
- idempotency;
- retry/refund;
- prompt construction;
- server operations с тестовыми adapters.

### React и UI-модели

Файлы `*.test.tsx` запускаются через Vitest и jsdom:

```bash
pnpm test:ui
```

Подходит для:

- пользовательских действий;
- loading/error/disabled states;
- focus и keyboard behavior;
- query/mutation lifecycle;
- сохранения browser drafts;
- UI regression без реального браузера.

### Админ-панель

```bash
pnpm admin:test
pnpm admin:server:test
pnpm admin:typecheck
pnpm admin:build
```

- `admin:test` проверяет React UI и shared helpers;
- `admin:server:test` проверяет серверные административные policies/services;
- typecheck/build проверяют границы отдельного Vite-приложения.

### Интеграционные тесты

```bash
TEST_DATABASE_URL=postgresql://…/ruvie_refactor_test pnpm test:integration
```

Используй отдельную PostgreSQL database. Не направляй integration tests на development или production database.

Интеграционные тесты нужны для конкурентных транзакций, credit reservation/refund и ограничений, которые нельзя достоверно проверить mock-объектом.

### Локальный Docker-контур

`pnpm docker:up` собирает и запускает сайт, админку, worker и пустую PostgreSQL.
Миграции применяются при запуске. `pnpm docker:test` дополнительно выполняет
интеграционные тесты; `pnpm docker:down` останавливает контейнеры. Локальный
Compose берёт из `.env.local` только OAuth Client ID и Secret; остальные
локальные настройки заданы в Compose. Перед запуском убедитесь, что выбран
локальный Docker context.

`pnpm build:preview` проверяет standalone, admin и worker с фиктивными
credentials и локальными URL.

В `pnpm test` включены HMAC capabilities, файловые гонки/симлинки/прерванная
загрузка, worker concurrency/drain, JWT/refresh и Google state/PKCE/nonce.
`pnpm test:ui` также проверяет HTTP refresh, отказ чужому origin
и сохранение cookies при недоступности БД. `tests/integration/native-auth.test.ts`
проверяет конкурентный signup/refresh и отсутствие повторного grant на
изолированной PostgreSQL.

### Browser-проверка

Нужна для:

- нового или заметно изменённого экрана;
- responsive;
- canvas/pointer/zoom;
- dialog/focus;
- upload/download;
- маршрутизации и auth redirect;
- критического end-to-end сценария.

Минимальные viewport: 375×812, 768×900 и 1440×900.

Проверяй:

- отсутствие horizontal overflow;
- доступность главного действия;
- loading/error/empty/success;
- keyboard focus и Escape;
- touch targets;
- отсутствие ошибок console;
- корректный network request и response.

## 3. Матрица минимальных проверок

| Изменение                 | Минимум                                                            |
| ------------------------- | ------------------------------------------------------------------ |
| Только Markdown           | Prettier для изменённых файлов, `git diff --check`                 |
| Чистая TypeScript-функция | Релевантный test, `pnpm typecheck`                                 |
| React-компонент           | Релевантный UI-test, `pnpm test:ui`, typecheck                     |
| CSS/responsive            | typecheck, lint, browser-проверка затронутых viewport              |
| API Route Handler         | server test, typecheck, lint; build при изменении маршрута/границы |
| Auth/security             | позитивный и негативный тест, typecheck, lint, build               |
| Credits/payments          | unit + integration для транзакций и идемпотентности                |
| Generations               | reservation, success/failure/refund/retry/cancel tests             |
| Prisma schema/migration   | `prisma:validate`, migration на test database, integration tests   |
| Admin UI                  | admin test, typecheck, build                                       |
| Релиз                     | `pnpm release:check` и внешние smoke/runbook проверки              |

## 4. Обязательные негативные сценарии

Для защищённой операции проверь, где применимо:

- отсутствующая сессия;
- заблокированный/удалённый профиль;
- чужой ресурс;
- malformed JSON;
- schema validation;
- повтор idempotency key;
- недостаточный баланс;
- конфликт состояния;
- rate limit;
- частичная ошибка Storage;
- потеря/повтор HTTP-ответа;
- временная недоступность внешнего provider.

## 5. Полная проверка

```bash
pnpm release:check
```

Команда включает legal check, Prisma validation, основные и UI-тесты, typecheck, lint, production build, admin tests/build и `git diff --check`.

Она может требовать доступной базы. Если внешний prerequisite отсутствует, сообщи конкретно, какой шаг не выполнен; не называй весь релиз проверенным.

## 6. Правила тестов

- Тестируй наблюдаемое поведение и доменный инвариант, а не внутренний порядок вызовов без необходимости.
- Для найденного бага сначала создай воспроизведение или тест, который падает по правильной причине.
- Не ослабляй assertion, чтобы скрыть регрессию.
- Не удаляй существующий тест без объяснения изменившегося требования.
- Не используй production secrets и реальные платежи.
- Время, UUID, provider и Storage подменяй детерминированными adapters, если тест не является интеграционным.
- После изменения test fixtures проверь, что они не содержат персональные данные или secrets.

## 7. Отчёт Codex о проверке

Финальный ответ должен разделять:

- проверки, которые реально запущены и прошли;
- проверки, которые не запускались;
- проверки, заблокированные окружением;
- ручную browser-проверку;
- оставшиеся риски.

Нельзя писать «всё проверено», если запускался только typecheck.
