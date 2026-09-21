# Google Cloud: бюджет, квоты и аварийная остановка

## Защита приложения

- `MAX_PARALLEL_GENERATIONS=1` ограничивает одного пользователя одной активной задачей.
- `GENERATIONS_ENABLED=false` — аварийный переключатель. После изменения production environment и redeploy все новые root-генерации, доработки и retry отвечают `503 GENERATIONS_DISABLED`; чтение уже созданных проектов и результатов продолжает работать.
- Повтор запроса с уже существующим idempotency key возвращает существующую генерацию и не создаёт новый расход.

## Процедура emergency stop

1. В Vercel production environment основного backend-проекта установить `GENERATIONS_ENABLED=false`.
2. Создать production redeploy без изменения кода.
3. Убедиться, что новый запрос генерации возвращает HTTP 503 и код `GENERATIONS_DISABLED`.
4. Проверить generation-health monitoring и убедиться, что уже запущенные задачи завершились или получили технический refund.
5. После выяснения причины вернуть `GENERATIONS_ENABLED=true`, redeploy и выполнить одну контролируемую генерацию.

Аварийный переключатель отключает только новые AI-операции. Он не отключает базу, Auth, Storage или доступ пользователей к готовым данным.

## Google Cloud

Production Vertex AI работает в проекте `project-2b9ed972-97d2-4024-984`; billing включён. Фиксированный месячный лимит не используется: рост продаж и приобретённых пользователями кредитов не должен искусственно останавливать штатные генерации.

Budget alert остаётся необязательным средством наблюдения за аномальным расходом. Если он будет добавлен, пороги и сумма должны выбираться по фактической выручке и расходам, а не как жёсткий потолок. Уведомление не должно автоматически менять `GENERATIONS_ENABLED` или блокировать использование уже купленных кредитов.

Gemini generative AI в Vertex AI использует Dynamic Shared Quota, поэтому Cloud Console может не предоставлять фиксируемую request quota для выбранной модели. Контроль нормального расхода обеспечивается списанием кредитов и одной параллельной задачей на пользователя. Cloud budget используется только как сигнал об аномалии. `GENERATIONS_ENABLED` переключается вручную оператором лишь при инциденте и не связан с бюджетным порогом.

Production service account `ruvie-vertex@project-2b9ed972-97d2-4024-984.iam.gserviceaccount.com` должен иметь только permission, необходимый для вызова модели (`aiplatform.endpoints.predict`); права Billing Admin, Project Owner и изменения quotas ему не нужны. Доступ Vercel предоставлен через Workload Identity Federation только production subject проекта Ruvie.

## Проверка

```bash
pnpm cloud:check
```

Команда выполняет read-only проверку billing, budget API и доступных IAM permissions с production service account. Настройку бюджета должен выполнять отдельный человеческий владелец/финансовый администратор, а не runtime service account.

## Supabase recovery owner

Временный контакт резервного владельца: **backup-owner@ruvie.cc**. Это заглушка; приглашение в Supabase не отправляется, пока не будет указан реальный доверенный email.
