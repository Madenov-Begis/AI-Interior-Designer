# AI Interior Designer — дизайн полной платформы

## 1. Цель и границы

Создать русскоязычный адаптивный веб-сервис, который принимает фотографию помещения, визуальную разметку, изображения-референсы и текстовую инструкцию, а затем через Google Vertex AI создаёт фотореалистичный редизайн с сохранением ракурса, геометрии и архитектурных элементов.

Первая версия реализует полное ТЗ: публичный сайт, Google OAuth, пользовательский кабинет, редактор Visual Prompting, загрузку файлов и URL-референсов, фоновые AI-генерации, лимиты и тарифы, историю, сравнение и скачивание результатов, VIP-возможности, административную панель, аудит и мониторинг. JavaScript-heavy scraping изолируется как расширение URL-импорта и не блокирует основной поток прямых ссылок и metadata extraction.

Визуальное направление первой темы основано на согласованном референсе Aidentika: тёмный графитовый интерфейс с сеткой, крупной наклонной типографикой и лаймовым акцентом. Бренд, тексты и композиция не копируются. Все цвета, шрифты, радиусы и тени оформляются семантическими design tokens, чтобы тему можно было заменить без изменения продуктовой логики.

## 2. Архитектура и модули

### Web-приложение

- Next.js App Router, React, TypeScript, Tailwind CSS и shadcn/ui.
- Server Components используются для первичной загрузки и защищённых страниц; Client Components — для редактора, форм, drag-and-drop, before/after и live-статусов.
- Route Handlers предоставляют версионированный REST API `/api/v1/*`; все ответы имеют единый envelope, `requestId` и типизированные коды ошибок.
- React Hook Form и Zod отвечают за клиентскую форму; сервер повторно валидирует каждый вход и никогда не принимает от клиента роль, тариф, владельца или остаток лимита как доверенные данные.

### Данные, авторизация и файлы

- Supabase Auth поддерживает только Google OAuth через HTTP-only cookies. Callback создаёт или обновляет `Profile`; middleware защищает `/app/*` и `/admin/*`, а каждый API-обработчик заново проверяет сессию и права.
- Prisma работает с Supabase PostgreSQL через runtime `DATABASE_URL` и migration `DIRECT_URL`; бизнес-операции оформляются сервисами и транзакциями.
- База содержит профили, тарифы, подписки, проекты, файлы, проектные и generation snapshots референсов, модели, генерации, usage reservations, уведомления, системные настройки и audit log. Схема из ТЗ дополняется явными связями файлов результата, idempotency key, job ID, временными override лимитов и индексами для cursor pagination.
- Приватные Supabase Storage buckets разделяют источники, разметку, референсы, оригинальные результаты, пользовательские результаты и branding. Постоянные публичные URL не хранятся; API выдаёт короткоживущие signed URLs после проверки владельца.
- RLS включается для пользовательских таблиц как дополнительная защита. Обычный запрос Prisma выполняется сервером, административные операции используют отдельный защищённый контекст и всегда пишут audit log.

### Фоновые задачи и AI

- Trigger.dev используется локально и в будущей hosted-среде для generation jobs, retries, concurrency и наблюдаемости.
- `POST /api/v1/generations` в одной транзакции проверяет вход, блокировку, владение, модель, тариф, лимит и idempotency key; резервирует usage, создаёт `Generation(QUEUED)` и запускает задачу.
- Worker атомарно переводит задачу в `PROCESSING`, загружает приватные файлы, подготавливает prompt и вызывает `ImageGenerationProvider`. Первая реализация — `VertexGeminiImageProvider`; внешние model IDs доступны только через активные записи `AiModel`.
- Временные ошибки повторяются до трёх раз с exponential backoff. Safety rejection и ошибки конфигурации не повторяются. Успех сохраняет оригинальный результат и пользовательскую версию; технический финальный сбой автоматически возвращает reservation.
- Статус доступен через polling TanStack Query с адаптивным интервалом. Слой API не зависит от конкретного будущего механизма push-обновлений.

### Обработка изображений и URL

- Сервер проверяет сигнатуру, MIME, размер, декодирование и размеры; нормализует EXIF orientation, RGB, metadata, preview и checksum. Оригинал не перезаписывается.
- Visual Prompting реализуется на Fabric.js: объекты хранятся в координатах исходного изображения, отдельно сохраняются canvas JSON и flattened overlay. Поддерживаются мышь, touch, undo/redo и восстановление оригинала.
- URL importer разрешает только HTTP(S), проверяет DNS/IP до запроса и после каждого redirect, блокирует приватные, loopback, link-local и metadata ranges, ограничивает redirects, timeout и размер потока. Сначала обрабатываются прямые изображения, затем `og:image`, `twitter:image`, JSON-LD и безопасный fallback.
- Для страниц, требующих JavaScript, предусмотрен отдельный browser worker с теми же сетевыми ограничениями. Его отказ возвращает понятную ошибку конкретной ссылки и не влияет на уже успешно импортированные референсы.

## 3. Пользовательские потоки и интерфейсы

### Основной поток

1. Гость видит лендинг, примеры, тарифы и входит через Google.
2. Callback создаёт профиль с обычным тарифом и перенаправляет в `/app`.
3. Пользователь создаёт проект, загружает одну комнату, при необходимости рисует разметку, добавляет и сортирует файловые/URL-референсы, вводит prompt и выбирает разрешённую модель и aspect ratio.
4. API резервирует дневное использование и возвращает `Generation` со статусом `QUEUED`.
5. Экран проекта показывает прогресс, затем оригинал и пользовательский результат, before/after, действия скачать, повторить, создать вариант и перейти в историю.
6. Обычный тариф получает результат с водяным знаком; VIP получает возможности, рассчитанные из активной подписки и настроек тарифа.

### Публичные REST-интерфейсы

- Auth/profile: Google redirect и callback, logout, `GET/PATCH /api/v1/profile`, `GET /api/v1/profile/usage`.
- Projects: list/create/read/update/delete/copy, загрузка source и visual prompt, reference upload/import/reorder/delete.
- Generations: create, read status/result, list history, retry-as-new, cancel when still cancellable, signed download.
- Config: активные модели, aspect ratios, effective plan limits и активное уведомление.
- Admin: dashboard, users, subscriptions/limits, projects/generations/errors, models/plans, notifications, watermark/system settings и refunds.
- Мутации используют Zod, RBAC/ownership, rate limit и idempotency там, где повтор может создать ресурс или списание.

### Состояния и ошибки

- UI показывает empty, loading/skeleton, uploading/progress, queued, processing, success, rejected, failed, offline/retry и forbidden states.
- Частичный URL-импорт возвращает результат по каждой ссылке, не откатывая успешные файлы.
- Удаление проекта является soft delete и запускает отложенную очистку Storage; активную генерацию удалить нельзя без предварительной отмены или завершения.
- Истёкший VIP определяется на сервере по `endsAt`; клиент всегда получает уже вычисленные effective capabilities.
- Смена календарного дня для лимитов использует настраиваемый timezone приложения и сохранённую `usageDate`, а не локальные часы браузера.

## 4. Безопасность, эксплуатация и локальный запуск

- Секреты Vertex AI, Supabase service role, database и Trigger.dev доступны только серверным модулям. Репозиторий содержит только `.env.example` с проверяемой серверной env-схемой.
- CSP, secure cookies, CSRF-защита OAuth state, sanitization уведомлений, rate limiting, upload quotas и безопасные signed URLs обязательны до production.
- Structured logs содержат `requestId`, `userId`/`generationId` при наличии, этап, длительность и классифицированную ошибку; бинарные данные, токены и credentials не логируются.
- Sentry/OpenTelemetry подключаются через адаптеры и могут быть отключены локально. Метрики покрывают очередь, latency, success/rejection/failure, retries, refunds и estimated AI cost.
- Локальный запуск использует Next.js, Trigger.dev dev worker и Supabase local stack либо удалённый dev project. Реальная Vertex AI интеграция включается credentials; для тестов и разработки предусмотрен детерминированный fake provider.
- Будущий деплой не зашивается в бизнес-логику: web/API, generation worker и browser worker масштабируются независимо.

## 5. Проверка и критерии готовности

- Unit tests: Zod schemas, plan capability resolver, usage reservation/refund, prompt builder, provider error classification, image rules, SSRF/IP checks, watermark rules и authorization policies.
- Integration tests: Prisma transactions, RLS policies, storage ownership, OAuth profile upsert, idempotent generation creation, worker retries, result persistence, automatic refund и admin audit events.
- API contract tests: success/error envelopes, cursor pagination, ownership/role denial, validation, rate limits и signed download authorization.
- Component tests: пошаговая форма, reference ordering, canvas undo/redo and coordinate scaling, status polling, before/after и destructive confirmations.
- End-to-end: Google-auth test fixture, полный happy path с fake provider, normal/VIP watermark behavior, daily limit exhaustion/reset, safety rejection, technical refund, чужой project/file denial, admin management и mobile layout от 320 px.
- Production acceptance выполняется по всем 36 критериям исходного ТЗ; каждый критерий связывается минимум с одним автоматическим или документированным ручным тестом.

## 6. Порядок поставки

Реализация идёт последовательными вертикальными этапами внутри полной платформы:

1. Основа проекта, дизайн-система, локальная инфраструктура, Prisma schema и тестовый каркас.
2. Google Auth, профиль, планы/лимиты и защищённый shell кабинета.
3. Проекты, безопасная загрузка изображений, Storage и Visual Prompting.
4. Файловые и URL-референсы, включая SSRF-защиту и отдельный browser worker contract.
5. Generation API, Trigger.dev workflow, Vertex provider, usage reservation/refund и статусы.
6. Результат, watermark, before/after, download, история, copy/retry/delete.
7. Админка, конфигурация моделей/тарифов/уведомлений, аудит и статистика.
8. Hardening: RLS, rate limits, CSP, observability, accessibility, responsive E2E и production runbook.

Каждый этап завершается миграциями, тестами и работающим пользовательским срезом; внешние credentials не блокируют разработку благодаря fake provider и локальным fixtures.

## 7. Принятые решения

- Реализуется полное ТЗ, а не сокращённый MVP.
- Первый целевой контур — локальная разработка; production hosting будет выбран позднее.
- Фоновые генерации выполняются через Trigger.dev.
- Интерфейс временно следует согласованному направлению Aidentika, но оформляется сменной темой.
- Русский язык является единственным языком первой версии.
- Stripe/самостоятельная покупка VIP не входит в текущее ТЗ: администратор управляет тарифом и ссылкой на внешнюю покупку; платёжная интеграция может быть отдельным проектом.
- Browser worker реализуется как изолированный дополнительный сервис после надёжного прямого/metadata URL importer.
