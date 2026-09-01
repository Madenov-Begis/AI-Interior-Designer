# Ruvie — текущий статус запуска

- Дата: 1 сентября 2026 года
- Целевой формат: закрытая бесплатная beta
- Текущее решение: `NO-GO`
- Причина: инфраструктурные блокеры закрыты, но обязательная пользовательская приемка, Design QA, monitoring и юридическая публикация еще не завершены

## Что закрыто

- Все 17 Prisma-миграций применены; схема production-базы актуальна.
- Supabase SSL Enforcement включен.
- Google OAuth проходит цепочку Ruvie → Supabase → Google; окончательный вход beta-пользователя входит в E2E.
- Все шесть Storage buckets приватные; проверена выдача реального объекта через серверный signed URL.
- Supabase Security Advisor и Performance Advisor не показывают открытых замечаний после добавления индексов.
- Ежедневный GitHub Actions backup сохраняет зашифрованные database, Auth/Storage metadata и файлы Storage; database restore и восстановление файла проверены.
- Production environment Vercel синхронизирован с локальной схемой, включая `PAYMENT_PROVIDER=disabled`, admin-секреты, Vertex и Supabase.
- Домены `ruvie.cc`, `www.ruvie.cc`, `api.ruvie.cc` и `admin.ruvie.cc` имеют корректные DNS records и статус Vercel `configured_correctly`.
- HTTPS и маршрутизация проверены: root и admin отвечают, `www` перенаправляет на root, защищенный API без сессии возвращает ожидаемый `401`.
- Основное приложение и админка имеют готовые Production deployments.
- Добавлена единая команда `pnpm release:check`; Node.js закреплен на ветке `24.x`.
- Локальный `pnpm release:check` от 1 сентября прошел полностью: 200 основных тестов, 21 UI/unit-тест и 7 server-тестов админки, TypeScript, ESLint, обе production-сборки и проверка 17 миграций.

## Оставшиеся блокеры

1. Закоммитить и задеплоить проверенный release-набор; затем зафиксировать release SHA.
2. Выполнить authenticated production E2E: Google login → стартовые кредиты → проект → upload → Vertex generation → refinement → download → debit/refund/retry → admin credit adjustment.
3. Провести Design QA при 375, 768 и 1440 px, включая клавиатуру и mobile, и изменить итог отчета с `blocked` на `passed`.
4. Подключить внешний error/uptime monitoring, alerts зависших и неуспешных генераций, refund и Google Cloud budget; определить emergency stop.
5. Заполнить реквизиты и сроки в юридических шаблонах, проверить их, опубликовать страницы и добавить фиксацию согласия.
6. Подтвердить операционную безопасность: активный admin, self-lockout protection, MFA/резервный owner Supabase, минимальные Vertex IAM/quota и формальные RPO/RTO.

## Следующая последовательность

1. Завершить release hygiene и запустить `pnpm release:check`.
2. Отправить проверенный release commit и дождаться обоих Production deployments.
3. Выполнить короткий публичный smoke test и authenticated E2E.
4. Закрыть Design QA.
5. Подключить monitoring и оформить юридический минимум.

Новые функции из `docs/future-plans.md` не входят в beta и не должны задерживать этот выпуск.

## Rollback

Если новый deployment не пройдет smoke test, оба Vercel-проекта нужно откатить на последний подтвержденный production commit `5d6eb8d`, затем повторить проверки root, login, credits API, auth API и admin. Миграция `20260830090000_add_foreign_key_indexes` совместима с предыдущим кодом и не требует отката базы при таком rollback.
