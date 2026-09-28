# Руководство по развёртыванию Ruvie в Docker

Документ описывает универсальное развёртывание проекта на любом сервере/VPS или локальной машине с помощью стандартного Docker Compose.

---

## Архитектура контейнеров

Вся система запускается через корневой [docker-compose.yml](file:///Users/macbookpro/Documents/AI%20Interior%20Designer/docker-compose.yml) и единый multi-stage [Dockerfile](file:///Users/macbookpro/Documents/AI%20Interior%20Designer/Dockerfile):

1. **`postgres`** — база данных PostgreSQL 17 (Alpine). Данные сохраняются в Docker volume `postgres_data`.
2. **`migrate`** — одноразовый контейнер, применяющий миграции Prisma (`prisma migrate deploy`) перед стартом сервисов.
3. **`web`** — основное приложение Next.js (standalone) на порту `3000`.
4. **`worker`** — фоновый процесс обработки очередей AI-генераций (запускается через нативный `node 24 --experimental-strip-types scripts/generation-worker.ts`).
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

