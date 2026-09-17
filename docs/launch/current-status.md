# Ruvie — текущий статус запуска

## Обновление приёмки 12 сентября 2026

Все три согласованных пункта заключительной приёмки подтверждены: реальная загрузка → генерация → одно списание 4 кредитов → скачивание WebP; доставка email-уведомлений Sentry от сайта и админки; свежая Google-регистрация с новым профилем, записью согласия и одним начислением 10 кредитов.

Ниже сохранён исторический срез 7 сентября: упоминания о неподключённом Sentry и непроверенном полном сценарии заменены результатами заключительной приёмки. Остальные юридические и операционные пункты этим тестом не переоценивались.

## Исторический срез 7 сентября

Рефакторинг опубликован 7 сентября: release commit `879e1c6`, PR #2.
Основное приложение и админка имеют статус READY; post-deploy smoke прошёл.
Миграция применена; recovery/Storage workflow активен и успешно выполнен вручную.

- Дата: 7 сентября 2026 года
- Целевой формат: закрытая бесплатная beta
- Текущее решение: `NO-GO`
- Причина: остаются настройка Sentry, свежий Google signup и полная авторизованная приёмка загрузки/генерации после нового релиза. Юридические страницы опубликованы и доступны.

## Что закрыто

- Все 19 Prisma-миграций применены; схема production-базы актуальна.
- Supabase SSL Enforcement включен.
- Google OAuth проходит цепочку Ruvie → Supabase → Google; окончательный вход beta-пользователя входит в E2E.
- Все семь Storage buckets приватные. Новый staging bucket проверен реальной загрузкой 15 МБ, signed download и удалением тестовых файлов.
- Supabase Security Advisor и Performance Advisor не показывают открытых замечаний после добавления индексов.
- Ежедневный GitHub Actions backup сохраняет зашифрованные database, Auth/Storage metadata и файлы Storage; database restore и восстановление файла проверены.
- Production environment Vercel синхронизирован с локальной схемой, включая `PAYMENT_PROVIDER=disabled`, admin-секреты, Vertex и Supabase.
- Домены `ruvie.cc`, `www.ruvie.cc`, `api.ruvie.cc` и `admin.ruvie.cc` имеют корректные DNS records и статус Vercel `configured_correctly`.
- HTTPS и маршрутизация проверены: root и admin отвечают, `www` перенаправляет на root, защищенный API без сессии возвращает ожидаемый `401`.
- Основное приложение и админка имеют готовые Production deployments.
- Добавлена единая команда `pnpm release:check`; Node.js закреплен на ветке `24.x`.
- Локальный `pnpm release:check` от 2 сентября прошел полностью: 211 основных тестов, 21 UI/unit-тест и 7 server-тестов админки, TypeScript, ESLint, обе production-сборки и проверка 17 миграций.
- Release commit `c952cf3` опубликован, оба Vercel deployment имеют статус `READY`, post-deploy smoke и OAuth dry-run прошли; создан tag `closed-beta-2026-09-01`.
- Production E2E happy path прошёл: authenticated session, PNG upload, Vertex generation, списание 4 кредитов, refinement, повторное списание, reload persistence, admin login и credit adjustment с возвратом тестового баланса.
- Дополнительная production-приемка закрыла logout/relogin, создание проекта,
  JPEG/WebP и негативные uploads, exterior validation, canvas tools и reload,
  все стили/formats, catalog, profile/history, insufficient credits,
  cancellation/refund, technical refund, retry и cross-user isolation.
  Найденные autosave и refinement-retry ошибки исправлены в commits `2b07566`
  и `1f9e13a`; оба исправления повторно проверены в production.
- Добавлен production monitoring каждые 15 минут: семь проверок доменов/API, агрегатные пороги `FAILED`, зависших `QUEUED/PROCESSING` и technical refund, а также автоматический GitHub incident issue. Runbook: `docs/launch/monitoring-runbook.md`.
- Для beta утверждены RPO 30 часов, RTO 4 часа и 30-дневное хранение encrypted backup; назначена роль Beta Recovery Owner и сохранен recovery runbook. Подготовлены безопасные шаблоны ответов поддержки.
- Production содержит одного активного администратора; backend в транзакции запрещает self-lockout и удаление/понижение последнего активного администратора, соответствующий server test проходит.
- Документирована ручная процедура удаления аккаунта с немедленной блокировкой Profile, инвентаризацией Prisma/Storage/Auth, обезличиванием обязательных финансовых записей и 30-дневным циклом backup. Автоматизация и тестовый deletion E2E остаются незавершенными.
- Design QA завершён на production при 375, 768 и 1440 px. Исправлены mobile overflow профиля, сжатие toolbar touch targets и keyboard Escape для inspector. Итог: `passed`.
- Реквизиты Оператора и Исполнителя заполнены по свидетельству ИП: MADENOV BEGIS SPANTAMANO ULI, запись в Едином государственном реестре № 7987228 от 4 сентября 2026 года. Публичные маршруты Политики и Оферты, ссылки, явное согласие и серверная фиксация версии согласия подготовлены в коде; `pnpm legal:check` проходит.
- Реализован ручной аварийный выключатель новых генераций `GENERATIONS_ENABLED=false`. Он не связан с бюджетом и не ограничивает нормальные продажи или использование приобретенных кредитов.

## Оставшиеся блокеры

1. Выполнить единственный оставшийся E2E browser-flow: новый Google signup через отдельный новый Google-аккаунт. Production-аудит уже подтверждает ровно один grant на 10 кредитов у всех обычных профилей.
2. Подключить exception tracking и проверить административную видимость расходов Google Cloud. Budget alert остается необязательным наблюдением и не должен отключать генерации. Базовый uptime, generation-health monitoring и ручной emergency stop уже добавлены.
3. Провести юридическую проверку заполненных документов, задеплоить страницы и проверить запись согласия в production. Миграция фиксации согласий уже применена.
4. Подтвердить операционную безопасность: MFA/резервный owner Supabase и минимальные Vertex IAM/quota. Self-lockout protection и формальные RPO/RTO уже подтверждены.

## Следующая последовательность

1. Проверить новый Google signup с отдельной учетной записью.
2. Подключить exception tracking и проверить мониторинг расходов Google Cloud.
3. Опубликовать юридические страницы и выполнить production smoke test записи согласия.

Новые функции из `docs/future-plans.md` не входят в beta и не должны задерживать этот выпуск.

## Rollback

Если новый deployment не пройдет smoke test, оба Vercel-проекта нужно откатить на проверенный beta tag `closed-beta-2026-09-01` (commit `c952cf3`), затем повторить проверки root, login, credits API, auth API и admin. Миграция `20260830090000_add_foreign_key_indexes` совместима с предыдущим кодом и не требует отката базы при таком rollback.
