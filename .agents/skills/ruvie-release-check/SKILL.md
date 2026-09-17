---
name: ruvie-release-check
description: Проверяет готовность Ruvie к preview, beta или production-релизу по коду, тестам, миграциям, конфигурации, внешним зависимостям и эксплуатационным runbook; применяй при запросе релизной проверки или публикации.
---

# Проверка релиза Ruvie

Этот skill проверяет готовность и формирует доказательный отчёт. Он не разрешает deploy, изменение production environment, применение migration или другие внешние действия без прямого запроса пользователя.

## Определи тип релиза

Установи, что проверяется:

- локальная готовность ветки;
- preview deployment;
- closed beta;
- production release;
- отдельно основное приложение или admin.

Если пользователь не уточнил среду, выполни безопасную локальную проверку и перечисли внешние шаги отдельно.

## Источники

Прочитай:

- `docs/testing.md`;
- `docs/launch/current-status.md`;
- `docs/launch/closed-beta-checklist.md` для beta/production;
- релевантные runbook из `docs/launch`;
- `.env.example`, `package.json`, `prisma/schema.prisma` и workflows для затронутой части.

Не выводи значения secrets в команды, логи или отчёт.

## Локальная проверка

Начни с `git status` и review diff. Затем запусти релевантный набор. Для полного релиза основной путь:

```bash
pnpm release:check
```

Если команда зависит от недоступной test database или внешней среды, не подменяй результат. Запусти независимые доступные шаги и явно отметь блокер.

Проверь:

- tests, UI tests, typecheck, lint и обе production-сборки;
- Prisma validation и migration status;
- отсутствие незапланированных generated/secrets файлов;
- согласованность `.env.example` и runtime validation;
- юридические документы;
- generation/payment safety switches;
- изменения public/admin API и CORS origins;
- необходимость backup/restore или smoke-проверки.

## Внешняя проверка

Выполняй только по явному запросу и с доступной авторизацией:

- preview/production deployment;
- environment sync;
- database migration;
- smoke monitoring;
- Google Cloud controls;
- Supabase Storage/Auth проверка;
- backup verification.

Следуй соответствующему runbook. Не используй production как тестовую среду для destructive сценария.

## Отчёт

Сгруппируй результат:

- `Готово` — проверено и прошло;
- `Не готово` — подтверждённые ошибки;
- `Не проверено` — отсутствует доступ, среда или prerequisite;
- `Внешние шаги` — действия владельца production;
- `Решение` — можно ли выпускать на выбранную среду.

Не делай вывод «готово к production», если не проверены обязательные внешние prerequisites.
