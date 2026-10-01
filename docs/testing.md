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
Миграции применяются при запуске. интеграционные тесты запускаются отдельно через `pnpm test:integration`; `pnpm docker:down` останавливает контейнеры. Локальный
Compose читает `.env` и `.env.production`; эти файлы могут указывать внешние
сервисы. Для нагрузки используйте отдельный контур ниже. Перед запуском убедитесь, что выбран
локальный Docker context.

Сборки проверяются через `pnpm build`, `pnpm admin:build` и сборку Docker worker.

В `pnpm test` включены HMAC capabilities, файловые гонки/симлинки/прерванная
загрузка, worker concurrency/drain, JWT/refresh и Google state/PKCE/nonce.
`pnpm test:ui` также проверяет HTTP refresh, отказ чужому origin
и сохранение cookies при недоступности БД. `tests/integration/native-auth.test.ts`
проверяет конкурентный signup/refresh и отсутствие повторного grant на
изолированной PostgreSQL.

### Нагрузочное тестирование генераций

Единый сценарий — `docker-compose.load.yml` и `scripts/load/`. Команды приведены в разделе изолированного нагрузочного контура ниже. Старые runners удалены, чтобы исключить запуск на неверной базе.

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

## Нагрузочный контур генераций

`docker-compose.load.yml` — отдельный проект `ruvie-load-test`, собственные volumes,
только fake и БД `ruvie_refactor_test`; `.env` приложения и Google credentials в
контейнеры не передаются. Веб-интерфейс доступен на `http://localhost:3101`.
Значения `LOAD_*` в shell управляют только этим контуром.

```bash
docker compose -f docker-compose.load.yml up -d --build web worker
LOAD_USERS=100 docker compose -f docker-compose.load.yml --profile tools run --rm seed
LOAD_USERS=20 docker compose -f docker-compose.load.yml --profile tools run --rm k6
LOAD_USERS=100 docker compose -f docker-compose.load.yml --profile tools run --rm seed
LOAD_USERS=50 docker compose -f docker-compose.load.yml --profile tools run --rm k6
LOAD_USERS=100 docker compose -f docker-compose.load.yml --profile tools run --rm seed
LOAD_USERS=100 docker compose -f docker-compose.load.yml --profile tools run --rm k6
```

Seed создаёт тестовые профили, кредиты, проекты и штатные Prisma-сессии. В API
нет тестового обхода авторизации. `users.json` содержит тестовые токены, хранится
в приватном volume и не должен попадать в Git или отчёты. Перед каждым отдельным запуском k6 создавать свежие fixtures: внутри длинного
прогона refresh-токены ротируются и старый fixture повторно использовать нельзя.
k6 обновляет сессию штатным refresh endpoint.

Сценарии провайдера задаются `LOAD_SCENARIO=delay|burst|429|timeout` перед
пересозданием worker. `normal` сохраняет прежнюю fake-генерацию; остальные режимы
доступны только при `LOAD_TEST_MODE=true`, `AI_PROVIDER=fake`, локальном APP_URL
и изолированной тестовой БД. Задержки воспроизводимо выбираются по ID задания;
`burst` возвращает ответы на ближайшей 40-секундной границе. `429` отклоняет первые
два обращения; `timeout` имитирует неоднозначную ошибку без автоматического retry.

- `LOAD_WORKER_MODE=adaptive`: проверить адаптивную отправку.
- `--scale worker=2`: проверить общий предел двух процессов.
- `LOAD_UPLOADS=true`: добавить загрузку большого исходника каждым пользователем.
- `LOAD_STEADY=true`: поток в течение 15 минут с ожиданием завершения принятых задач.
- `EXPECT_FAILURE=true`: для сценариев, где намеренно ожидаются terminal failures.

Изолированно остановить один worker во время `SENDING` и повторить после
`RAW_READY`; проверить ошибки/возвраты и отсутствие повторного AI после checkpoint.
Для ошибок инфраструктуры временно останавливать только `load-db` либо ограничивать
доступ к тестовому volume, после чего восстановить и дождаться обработки очереди.

Worker пишет JSON-события `generation_dispatch`, `generation_ai`,
`generation_processed`, `generation_throttled`, `worker_metrics`.

```bash
mkdir -p .data/load
docker compose -f docker-compose.load.yml logs --no-color worker > .data/load/worker.log
node scripts/load/report.mjs .data/load/worker.log .data/load/worker-report.json
docker compose -f docker-compose.load.yml stats --no-stream
```

k6 сохраняет `summary.json` в volume fixtures: время до результата p50/p95,
приём заданий и долю завершений. CPU в worker — накопленные микросекунды; нагрузку
за интервал считать по разности значений одного процесса. Docker stats нужен
для полной памяти контейнера, CPU и I/O. Показатели fake не являются измерением
пропускной способности Google. Платный тест требует отдельного бюджета.

После проверки остановить именно этот контур через
`docker compose -f docker-compose.load.yml down`. Удаление volumes выполняется
отдельно, только когда тестовые результаты больше не нужны.

### Полный цикл worker и финансовая сверка

На отдельной локальной тестовой БД с применёнными миграциями:

```bash
TEST_DATABASE_URL=postgresql://ruvie_test:local-test-only@127.0.0.1:55439/ruvie_refactor_test node scripts/load/run-verification.mjs
LOAD_WORKER_MODE=adaptive TEST_DATABASE_URL=postgresql://ruvie_test:local-test-only@127.0.0.1:55439/ruvie_refactor_test node scripts/load/run-verification.mjs
```

Проверка выполняет настоящий `processGeneration`, подменяя только fake-ответы и намеренные сбои. Чужие активные разрешения того же регулятора приводят к отказу запуска проверки. `scripts/load/audit.ts` сверяет terminal statuses, оставшиеся резервы, отрицательные балансы и повторные возвраты в тестовом контуре.

В каждом режиме выполняются 11 сценариев. Два из них запускают отдельный процесс worker, останавливают его через `SIGKILL` в PREPARING и RAW_READY и ждут естественного истечения аренды примерно 60 секунд. Эти ожидания входят во время проверки; даты аренды в этих сценариях не изменяются вручную.

Фактические измерения и ограничения: [отчёт по параллельным генерациям](reports/adaptive-generation-workers.md).
