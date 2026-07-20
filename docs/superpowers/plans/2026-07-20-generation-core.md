# Generation Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Automated tests remain deferred by user instruction; all static/build checks are mandatory.

**Goal:** Создать рабочий generation flow с атомарным дневным лимитом, idempotency, mock-provider, результатами в Storage и polling UI.

**Architecture:** API транзакционно резервирует UsageEvent и создаёт immutable Generation snapshot с ordered references. Provider abstraction выбирается по `AI_PROVIDER`; fake provider формирует детерминированный локальный результат, а worker lifecycle атомарно меняет статусы, сохраняет original/user files и consume/refund reservation.

**Tech Stack:** Next.js 16 `after`, Prisma 7 transactions, Sharp, Supabase Storage, Zod.

## Global Constraints

- Обычный лимит — 10 в сутки по Asia/Tashkent; проверка и reservation атомарны.
- Повтор одного `Idempotency-Key` не создаёт вторую генерацию.
- В generation сохраняются source, visual prompt, ordered reference snapshots, prompt, model и aspect ratio.
- Fake provider работает без внешних credentials; Vertex adapter не раскрывает credentials и включается env.
- Системная ошибка переводит usage в REFUNDED.

---

### Task 1: Defaults and reservation
- [ ] Добавить FAKE provider enum/migration и idempotent FREE/VIP/model defaults.
- [ ] Реализовать effective plan, daily usage date и атомарное reservation.

### Task 2: Provider and worker lifecycle
- [ ] Реализовать provider interface, prompt builder и fake image provider.
- [ ] Реализовать PROCESSING/SUCCEEDED/FAILED, Storage persistence, watermark и consume/refund.

### Task 3: API and UI
- [ ] Реализовать POST/list/read generation и config/models/usage endpoints.
- [ ] Добавить instruction/model/aspect UI, polling и result preview.

### Task 4: Verification
- [ ] Prisma validate/generate, typecheck, lint, build, diff check и no Data API scan.
- [ ] Зафиксировать этап отдельным commit.
