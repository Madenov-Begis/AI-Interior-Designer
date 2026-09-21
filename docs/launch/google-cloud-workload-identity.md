# Доступ Vercel к Google Cloud без постоянного ключа

Production-приложение получает краткоживущий Google access token через Vercel OIDC и Google Cloud Workload Identity Federation. Постоянный JSON-ключ service account в Vercel не нужен.

## Граница доверия

- issuer: `https://oidc.vercel.com/madenovbegis-projects`;
- допустимая audience: `https://vercel.com/madenovbegis-projects`;
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
```

`GOOGLE_APPLICATION_CREDENTIALS_JSON` из Vercel удаляется только после успешного smoke-test новой схемы. Локальная разработка временно может использовать `GOOGLE_APPLICATION_CREDENTIALS` или `GOOGLE_APPLICATION_CREDENTIALS_JSON`; такие credentials нельзя сохранять в Git.

## Проверка и откат

1. Выполнить production deployment с federation-переменными.
2. Запустить одну контролируемую проверку изображения и одну генерацию.
3. Убедиться, что в метрике пула появилась успешная token exchange, а в логах нет `iam.serviceAccounts.getAccessToken denied`.
4. После успешной проверки удалить старый `GOOGLE_APPLICATION_CREDENTIALS_JSON` из Vercel и отозвать старый service-account key в прежнем Google Cloud project.
5. При ошибке вернуть предыдущий deployment и проверить точное совпадение issuer, audience и subject; не отключать организационную политику запрета service-account keys.
