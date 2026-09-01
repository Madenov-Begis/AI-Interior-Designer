# Аудит Supabase перед запуском

Дата проверки: 29 августа 2026 года

Проект: `ai-interior-designer` (`awqmmdcbuhtaqbvxbper`)

Регион: Singapore (`ap-southeast-1`)

Тариф: Free

Состояние проекта: `ACTIVE_HEALTHY`

## Итог

Supabase работает, Google OAuth до страницы Google запускается, а все Storage buckets закрыты от публичного доступа. Однако запуск пока нельзя считать безопасно подготовленным по двум причинам:

1. принудительное SSL-подключение к PostgreSQL выключено;
2. нет доступной резервной копии базы, отдельной копии файлов Storage и проверенного сценария восстановления.

| Область | Статус | Результат |
|---|---|---|
| OAuth и redirects | Предупреждение | Google OAuth запускается, но URL и allow list надо привести к точной production-конфигурации |
| Storage buckets | Пройдено | Все 6 buckets приватные, RLS включён |
| Security Advisor | Предупреждение | Критических ошибок нет; защита от скомпрометированных паролей выключена |
| Performance Advisor | Предупреждение | Найдены 7 внешних ключей без индексов и 7 пока неиспользуемых индексов |
| SSL | Не пройдено | PostgreSQL поддерживает TLS, но SSL Enforcement выключен |
| Backup | Не пройдено | PITR выключен, доступных backup нет, off-site backup не настроен |

## OAuth и Auth

Текущая конфигурация:

- Site URL: `https://www.ruvie.cc`;
- Google provider включён, Client ID и Secret настроены;
- production callback `https://api.ruvie.cc/auth/callback` принимается Supabase;
- тестовый OAuth-запрос с PKCE получил redirect на `accounts.google.com`;
- callback Supabase для Google: `https://awqmmdcbuhtaqbvxbper.supabase.co/auth/v1/callback`;
- anonymous sign-ins выключены;
- проверка Google nonce включена;
- email/password signup включён;
- минимальная длина пароля — 6 символов;
- CAPTCHA выключена;
- ограничение сессии по времени и бездействию не настроено.

Что исправить:

1. Поменять Site URL на канонический `https://ruvie.cc`, если именно этот домен используется приложением.
2. Заменить широкое правило `https://api.ruvie.cc/auth/callback**` на точные допустимые production URL.
3. Удалить localhost wildcard из production-проекта или завести отдельный Supabase-проект для разработки.
4. Если вход должен быть только через Google — отключить email/password signup. Если парольный вход останется — увеличить минимальную длину пароля, включить CAPTCHA и leaked-password protection.
5. Совершить один реальный тестовый вход через Google. Текущая проверка доказывает корректность стороны Supabase, но не подтверждает окончательно настройки Redirect URI в Google Cloud Console.

Документация: [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google).

## Storage

Все необходимые buckets существуют и имеют `public=false`:

| Bucket | Лимит файла | MIME-типы |
|---|---:|---|
| `branding` | 5 MiB | JPEG, PNG, WebP |
| `generation-originals` | 25 MiB | JPEG, PNG, WebP |
| `generation-results` | 25 MiB | JPEG, PNG, WebP |
| `reference-images` | 15 MiB | JPEG, PNG, WebP |
| `source-images` | 15 MiB | JPEG, PNG, WebP |
| `visual-prompts` | 15 MiB | JPEG, PNG, WebP |

RLS включён на `storage.buckets` и `storage.objects`. Пользовательских Storage policies нет, поэтому прямой доступ через роли `anon` и `authenticated` запрещён. Это соответствует текущей архитектуре: сервер использует service role, проверяет владельца и выдаёт подписанные URL.

Важно: резервные копии PostgreSQL не содержат бинарные объекты Storage. Для них нужен отдельный backup.

Документация: [Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control).

## Security Advisor

Критических findings не обнаружено.

Предупреждение:

- `auth_leaked_password_protection` — проверка паролей по базе скомпрометированных паролей выключена.

Информационные findings:

- на 10 таблицах RLS включён, но policies отсутствуют: `CreditPackage`, `Generation`, `GenerationReference`, `MediaFile`, `PaymentEvent`, `Profile`, `Project`, `ProjectReference`, `UsageEvent`, `_prisma_migrations`.

При текущей server-only архитектуре отсутствие policies означает deny-by-default для Data API и само по себе не является уязвимостью. Список следует сохранить как явно принятый архитектурный выбор.

Документация: [Password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [RLS enabled with no policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

## Performance Advisor

Найдены внешние ключи без покрывающих индексов:

- `Generation_resultOriginalId_fkey`;
- `Generation_resultUserId_fkey`;
- `Generation_sourceImageId_fkey`;
- `Generation_visualPromptImageId_fkey`;
- `Project_sourceImageId_fkey`;
- `Project_sourcePreviewId_fkey`;
- `Project_visualPromptId_fkey`.

Их стоит индексировать до роста нагрузки. Это не блокирует закрытый запуск, но может замедлить JOIN, UPDATE и DELETE на больших таблицах.

Также отмечены 7 пока неиспользуемых индексов. Удалять их сейчас не следует: проект молодой, статистики нагрузки ещё недостаточно.

Документация: [Unindexed foreign keys](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), [Unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

## SSL

PostgreSQL настроен с `ssl=on` и минимальным протоколом TLS 1.2, но Supabase SSL Enforcement для базы выключен:

```json
{"database": false}
```

В локальных `DATABASE_URL` и `DIRECT_URL` также не указан обязательный SSL-режим. Поэтому сервер поддерживает шифрование, но не требует его для каждого подключения.

Перед запуском:

1. настроить SSL в обеих строках подключения и проверить совместимость Prisma/пулера;
2. протестировать preview или локальный запуск;
3. включить SSL Enforcement в короткое техническое окно — Supabase предупреждает о кратковременной перезагрузке базы;
4. повторно развернуть приложение и провести smoke test API и базы.

Предпочтителен `verify-full` с CA-сертификатом; минимально допустимый вариант — обязательное TLS-подключение без возможности fallback.

Документация: [SSL Enforcement](https://supabase.com/docs/guides/platform/ssl-enforcement), [Connecting with SSL](https://supabase.com/docs/guides/database/psql).

## Backup и восстановление

Результат проверки:

- тариф Free;
- доступные backups: отсутствуют;
- PITR выключен;
- автоматический off-site database backup в репозитории не настроен;
- отдельный backup объектов Storage не настроен;
- тест восстановления не проводился.

Наличие WAL-G в инфраструктуре не означает, что у проекта на Free есть доступная точка восстановления. Команда списка backup вернула пустой результат.

Перед запуском нужно:

1. сделать логический dump базы и сохранить его вне Supabase;
2. скопировать все объекты приватных Storage buckets во внешнее хранилище;
3. зафиксировать расписание и срок хранения копий;
4. проверить восстановление базы и хотя бы одного Storage-объекта;
5. при переходе на платный тариф включить автоматические backups или PITR согласно требованиям продукта.

Документация: [Database backups](https://supabase.com/docs/guides/platform/backups).

## Приоритет перед запуском

### P0 — обязательно

- подготовить и проверить backup базы и Storage;
- настроить клиентские SSL-подключения и включить SSL Enforcement;
- привести Site URL и production redirect allow list к точным адресам;
- определить, нужен ли email/password auth, и отключить или усилить его;
- выполнить реальный Google OAuth smoke test.

### P1 — до масштабирования

- добавить индексы для 7 внешних ключей;
- повторно оценить unused indexes после накопления статистики;
- определить политику длительности пользовательских сессий;
- рассмотреть платный тариф и PITR перед хранением критичных пользовательских данных.

## Изменения во внешней системе

Во время аудита настройки Supabase не изменялись. Проверка была только чтением конфигурации, advisors и состояния проекта.
