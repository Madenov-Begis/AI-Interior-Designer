# Инструкции для административной панели

Эти правила уточняют корневой `AGENTS.md` для отдельного Vite-приложения `admin`.

## Архитектура

- Используй React Router, Mantine и TanStack Query в существующем стиле.
- Backend admin API остаётся в основном Next.js-приложении.
- Не переносись на Next.js и не импортируй runtime основного frontend.
- Все административные данные получай через `adminApi` и типы `admin/src/shared/api`.
- Не помещай `ADMIN_ACCESS_CODE`, signing secret, Google credentials или другие server secrets во frontend.

## UX и безопасность

- Сохраняй responsive-поведение от 375 px.
- Таблицы должны оставаться читаемыми на mobile через существующий `ResourceTable`.
- Опасные операции требуют понятного подтверждения.
- Не ослабляй защиту от self-lockout администратора.
- Любая ручная корректировка баланса требует причины и idempotency key.
- Не добавляй редактирование неизменяемых generation/payment snapshots.

## Проверка

После изменения запускай релевантный набор:

```bash
pnpm admin:test
pnpm admin:typecheck
pnpm admin:build
pnpm admin:server:test
```

Для изменения административного API также проверяй основной `pnpm typecheck` и соответствующие server tests.
