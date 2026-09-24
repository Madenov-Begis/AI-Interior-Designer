# Доступ Vercel к Google Cloud без постоянного ключа

Production-приложение получает краткоживущий Google access token через Vercel OIDC и Google Cloud Workload Identity Federation. Постоянный JSON-ключ service account в Vercel не нужен.

## Граница доверия

- issuer: `https://oidc.vercel.com/madenovbegis-projects`;
- в Google provider задана стандартная audience (список `allowedAudiences` пуст);
- запрашиваемая Vercel audience: `https://iam.googleapis.com/projects/1043684318287/locations/global/workloadIdentityPools/vercel-ruvie-production/providers/vercel`;
- pool: `vercel-ruvie-production`;
- provider: `vercel`;
- service account: `ruvie-vertex@project-2b9ed972-97d2-4024-984.iam.gserviceaccount.com`;
- доступ к impersonation получает только subject `owner:madenovbegis-projects:project:ai-interior-designer:environment:production` с ролью `roles/iam.workloadIdentityUser`.

Preview и development deployment не должны получать production-доступ. Service account должен иметь только роль, необходимую для вызова Vertex AI.

## Переменные Vercel

Для Production задаются несекретные идентификаторы:

```env
GOOGLE_CLOUD_PROJECT_ID=project-2b9ed972-97d2-4024-984
GOOGLE_CLOUD_LOCATION=global
GCP_PROJECT_NUMBER=1043684318287
GCP_SERVICE_ACCOUNT_EMAIL=ruvie-vertex@project-2b9ed972-97d2-4024-984.iam.gserviceaccount.com
GCP_WORKLOAD_IDENTITY_POOL_ID=vercel-ruvie-production
GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID=vercel
GCP_WORKLOAD_IDENTITY_TOKEN_AUDIENCE=https://iam.googleapis.com/projects/1043684318287/locations/global/workloadIdentityPools/vercel-ruvie-production/providers/vercel
```

`GOOGLE_APPLICATION_CREDENTIALS_JSON` удалён из Vercel Production 21 сентября 2026 года после успешной production-проверки. Локальная разработка при необходимости должна использовать Application Default Credentials или отдельную безопасную federation-схему; постоянный JSON-ключ больше не является штатным способом доступа и не должен сохраняться в Git.

## Статус внедрения

- Google provider использует стандартную canonical audience (список `allowedAudiences` пуст);
- Vercel Production запрашивает canonical Google audience провайдера;
- после каждого изменения federation требуется ручная проверка загрузки и генерации;
- постоянный secret `GOOGLE_APPLICATION_CREDENTIALS_JSON` удалён из Vercel Production;
- старый service-account key проекта `cms-e-commerce-455011` отозван;
- локальная копия старого JSON-ключа удалена из `.env.local`.

## Проверка и откат

1. Для каждого изменения issuer, audience, subject или service account выполнить новый production deployment.
2. Запустить одну контролируемую проверку изображения и одну генерацию.
3. Убедиться, что в метрике пула появилась успешная token exchange, а в логах нет `iam.serviceAccounts.getAccessToken denied`.
4. При ошибке вернуть предыдущий deployment и проверить точное совпадение issuer, audience и subject; не создавать новый постоянный JSON-ключ и не отключать организационную политику его запрета.
