import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client.ts";
import { requireIsolatedTestDatabase } from "../../src/server/shared/db/test-database.ts";
import {
  claimExecution,
  lockRegulator,
} from "../../src/server/features/generations/execution-store.ts";
import { failGenerationWithDatabase } from "../../src/server/features/generations/operations.ts";
import { nextAdaptiveLimit, providerFailure } from "../../src/server/features/generations/worker-policy.ts";

test("Сценарий 1: Конкуренция 20 задач за адаптивный лимит и пошаговый разбор очереди", async () => {
  const db = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: requireIsolatedTestDatabase(process.env.TEST_DATABASE_URL),
      ssl: false,
    }),
  });

  const userId = randomUUID();
  const projectId = randomUUID();
  const sourceId = randomUUID();
  const key = `load:${randomUUID()}`;
  const config = {
    key,
    mode: "adaptive" as const,
    initial: 5,
    maximum: 10,
    startsPerSecond: 100, // ускоренный старт для теста
    tempBudgetBytes: 5 * 1024 ** 3,
  };

  try {
    await db.profile.create({
      data: {
        id: userId,
        creditWallet: { create: { balance: 200 } },
      },
    });

    await db.mediaFile.create({
      data: {
        id: sourceId,
        ownerId: userId,
        bucket: "source-images",
        path: `test/${sourceId}`,
        mimeType: "image/png",
        sizeBytes: 1024,
        type: "SOURCE_IMAGE",
      },
    });

    await db.project.create({
      data: {
        id: projectId,
        userId,
        name: "Нагрузочный проект",
        sourceImageId: sourceId,
      },
    });

    // Создаём 20 параллельных задач со статусом QUEUED
    const jobs = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        db.generation.create({
          data: {
            userId,
            projectId,
            sourceImageId: sourceId,
            prompt: `Тестовая комната #${i + 1}`,
            aspectRatio: "RATIO_1_1",
            usageEvent: {
              create: {
                userId,
                status: "RESERVED",
                creditAmount: 4,
                usageDate: new Date(),
                expiresAt: new Date(Date.now() + 900_000),
              },
            },
          },
        }),
      ),
    );

    // 1. Первая пачка захвата — регулятор разрешает ровно initial (5 задач)
    const firstWave = await Promise.all(jobs.map((job) => claimExecution(db, job.id, config)));
    const activeFirstWave = firstWave.filter(Boolean);
    assert.equal(activeFirstWave.length, 5, "В первую волну должно быть захвачено ровно 5 задач");

    // 2. Имитируем успешное завершение 5 задач и рост лимита
    await db.$transaction(async (tx) => {
      await lockRegulator(tx, key);
      await tx.generationRegulator.update({
        where: { key },
        data: {
          successes: 5,
          lastIncreaseAt: new Date(Date.now() - 15_000), // прошло больше 10 сек
          cooldownUntil: new Date(Date.now() - 1_000),
        },
      });
      // Освобождаем permits первой волны (как будто они перешли в RAW_READY)
      await tx.generationPermit.deleteMany({ where: { regulatorKey: key } });
    });

    // 3. Вторая волна захвата: лимит должен вырасти на +1 (стал 6)
    const secondWave = await Promise.all(
      jobs.slice(5).map((job) => claimExecution(db, job.id, config)),
    );
    const activeSecondWave = secondWave.filter(Boolean);
    assert.equal(activeSecondWave.length, 6, "После успешных завершений лимит должен вырасти до 6");

    const reg = await db.generationRegulator.findUniqueOrThrow({ where: { key } });
    assert.equal(reg.limit, 6, "Лимит в таблице регулятора должен быть равен 6");
  } finally {
    await db.generationPermit.deleteMany({ where: { regulatorKey: key } });
    await db.generationExecution.deleteMany({ where: { regulatorKey: key } });
    await db.usageEvent.deleteMany({ where: { userId } });
    await db.generation.deleteMany({ where: { userId } });
    await db.project.deleteMany({ where: { userId } });
    await db.mediaFile.deleteMany({ where: { ownerId: userId } });
    await db.profile.deleteMany({ where: { id: userId } });
    await db.generationRegulator.deleteMany({ where: { key } });
    await db.$disconnect();
  }
});

test("Сценарий 2: Адаптивное снижение лимита при ошибке 429 от провайдера", async () => {
  const db = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: requireIsolatedTestDatabase(process.env.TEST_DATABASE_URL),
      ssl: false,
    }),
  });

  const key = `throttling:${randomUUID()}`;
  try {
    // Начальный лимит 16
    await db.generationRegulator.create({
      data: {
        key,
        limit: 16,
        successes: 10,
        cooldownUntil: new Date(0),
      },
    });

    // Имитируем получение ошибки 429 с Retry-After: 2 сек
    const err = { status: 429, headers: { get: (h: string) => (h === "retry-after" ? "2" : null) } };
    const failure = providerFailure(err);
    assert.equal(failure.throttled, true);
    assert.equal(failure.retryAfterMs, 2000);

    // Снижаем лимит при 429 вдвое
    await db.$transaction(async (tx) => {
      await lockRegulator(tx, key);
      const reg = await tx.generationRegulator.findUniqueOrThrow({ where: { key } });
      const newLimit = Math.max(1, Math.floor(reg.limit / 2));
      await tx.generationRegulator.update({
        where: { key },
        data: {
          limit: newLimit,
          cooldownUntil: new Date(Date.now() + 30_000),
          successes: 0,
        },
      });
    });

    const regAfter = await db.generationRegulator.findUniqueOrThrow({ where: { key } });
    assert.equal(regAfter.limit, 8, "Лимит 16 должен уменьшиться вдвое до 8");
    assert.equal(regAfter.successes, 0, "Счетчик успехов должен обнулиться");
    assert.ok(regAfter.cooldownUntil.getTime() > Date.now(), "Должен быть включен cooldown на 30 сек");

    // Проверяем, что во время cooldown рост лимита заблокирован
    const noGrowth = nextAdaptiveLimit({
      limit: regAfter.limit,
      maximum: 20,
      successes: 5,
      lastIncreaseAt: 0,
      cooldownUntil: regAfter.cooldownUntil.getTime(),
      now: Date.now(),
      backlog: true,
    });
    assert.equal(noGrowth, 8, "Во время cooldown лимит не должен расти даже при успехах");
  } finally {
    await db.generationRegulator.deleteMany({ where: { key } });
    await db.$disconnect();
  }
});

test("Сценарий 3: Защита от потери денег — checkpoint возобновляет обработку без повторного обращения к AI", async () => {
  const db = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: requireIsolatedTestDatabase(process.env.TEST_DATABASE_URL),
      ssl: false,
    }),
  });

  const userId = randomUUID();
  const projectId = randomUUID();
  const sourceId = randomUUID();
  const generationId = randomUUID();
  const key = `checkpoint:${randomUUID()}`;
  const config = {
    key,
    mode: "fixed" as const,
    initial: 5,
    maximum: 5,
    startsPerSecond: 100,
    tempBudgetBytes: 5 * 1024 ** 3,
  };

  try {
    await db.profile.create({
      data: {
        id: userId,
        creditWallet: { create: { balance: 20 } },
      },
    });

    await db.mediaFile.create({
      data: {
        id: sourceId,
        ownerId: userId,
        bucket: "source-images",
        path: `test/${sourceId}`,
        mimeType: "image/png",
        sizeBytes: 1024,
        type: "SOURCE_IMAGE",
      },
    });

    await db.project.create({
      data: {
        id: projectId,
        userId,
        name: "Checkpoint проект",
        sourceImageId: sourceId,
      },
    });

    await db.generation.create({
      data: {
        id: generationId,
        userId,
        projectId,
        sourceImageId: sourceId,
        prompt: "Тестовая генерация с контрольной точкой",
        aspectRatio: "RATIO_1_1",
        status: "PROCESSING",
        usageEvent: {
          create: {
            userId,
            status: "RESERVED",
            creditAmount: 4,
            usageDate: new Date(),
            expiresAt: new Date(Date.now() + 900_000),
          },
        },
      },
    });

    const firstOwner = randomUUID();
    // Имитируем, что воркер №1 получил ответ от AI и сохранил контрольную точку RAW_READY
    await db.generationExecution.create({
      data: {
        generationId,
        owner: firstOwner,
        stage: "RAW_READY",
        rawPath: `users/${userId}/generations/${generationId}/checkpoint.raw`,
        rawMimeType: "image/png",
        rawBytes: 2048,
        providerAttempts: 1,
        regulatorKey: key,
        leaseUntil: new Date(0), // lease истёк (воркер №1 упал до сжатия sharp)
      },
    });

    // Приходит воркер №2 и пытается захватить задачу
    const resumedClaim = await claimExecution(db, generationId, config);
    assert.ok(resumedClaim, "Воркер №2 должен подхватить задачу из RAW_READY");
    assert.equal(resumedClaim.stage, "RAW_READY", "Этап должен оставаться RAW_READY");
    assert.equal(resumedClaim.providerAttempts, 1, "Число вызовов AI должно остаться 1 (без повторного запроса!)");
    assert.notEqual(resumedClaim.owner, firstOwner, "Владелец захвата должен смениться на воркера №2");

    // Проверяем, что поздний сбой от упавшего первого воркера отвергается (защита по claimToken)
    const lateFailed = await failGenerationWithDatabase(db, {
      generationId,
      claimToken: firstOwner,
      code: "LATE_WORKER_ERROR",
      message: "Поздняя ошибка",
    });
    assert.equal(lateFailed, false, "Поздний сбой от прежнего воркера должен быть проигнорирован");

    const currentGen = await db.generation.findUniqueOrThrow({ where: { id: generationId } });
    assert.equal(currentGen.status, "PROCESSING", "Статус генерации должен оставаться PROCESSING");
  } finally {
    await db.generationPermit.deleteMany({ where: { regulatorKey: key } });
    await db.generationExecution.deleteMany({ where: { generationId } });
    await db.usageEvent.deleteMany({ where: { userId } });
    await db.generation.deleteMany({ where: { userId } });
    await db.project.deleteMany({ where: { userId } });
    await db.mediaFile.deleteMany({ where: { ownerId: userId } });
    await db.profile.deleteMany({ where: { id: userId } });
    await db.generationRegulator.deleteMany({ where: { key } });
    await db.$disconnect();
  }
});
