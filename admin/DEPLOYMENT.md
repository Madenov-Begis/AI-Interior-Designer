# Деплой админки

Админка разворачивается отдельным Vercel-проектом из того же Git-репозитория.

## Vercel project

- Project name: `ruvie-admin`
- Root Directory: `admin`
- Framework Preset: `Vite`
- Install Command: `pnpm install --frozen-lockfile`
- Build Command: `pnpm build`
- Output Directory: `dist`
- Production domain: `admin.ruvie.cc`

## Production environment

```dotenv
VITE_API_BASE_URL=https://api.ruvie.cc
```

Админка не получает Supabase keys и другие server secrets. После входа backend выдаёт подписанный admin-token, который Axios-интерцептор отправляет как Bearer token.

## Backend synchronization

В production environment backend-проекта должен быть разрешён точный origin админки:

```dotenv
ADMIN_ORIGINS=https://admin.ruvie.cc
ADMIN_ACCESS_CODE=<единый код, минимум 5 символов>
ADMIN_TOKEN_SECRET=<случайный secret, минимум 32 символа>
```

`ADMIN_ACCESS_CODE` и `ADMIN_TOKEN_SECRET` хранятся только в backend environment. После изменения переменных backend необходимо передеплоить. `api.ruvie.cc` должен быть привязан к backend-проекту и иметь рабочие DNS/HTTPS до browser-проверки админки.

## Release flow

1. Запустить `pnpm admin:test`, `pnpm admin:typecheck` и `pnpm admin:build` из корня репозитория.
2. Создать Preview Deployment и проверить `/login`, `/users`, `/generations`, `/finance/orders` и `/plans`.
3. Для проверки API на preview использовать стабильный staging-origin, внесённый в staging `ADMIN_ORIGINS`; wildcard origins запрещены.
4. После проверки назначить deployment production-домену `admin.ruvie.cc`.
5. Проверить прямое открытие detail-маршрутов, вход, обновление сессии и отсутствие browser console errors.
