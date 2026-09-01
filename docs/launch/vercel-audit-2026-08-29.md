# Ruvie — аудит Vercel

> Обновление после аудита: `PAYMENT_PROVIDER`, `VERTEX_IMAGE_VALIDATION_MODEL` и `NEXT_PUBLIC_APP_NAME` добавлены, environment variables синхронизированы и выполнен новый Production redeploy. Актуальный результат: [env-sync-2026-08-29.md](./env-sync-2026-08-29.md). Разделы ниже фиксируют состояние на момент первоначальной read-only проверки.

- Дата проверки: 29 августа 2026 года
- Режим: read-only
- Team: `madenovbegis-projects`
- Проверены проекты: `ai-interior-designer`, `ruvie-admin`
- Значения секретов в отчет не выводились

## Итог

Оба production deployment имеют статус `READY`, подключенные домены отвечают, а обязательные production-секреты основного приложения присутствуют. Критических build/runtime ошибок не обнаружено.

Vercel не является текущим блокером запуска закрытой beta, но перед новым production deployment необходимо закрыть несколько эксплуатационных рисков: явно зафиксировать отключенную оплату, решить предупреждение DNS, добавить нормальный monitoring и настроить рабочее Preview-окружение для приемки.

## 1. Основное приложение

- Project: `ai-interior-designer`
- Framework: Next.js
- Node.js: `24.x`
- Production branch: `master`
- Production commit: `bfce3ae98ad28c4b09702bda682bf5179586081a`
- Commit message: `Add guided canvas onboarding`
- Deployment: `dpl_8K6SrqABtHKeRPCpyzKU4Vk3yd5b`
- Status: `READY`
- Build duration: около 57 секунд
- Runtime region текущего deployment: `sin1`
- Fluid Compute: включен
- Hobby resources: 1 vCPU, 2 GB RAM

`vercel.json` явно задает `sin1`, поэтому выбранный в UI default `iad1` не используется текущим deployment. Регион Singapore соответствует расположению используемого Supabase pooler и уменьшает задержку запросов к базе.

### Build

Build завершился успешно. Найдены только предупреждения:

1. Prisma сообщает о доступном обновлении `7.8.0 → 7.9.1`. Это не блокер запуска.
2. `package.json` использует `engines.node = ">=24"`; Vercel предупреждает, что проект автоматически перейдет на следующий major Node.js. Перед релизом безопаснее закрепить `24.x`.

Deployment Checks не настроены. Production создается напрямую через Git integration, без обязательного прохождения `pnpm release:check` как deployment gate.

## 2. Production environment основного приложения

Все обязательные для текущего runtime переменные присутствуют и имеют scope `Production`:

- приложение и CORS: `APP_URL`, `APP_ORIGINS`, `ADMIN_ORIGINS`, `AUTH_COOKIE_DOMAIN`;
- public client config: `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN`;
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`;
- PostgreSQL: `DATABASE_URL`, `DIRECT_URL`;
- Vertex AI: `AI_PROVIDER`, `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_CLOUD_LOCATION`, `GOOGLE_APPLICATION_CREDENTIALS_JSON`, `VERTEX_IMAGE_MODEL`;
- admin auth: `ADMIN_ACCESS_CODE`, `ADMIN_TOKEN_SECRET`;
- продуктовые лимиты и `APP_TIMEZONE`.

Безопасные config-значения подтверждены:

- `AI_PROVIDER=vertex`;
- `GOOGLE_CLOUD_LOCATION=global`;
- `VERTEX_IMAGE_MODEL=gemini-3-pro-image`;
- `APP_TIMEZONE=Asia/Tashkent`;
- `MAX_PARALLEL_GENERATIONS=1`;
- `MAX_REFERENCE_IMAGES=10`;
- `MAX_REFERENCE_URLS=10`;
- `MAX_UPLOAD_SIZE_MB=15`;
- `MAX_OUTPUT_WIDTH=4096`;
- `MAX_OUTPUT_HEIGHT=4096`.

Фильтр Vercel `Needs Attention` не показывает проблемных переменных.

### Отсутствующие ключи

- `PAYMENT_PROVIDER` отсутствует. Код безопасно использует default `disabled`, а production API фактически возвращает `paymentMode: "disabled"`. Тем не менее перед следующим deployment рекомендуется добавить явное `PAYMENT_PROVIDER=disabled`.
- `VERTEX_IMAGE_VALIDATION_MODEL` отсутствует. Код использует default `gemini-2.5-flash`; это допустимо, но явная фиксация модели сделает production-конфигурацию воспроизводимой.
- `SENTRY_DSN` отсутствует. В проекте пока нет реализации Sentry, поэтому одного env недостаточно; monitoring остается отдельной задачей.
- `TRIGGER_SECRET_KEY` отсутствует. Интеграция Trigger.dev в текущем коде не используется.

Shared Variables к проекту не подключены. Все найденные переменные имеют только scope `Production`; полноценная Preview/Development-конфигурация отсутствует. Это мешает безопасно проводить E2E на preview до promotion в production.

## 3. Админка

- Project: `ruvie-admin`
- Framework: Vite
- Root Directory: `admin`
- Build Command: `pnpm build`
- Install Command: `pnpm install --frozen-lockfile`
- Output Directory: `dist`
- Node.js: `24.x`
- Production commit совпадает с основным приложением: `bfce3ae98ad28c4b09702bda682bf5179586081a`
- Deployment: `dpl_GhJC4gFXuVqKnS6ynMM6SWBf56js`
- Status: `READY`
- Build duration: около 32 секунд

В production присутствует единственная требуемая переменная `VITE_API_BASE_URL`. Собранный JavaScript указывает на `https://api.ruvie.cc`. Shared Variables не подключены, `Needs Attention` пуст.

В сборке присутствует строка `localhost` из внутреннего browser-environment кода HTTP-библиотеки; это не dev API endpoint и не ошибка конфигурации.

## 4. Домены и DNS

Проверены:

- `https://ruvie.cc` → HTTP 200;
- `https://www.ruvie.cc` → HTTP 308 на `https://ruvie.cc`;
- `https://api.ruvie.cc` → HTTP 200;
- `https://admin.ruvie.cc` → HTTP 200.

Настройки маршрутизации корректны:

- `ruvie.cc` подключен к Production;
- `api.ruvie.cc` подключен к Production;
- `admin.ruvie.cc` подключен к Production проекта `ruvie-admin`;
- `www.ruvie.cc` использует permanent redirect `308` на `ruvie.cc`.

Vercel CDN активен. Managed SSL-сертификаты присутствуют, HSTS включен.

DNS обслуживается сторонними nameservers:

- `byte.dns-parking.com`;
- `pixel.dns-parking.com`.

Текущие A-records ведут на `76.76.21.21`. Vercel помечает `ruvie.cc`, `www.ruvie.cc`, `api.ruvie.cc` и `admin.ruvie.cc` как `DNS Change Recommended`. Сейчас домены работают, поэтому это не авария и не блокер beta. Перед изменением записей нужно открыть рекомендованную конфигурацию Vercel и синхронно обновить записи у текущего DNS-провайдера; менять nameservers вслепую нельзя.

## 5. Runtime и API

Проверено без авторизации:

- `/api/v1/auth/me` → ожидаемый HTTP 401;
- `/api/v1/admin/session` → ожидаемый HTTP 401;
- `/api/v1/credits/packages` → HTTP 200 и `paymentMode: "disabled"`.

Security headers основного приложения включают CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` и `Cross-Origin-Opener-Policy`.

Админка отдает HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` и `Permissions-Policy`, но отдельный CSP и `Cross-Origin-Opener-Policy` для нее не настроены. Это рекомендуется добавить до широкого использования админки.

За последний доступный час production runtime не показал 5xx, `error` или `fatal`. Агрегированный Vercel отчет показывает одно предупреждение PostgreSQL-драйвера:

```text
Calling client.query() when the client is already executing a query is deprecated
```

- 11 событий;
- 5 пользователей;
- маршруты `/api/v1/projects/[id]/workspace` и `/api/v1/generations`;
- последнее событие: 26 августа 2026 года.

Это не текущая поломка, но код нужно подготовить до перехода на `pg@9`.

У проекта Hobby доступ к детальным runtime-логам ограничен примерно одним часом. Sentry или другой внешний error monitoring не подключен — это реальный операционный риск beta.

## 6. Deployment protection и хранение

- Standard Vercel Authentication включена для pre-production deployments.
- Production custom domains остаются публичными и успешно отвечают.
- Protected Sourcemaps включены в обоих проектах.
- Automation bypass secret существует в обоих проектах; значения не раскрывались.
- Password Protection недоступна на текущем тарифе.
- Rolling Releases отключены.
- Deployment retention: 30 дней для production, preview, canceled и errored deployments.
- Data Preferences `Improve models with this project's data` для основного проекта выключена.

## 7. Что сделать перед следующим production deployment

### P0

1. Добавить `PAYMENT_PROVIDER=disabled` в Production явно.
2. Добавить `VERTEX_IMAGE_VALIDATION_MODEL=gemini-2.5-flash` явно либо утвердить другой доступный validation model.
3. Закрепить Node.js в `package.json` как `24.x`.
4. Закоммитить текущие локальные launch/security изменения: deployed commit совпадает с `HEAD`, но рабочее дерево содержит незакоммиченные изменения.
5. Запустить `pnpm release:check`, создать новый deployment и выполнить post-deploy smoke/E2E.

### P1

1. Настроить Preview environment без использования production database/service-role secrets либо создать отдельный staging stack.
2. Добавить CI/deployment gate, который блокирует production при падении тестов и сборок.
3. Подключить внешний monitoring и alerts.
4. Добавить CSP и COOP для `admin.ruvie.cc`.
5. Исследовать и устранить предупреждение `pg`.
6. Выполнить рекомендованное Vercel обновление DNS без простоя.

## Решение

Vercel-инфраструктура готова к продолжению release-процесса. Решение всего проекта остается `NO-GO` до нового deployment текущих изменений и успешной end-to-end приемки Google OAuth, Vertex-генерации, кредитов, приватного Storage и админки.
