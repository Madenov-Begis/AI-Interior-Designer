# Projects and Source Media Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Automated tests are intentionally deferred by the user's current instruction; every task must pass Prisma validation, typecheck, lint, and production build.

**Goal:** Дать авторизованному пользователю возможность автоматически получить профиль, создать проект и безопасно загрузить основную фотографию помещения в приватный Supabase Storage.

**Architecture:** Route Handlers проверяют Supabase claims и владение объектом, затем используют lazy Prisma singleton для бизнес-данных и отдельный server-only Supabase service client для Storage. Изображение сначала полностью валидируется и декодируется, только затем оригинал и очищенный WebP preview сохраняются по уникальным путям; запись БД создаётся транзакционно, а Storage очищается при ошибке БД.

**Tech Stack:** Next.js 16 Route Handlers, Supabase SSR/Storage, Prisma 7 with PostgreSQL adapter, Zod, Sharp, file-type.

## Global Constraints

- Только JPG/JPEG, PNG и WEBP; максимум 15 МБ, минимум 512×512, максимум стороны до обработки 6000 px.
- Storage buckets приватные; service role используется только сервером, `upsert: false`.
- Путь оригинала: `users/{userId}/projects/{projectId}/source/{fileId}.{extension}`; preview хранится рядом в `preview/{fileId}.webp`.
- Backend получает `userId` только из проверенных Supabase claims и повторно проверяет владение проектом.
- Публичные URL не сохраняются; отображение использует signed URL на 10 минут.

---

### Task 1: Prisma runtime и media variants

**Files:** `package.json`, `prisma/schema.prisma`, `src/lib/db.ts`, `src/config/storage.ts`

- [ ] Установить `@prisma/adapter-pg`, `pg`, `sharp`, `file-type` и типы `pg`; lockfile оставить зафиксированным.
- [ ] Добавить `Project.sourcePreviewId` и именованную связь с `MediaFile`, сохранив существующую `sourceImageId` для оригинала.
- [ ] Реализовать lazy `getDb()`; создавать `PrismaClient` только внутри getter через `PrismaPg({ connectionString: serverEnv().DATABASE_URL })`, переиспользовать экземпляр в development.
- [ ] Определить bucket constants и ограничения изображения в `src/config/storage.ts`.
- [ ] Выполнить `pnpm prisma:validate`, `pnpm prisma:generate`, `pnpm typecheck`, `pnpm lint`, `pnpm build`.

### Task 2: Текущий пользователь и profile upsert

**Files:** `src/lib/auth/current-user.ts`, `src/app/auth/callback/route.ts`

- [ ] Реализовать `requireCurrentUser()` через `auth.getClaims()` и `auth.getUser()`; при отсутствии валидной identity выбрасывать типизированный `UnauthorizedError`.
- [ ] Реализовать `upsertProfileFromAuthUser(user)` с безопасными полями `email`, `given_name`, `family_name`, `full_name`, `avatar_url`; роль и тариф никогда не брать из user metadata.
- [ ] После `exchangeCodeForSession` выполнять profile upsert и только затем redirect в `/app`; при ошибке профиля направлять на `/login?error=profile_setup`.
- [ ] Выполнить typecheck, lint и build.

### Task 3: Projects REST API

**Files:** `src/app/api/v1/projects/route.ts`, `src/app/api/v1/projects/[id]/route.ts`, `src/features/projects/schemas.ts`, `src/features/projects/service.ts`

- [ ] Реализовать `POST /api/v1/projects` с Zod name 1–120, default `Новый дизайн`, profile/ownership context и response 201.
- [ ] Реализовать `GET /api/v1/projects?cursor=&limit=` с limit 1–50, cursor pagination, исключением soft-deleted и сортировкой `createdAt desc, id desc`.
- [ ] Реализовать `GET /api/v1/projects/[id]` только для владельца; чужой и отсутствующий проект возвращают одинаковый `PROJECT_NOT_FOUND` 404.
- [ ] Выполнить Prisma validation, typecheck, lint и build.

### Task 4: Безопасная загрузка source image и рабочий UI

**Files:** `src/features/media/image-validation.ts`, `src/lib/supabase/admin.ts`, `src/features/media/source-upload.ts`, `src/app/api/v1/projects/[id]/source/route.ts`, `src/app/api/v1/media/[id]/signed-url/route.ts`, `src/app/app/design/page.tsx`, `src/components/design/source-upload.tsx`

- [ ] Проверить File и content length, определить реальный MIME через `fileTypeFromBuffer`, декодировать Sharp, применить rotate, проверить width/height/max side, checksum SHA-256.
- [ ] Сформировать sanitized preview WebP шириной до 1600 px без upscale; загрузить оригинал и preview через server-only service client с `upsert: false`.
- [ ] Создать две `MediaFile` записи и атомарно обновить `Project.sourceImageId/sourcePreviewId`; при ошибке удалить уже загруженные Storage objects.
- [ ] Signed URL endpoint проверяет ownerId и выдаёт URL на 600 секунд.
- [ ] UI создаёт проект при первой загрузке, отправляет multipart, показывает локальный preview, ошибки и успешное состояние; CTA кабинета ведёт на `/app/design`.
- [ ] Выполнить Prisma validation/generate, typecheck, lint, build и `git diff --check`, затем commit.
