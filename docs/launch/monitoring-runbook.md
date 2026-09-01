# Production monitoring runbook

Дата ввода: 1 сентября 2026 года.

## Что проверяется

GitHub Actions workflow `Production monitoring` запускается каждые 15 минут и вручную через `workflow_dispatch`.

Публичный smoke проверяет:

- `ruvie.cc`, страницу входа и `admin.ruvie.cc`;
- точный redirect `www.ruvie.cc` на основной домен;
- доступность packages API и сохранение `paymentMode=disabled`;
- ожидаемый `401` защищенных user/admin API без сессии.

Проверка production-базы выводит только агрегированные счетчики и падает при любом из условий:

- больше 3 `FAILED` генераций за 30 минут;
- хотя бы одна `QUEUED` старше 15 минут;
- хотя бы одна `PROCESSING` старше 30 минут;
- больше 3 `TECHNICAL_REFUND` за 60 минут.

Пороги можно временно переопределить переменными workflow `FAILED_WINDOW_MINUTES`, `MAX_RECENT_FAILED`, `QUEUED_STALE_MINUTES`, `PROCESSING_STALE_MINUTES`, `REFUND_WINDOW_MINUTES` и `MAX_RECENT_TECHNICAL_REFUNDS`. Изменение порогов требует отдельного коммита с объяснением причины.

## Сигнал и восстановление

При ошибке workflow открывает GitHub issue `[monitoring] Production health check failed` или добавляет в уже открытый issue ссылку на новый run. После успешного run issue закрывается автоматически. Доступ к подробным Actions logs должен оставаться только у участников репозитория.

Порядок реакции:

1. Открыть ссылку на упавший Actions run и определить, не является ли ошибка кратким сетевым сбоем.
2. Для недоступного домена проверить Vercel deployment, domains и runtime logs.
3. Для `FAILED` проверить error code и provider/runtime logs, не копируя prompt или приватные URL в issue.
4. Для зависших задач проверить Vertex request и reservation expiry. Не менять статус и баланс вручную до сверки `UsageEvent` и `CreditTransaction`.
5. Для technical refund проверить соответствующие failure-события и отсутствие повторного refund.
6. После исправления запустить workflow вручную и убедиться, что incident issue закрыт успешной проверкой.

## Ограничения

Это базовый uptime/operations контроль для закрытой beta. Он не заменяет frontend/backend exception tracking, Google Cloud budget alert и отдельный paging-канал. Sentry или эквивалент остаётся обязательным перед расширением аудитории.
