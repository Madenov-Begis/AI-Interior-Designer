# Руководство по развёртыванию Ruvie в Docker

Документ описывает универсальное развёртывание проекта на любом сервере/VPS или локальной машине с помощью стандартного Docker Compose.

---

## Архитектура контейнеров

Вся система запускается через корневой [docker-compose.yml](file:///Users/macbookpro/Documents/AI%20Interior%20Designer/docker-compose.yml) и единый multi-stage [Dockerfile](file:///Users/macbookpro/Documents/AI%20Interior%20Designer/Dockerfile):

1. **`postgres`** — база данных PostgreSQL 17 (Alpine). Данные сохраняются в Docker volume `postgres_data`.
2. **`migrate`** — одноразовый контейнер, применяющий миграции Prisma (`prisma migrate deploy`) перед стартом сервисов.
3. **`web`** — основное приложение Next.js (standalone) на порту `3000`.
4. **`worker`** — фоновый процесс обработки очередей AI-генераций (собирается с помощью esbuild в `dist/worker.mjs`, запускается как автономный сервис с healthcheck по heartbeat `scripts/worker-health.mjs` и `stop_grace_period: 240s`).
5. **`admin`** — панель администратора (статическая сборка SPA на базе Nginx Alpine) на порту `8080`.
6. **`media_data`** — общий Docker volume для постоянного хранения загруженных и сгенерированных медиафайлов.

---

## Быстрый старт (запуск в одну команду)

### 1. Подготовка окружения

1. Склонируйте репозиторий на сервер или локальную машину:
   ```bash
   git clone <repo-url>
   cd "AI Interior Designer"
   ```

2. Создайте файл `.env` на основе шаблона:
   ```bash
   cp .env.example .env
   ```

3. Сгенерируйте криптостойкие секреты:
   ```bash
   pnpm env:secrets .env
   ```
   *(Или запустите `node scripts/generate-secrets.mjs .env`)*

4. Укажите в `.env` ваши реальные ключи:
   - `GOOGLE_OAUTH_CLIENT_ID` и `GOOGLE_OAUTH_CLIENT_SECRET` (для авторизации)
   - При необходимости продакшен AI: `AI_PROVIDER=vertex` и `GOOGLE_APPLICATION_CREDENTIALS_JSON`

### 2. Запуск контейнеров

```bash
docker compose up -d --build
```
или через pnpm:
```bash
pnpm docker:up
```

Docker автоматически:
- соберёт нужные образы;
- запустит PostgreSQL и дождётся её готовности (healthcheck);
- накатит все миграции Prisma и заполнит базовые каталоги комнат и кредитных пакетов (`scripts/seed-catalogs.ts`);
- запустит веб-приложение, фонового воркера и админку.

Для ручного повторного заполнения каталогов (идемпотентно):
```bash
pnpm db:seed
```

Для создания первого профиля администратора (при необходимости):
```bash
pnpm admin:seed
```

---

## Проверка работоспособности

- **Основной сайт**: `http://localhost:3000`
- **Healthcheck**: `curl http://localhost:3000/api/health/ready` (возвращает `{"status":"ready", ...}`)
- **Админ-панель**: `http://localhost:8080`

Просмотр логов:
```bash
docker compose logs -f
# или отдельно для веб/воркера:
docker compose logs -f web
docker compose logs -f worker
```

Остановка контейнеров:
```bash
docker compose down
```

---

## Публикация в продакшене (SSL и домены)

Для продакшена рекомендуется использовать обратный прокси на хосте (Nginx, Caddy, Traefik или Cloudflare Tunnel):
- **Сайт (`https://yourdomain.com`)** -> проксирует на `http://127.0.0.1:3000`
- **Админка (`https://admin.yourdomain.com`)** -> проксирует на `http://127.0.0.1:8080`

В `.env` для продакшена укажите:
```env
APP_URL=https://yourdomain.com
APP_ORIGINS=https://yourdomain.com
ADMIN_ORIGINS=https://admin.yourdomain.com
STORAGE_PUBLIC_ORIGIN=https://yourdomain.com
NEXT_PUBLIC_API_BASE_URL=https://yourdomain.com
GOOGLE_OAUTH_CALLBACK_URL=https://yourdomain.com/auth/callback
```

---

## Автоматическое развёртывание `master`

Workflow `Quality` проверяет pull request и каждый push в `master`. После успешных проверок workflow `Deploy production` отправляет SHA проверенного коммита на VPS через отдельный SSH-ключ. Ключ может запустить только установленный на сервере скрипт `/usr/local/sbin/ruvie-deploy`; другие SSH-команды для него запрещены.

Скрипт из `scripts/deploy-production.sh` проверяет, что SHA всё ещё является вершиной `master`, собирает Docker-образы, останавливает `worker` и `web`, сохраняет дамп PostgreSQL и архив `media_data`, применяет миграции и запускает контейнеры. После запуска он проверяет сайт, админку и состояние worker. Одновременные развёртывания блокируются.

Для workflow нужны GitHub Actions secrets `RUVIE_DEPLOY_SSH_KEY` и `RUVIE_DEPLOY_KNOWN_HOSTS`. Сам скрипт устанавливается на VPS от root и не обновляется автоматически из репозитория. При ошибке после начала миграций автоматический откат не выполняется: нужно проверить логи и состояние базы перед восстановлением предыдущей версии. Преддеплойные копии пока лежат на том же VPS; они не заменяют внешнее резервное хранение.

---

## Настройка Google Cloud (Vertex AI и Google OAuth)

### 1. Боевой проект Google Cloud
- **Project ID**: `project-2b9ed972-97d2-4024-984`
- **Project Number**: `1043684318287`
- **Location**: `global`
- **Service Account**: `ruvie-vertex@project-2b9ed972-97d2-4024-984.iam.gserviceaccount.com`

### 2. Защита организации (Organization Policy) и ключ сервисного аккаунта
В организации Google Cloud активна политика безопасности:
`constraints/iam.disableServiceAccountKeyCreation` (запрет создания постоянных JSON-ключей).

#### Рекомендуемый вариант для продакшена (бессрочный сервисный ключ):
Для полной автономности production-сервера необходимо точечно снять запрет только для этого проекта:
1. Перейдите в [Google Cloud Console — Organization Policies](https://console.cloud.google.com/iam-admin/orgpolicies?project=project-2b9ed972-97d2-4024-984).
2. Найдите политику: **Disable service account key creation** (`constraints/iam.disableServiceAccountKeyCreation`).
3. Нажмите **Edit policy** → выберите **Override parent's policy**.
4. В правилах переключите **Enforcement: OFF** (Отключить запрет для данного проекта) и сохраните.
5. Перейдите в [IAM & Admin — Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts?project=project-2b9ed972-97d2-4024-984).
6. Выберите сервисный аккаунт `ruvie-vertex` → вкладка **Keys** → **Add Key** → **Create new key** (JSON).
7. Скачанный JSON-файл разместите на сервере как `service-account.json` (примонтирован в Docker как `/app/service-account.json:ro`) либо передайте его содержимое одной строкой в `.env` переменной `GOOGLE_APPLICATION_CREDENTIALS_JSON`.

Если используете файл `service-account.json`, он должен читаться процессами `web` и `worker`, которые работают в контейнерах от пользователя `node` (UID 1000). На Linux-сервере задайте владельца и права перед запуском или после замены файла:

```bash
sudo chown 1000:1000 service-account.json
sudo chmod 600 service-account.json
```

Иначе проверка загружаемой фотографии и AI-генерация завершатся ошибкой доступа к файлу (`EACCES`). Не помещайте этот файл в Git.

*Преимущество:* Ключ бессрочный, никогда не протухает и не зависит от личных учётных записей.

#### Временный вариант (ADC / User Refresh Token):
Локально или временно авторизация может работать через Application Default Credentials (`~/.config/gcloud/application_default_credentials.json`), полученный через `gcloud auth application-default login`.
*Эксплуатационный риск:* Токен привязан к личному Google-аккаунту. При смене пароля, сбросе 2FA или выходе со всех устройств токен отзывается, и потребуется повторная авторизация.

### 3. Настройка Google OAuth 2.0 (вход пользователей)
Для входа пользователей без Supabase в проекте `project-2b9ed972-97d2-4024-984`:
1. Откройте [Google Cloud Console — Credentials](https://console.cloud.google.com/apis/credentials?project=project-2b9ed972-97d2-4024-984).
2. В **OAuth consent screen** настройте тип **External**, приложение **Ruvie**, scopes: `email`, `profile`, `openid`.
3. Создайте **OAuth client ID** (Web application):
   - **Authorized JavaScript origins**:
     - `http://localhost:3000`
     - `https://ruvie.cc`
   - **Authorized redirect URIs**:
     - `http://localhost:3000/auth/callback`
     - `https://ruvie.cc/auth/callback`
4. Полученные `Client ID` и `Client Secret` укажите в `.env`:
   ```env
   GOOGLE_OAUTH_CLIENT_ID=1043684318287-...apps.googleusercontent.com
   GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-...
   ```

---

## 4. Конфигурация воркера и параллельности генераций

Воркер поддерживает фиксированный (`fixed`) и адаптивный (`adaptive`) режимы:

```env
# Режим работы воркера: fixed (по умолчанию) или adaptive
WORKER_MODE=adaptive

# В режиме fixed: число параллельных задач на воркер (1..100)
WORKER_CONCURRENCY=10

# В режиме adaptive: стартовый предел и верхняя граница (до 100)
WORKER_ADAPTIVE_INITIAL=10
WORKER_ADAPTIVE_MAX=20

# Ограничение частоты запусков (Leaky Bucket: не более N запросов/сек глобально)
WORKER_STARTS_PER_SECOND=2

# Бюджет памяти на входные изображения активных задач (в МиБ)
WORKER_INPUT_BUDGET_MB=256

# Ограничение памяти контейнера (в МиБ). Если не задано, считывается из cgroups
WORKER_MEMORY_MB=1024

# Максимум одновременных задач sharp на воркер (по умолчанию 2)
WORKER_IMAGE_CONCURRENCY=2

# Лимит дисковой области для сырых ответов staging (в МиБ)
WORKER_TEMP_BUDGET_MB=5120

# Путь к файлу пульса для Docker healthcheck
WORKER_HEARTBEAT_FILE=/tmp/ruvie-worker-heartbeat.json
```

## Worker с контролем нагрузки

Контейнер исполняет `node dist/worker.mjs`: TypeScript предварительно собирается
esbuild в Dockerfile. `pnpm worker:start` сначала собирает worker, затем запускает `dist/worker.mjs`.
Переменные окружения должны быть переданы явно. Grace period — 240 секунд; healthcheck проверяет возраст
heartbeat. Сам по себе статус `unhealthy` не перезапускает Docker-контейнер.

Параметры приведены в `.env.example`:

| Параметр | По умолчанию | Назначение |
| --- | --- | --- |
| `WORKER_MODE` | `fixed` | Фиксированная или адаптивная параллельность |
| `WORKER_CONCURRENCY` | 1 | Локальный предел задач на worker в fixed |
| `WORKER_GLOBAL_CONCURRENCY` | 100 | Общий AI-предел всех worker в fixed |
| `WORKER_ADAPTIVE_INITIAL` | 10 | Начальный общий предел adaptive |
| `WORKER_ADAPTIVE_MAX` | 20 | Максимум; допускается до 100 после измерений |
| `WORKER_STARTS_PER_SECOND` | 2 | Равномерная глобальная отправка без накопления burst |
| `WORKER_INPUT_BUDGET_MB` | 256 | Бюджет размеров входных файлов на процесс, МиБ |
| `WORKER_MEMORY_MB` | cgroup | Бюджет RSS; вне cgroup обязателен для adaptive |
| `WORKER_TEMP_BUDGET_MB` | 5120 | Бюджет временных результатов с резервом под ответы, МиБ |
| `WORKER_IMAGE_CONCURRENCY` | 2 | Параллельное преобразование результатов на процесс |

Рост adaptive: +1 не чаще раза в 10 секунд при очереди и успешных ответах.
При 429 предел уменьшается вдвое, минимум до 1; рост запрещён 30 секунд.
При уменьшении предела выполняющиеся запросы не прерываются. Новые отправки
останавливаются при RSS от 75% бюджета и возобновляются ниже 60%.
Дополнительно проверяется свободное место: минимум 256 МиБ. Ответ больше 64 МиБ
отклоняется; под каждый активный запрос резервируется такой объём временного
хранилища. Бюджет входных файлов не равен фактической RSS: Base64, SDK и sharp
создают дополнительные буферы.

### Обновление

1. Остановить старые worker с ожиданием завершения активных запросов.
2. Применить новые добавочные миграции к базе.
3. Запустить новую версию сначала в fixed; все копии используют одинаковые лимиты.
4. После fake-тестов включить adaptive в тестовом окружении.
5. Реальную нагрузку Vertex проверять отдельно с согласованным бюджетом.

Не смешивать старые и новые worker. При откате предварительно остановить новые
worker и завершить либо корректно вернуть кредиты по активным задачам: старая
версия не понимает внутренние этапы. Добавочные таблицы при откате не удалять.

Начальная оценка ресурсов — 8 vCPU / 32 ГБ RAM / 250–300 ГБ NVMe без GPU.
Она требует подтверждения нагрузочными измерениями и не гарантирует 100
одновременных обращений к Google. Лимиты контейнеров должны оставлять ресурсы
для web, PostgreSQL и ОС. Между хостами требуется общее хранилище.
