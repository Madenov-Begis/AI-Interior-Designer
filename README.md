# AI Interior Designer

Веб-сервис AI-визуализации дизайна интерьера по фотографии помещения.

## Локальный запуск

```bash
corepack enable
pnpm install
cp .env.example .env.local
pnpm dev
```

Приложение откроется на `http://localhost:3000`. По умолчанию используется `AI_PROVIDER=fake`, поэтому реальные credentials Vertex AI для запуска интерфейса не нужны.

## Проверки

```bash
pnpm typecheck
pnpm lint
pnpm build
```

Полное исходное ТЗ хранится в [`docs/requirements/technical-specification.md`](docs/requirements/technical-specification.md). Архитектурный дизайн и поэтапные планы находятся в `docs/superpowers/`.
