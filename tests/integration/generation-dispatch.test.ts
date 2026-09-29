import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client.ts";
import { requireIsolatedTestDatabase } from "../../src/server/shared/db/test-database.ts";
import {
  claimExecution,
  beginProvider,
} from "../../src/server/features/generations/execution-store.ts";
import { failGenerationWithDatabase } from "../../src/server/features/generations/operations.ts";

test("два worker соблюдают общий предел, lease и восстановление checkpoint", async () => {
  const db = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: requireIsolatedTestDatabase(
        process.env.TEST_DATABASE_URL,
      ),
      ssl: false,
    }),
  });
  const userId = randomUUID();
  const projectId = randomUUID();
  const sourceId = randomUUID();
  const key = `test:${randomUUID()}`;
  const config = {
    key,
    mode: "fixed" as const,
    initial: 2,
    maximum: 2,
    startsPerSecond: 2,
    tempBudgetBytes: 5 * 1024 ** 3,
  };
  try {
    await db.profile.create({
      data: { id: userId, creditWallet: { create: { balance: 100 } } },
    });
    await db.mediaFile.create({
      data: {
        id: sourceId,
        ownerId: userId,
        bucket: "source-images",
        path: `test/${sourceId}`,
        mimeType: "image/png",
        sizeBytes: 10,
        type: "SOURCE_IMAGE",
      },
    });
    await db.project.create({
      data: {
        id: projectId,
        userId,
        name: "Нагрузочный тест",
        sourceImageId: sourceId,
      },
    });
    const jobs = await Promise.all(
      Array.from({ length: 6 }, () =>
        db.generation.create({
          data: {
            userId,
            projectId,
            sourceImageId: sourceId,
            prompt: "Тест",
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
    const claims = await Promise.all(
      jobs.map((job) => claimExecution(db, job.id, config)),
    );
    assert.equal(claims.filter(Boolean).length, 2);
    const first = claims.find((claim) => claim)!;
    assert.equal(await claimExecution(db, first.generationId, config), null);
    assert.equal(
      await beginProvider(db, first.generationId, first.owner, config),
      true,
    );
    const second = claims.filter(Boolean)[1]!;
    assert.equal(
      await beginProvider(db, second.generationId, second.owner, config),
      false,
    );
    await db.generationRegulator.update({
      where: { key },
      data: { limit: 1, nextDispatchAt: new Date(0) },
    });
    assert.equal(
      await beginProvider(db, second.generationId, second.owner, config),
      false,
      "подготовленный запрос не обходит сниженный предел",
    );
    await db.generationExecution.update({
      where: { generationId: first.generationId },
      data: { leaseUntil: new Date(0) },
    });
    assert.equal(
      await claimExecution(db, first.generationId, config),
      null,
      "не повторять неизвестный SENDING",
    );
    await db.generationExecution.update({
      where: { generationId: first.generationId },
      data: {
        stage: "RAW_READY",
        rawPath: "test/raw",
        leaseUntil: new Date(0),
      },
    });
    const resumed = await claimExecution(db, first.generationId, config);
    assert.ok(resumed);
    assert.notEqual(resumed.owner, first.owner);
    assert.equal(resumed.providerAttempts, 1);
    assert.equal(
      await failGenerationWithDatabase(db, {
        generationId: first.generationId,
        claimToken: first.owner,
        code: "LATE",
        message: "Поздний ответ",
      }),
      false,
    );
    assert.equal(
      (
        await db.generation.findUniqueOrThrow({
          where: { id: first.generationId },
        })
      ).status,
      "PROCESSING",
    );
  } finally {
    await db.generationPermit.deleteMany({ where: { regulatorKey: key } });
    await db.usageEvent.deleteMany({ where: { userId } });
    await db.generation.deleteMany({ where: { userId } });
    await db.project.deleteMany({ where: { userId } });
    await db.mediaFile.deleteMany({ where: { ownerId: userId } });
    await db.profile.deleteMany({ where: { id: userId } });
    await db.generationRegulator.deleteMany({ where: { key } });
    await db.$disconnect();
  }
});
