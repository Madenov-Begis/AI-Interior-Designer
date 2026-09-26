import { updateAdminAccess } from "../../src/server/features/admin/user-access-operations.ts";
import { createCreditPackageWithDatabase } from "../../src/server/features/admin/credit-package-operations.ts";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { PrismaPg } from "@prisma/adapter-pg";
import { consumeRateLimit } from "../../src/server/shared/security/rate-limit-operations.ts";
import { drainStorageDeletions } from "../../src/server/features/media/deletion-outbox.ts";
import {
  reserveRootGenerationWithDependencies,
  failGenerationWithDatabase,
  cancelOwnedGenerationWithDatabase,
} from "../../src/server/features/generations/operations.ts";
import { PrismaClient } from "../../src/generated/prisma/client.ts";
import { requireIsolatedTestDatabase } from "../../src/server/shared/db/test-database.ts";
import {
  adjustCreditBalance,
  CreditBalanceError,
} from "../../src/server/features/credits/service-operations.ts";

const connectionString = requireIsolatedTestDatabase(
  process.env.TEST_DATABASE_URL,
);
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString, ssl: false, max: 20 }),
});
const userId = randomUUID();
const actorId = randomUUID();
const projectId = randomUUID();
const sourceId = randomUUID();
before(async () => {
  await db.profile.create({ data: { id: userId } });
});
after(async () => {
  await db.creditTransaction.deleteMany({ where: { userId } });
  await db.usageEvent.deleteMany({ where: { userId } });
  await db.generation.deleteMany({ where: { userId } });
  await db.project.deleteMany({ where: { userId } });
  await db.mediaFile.deleteMany({ where: { ownerId: userId } });
  await db.creditWallet.deleteMany({ where: { userId } });
  await db.profile.deleteMany({ where: { id: userId } });
  await db.$disconnect();
});

test("sixteen simultaneous requests with one key credit the wallet exactly once", async () => {
  const input = {
    userId,
    actorId,
    amount: 3,
    reason: "integration concurrency",
    idempotencyKey: randomUUID(),
  };
  const balances = await Promise.all(
    Array.from({ length: 16 }, () =>
      db.$transaction((tx) => adjustCreditBalance(tx, input), {
        timeout: 30000,
        maxWait: 30000,
      }),
    ),
  );
  assert.equal(new Set(balances).size, 1);
  assert.equal(
    await db.creditTransaction.count({
      where: { userId, kind: "ADMIN_ADJUSTMENT" },
    }),
    1,
  );
  assert.equal(
    (await db.creditWallet.findUniqueOrThrow({ where: { userId } })).balance,
    13,
  );
  await assert.rejects(
    db.$transaction((tx) => adjustCreditBalance(tx, { ...input, amount: 7 })),
    (error) =>
      error instanceof CreditBalanceError &&
      error.code === "IDEMPOTENCY_CONFLICT",
  );
  assert.equal(
    (await db.creditWallet.findUniqueOrThrow({ where: { userId } })).balance,
    13,
  );
});

test("distributed rate limit admits exactly the limit under concurrency and resets", async () => {
  const key = randomUUID();
  try {
    const results = await Promise.all(
      Array.from({ length: 25 }, () => consumeRateLimit(db, key, 5, 60000)),
    );
    assert.equal(results.filter((result) => result.allowed).length, 5);
    assert.ok(
      results.every(
        (result) => result.retryAfter > 0 && result.retryAfter <= 60,
      ),
    );
    await db.rateLimitBucket.update({
      where: { key },
      data: { resetAt: new Date(0) },
    });
    assert.equal((await consumeRateLimit(db, key, 5, 60000)).allowed, true);
  } finally {
    await db.rateLimitBucket.deleteMany({ where: { key } });
  }
});

test("a failed Storage deletion survives and is retried without a MediaFile row", async () => {
  const row = await db.storageDeletion.create({
    data: { bucket: "test", path: randomUUID() },
  });
  try {
    const first = await drainStorageDeletions(db, async () => {
      throw new Error("Storage unavailable");
    });
    assert.equal(first.failed, 1);
    assert.equal(
      (await db.storageDeletion.findUniqueOrThrow({ where: { id: row.id } }))
        .attempts,
      1,
    );
    await db.storageDeletion.update({
      where: { id: row.id },
      data: { nextAttemptAt: new Date(0) },
    });
    let calls = 0;
    const results = await Promise.all([
      drainStorageDeletions(db, async () => {
        calls++;
      }),
      drainStorageDeletions(db, async () => {
        calls++;
      }),
    ]);
    assert.equal(calls, 1);
    assert.equal(
      results.reduce((sum, result) => sum + result.removed, 0),
      1,
    );
    assert.equal(
      await db.storageDeletion.findUnique({ where: { id: row.id } }),
      null,
    );
  } finally {
    await db.storageDeletion.deleteMany({ where: { id: row.id } });
  }
});

test("concurrent root retries reserve once, and competing cancellation/refund returns credits once", async () => {
  await db.mediaFile.create({
    data: {
      id: sourceId,
      ownerId: userId,
      bucket: "test",
      path: randomUUID(),
      mimeType: "image/png",
      extension: "png",
      sizeBytes: 100,
      width: 800,
      height: 600,
      type: "SOURCE_IMAGE",
    },
  });
  await db.project.create({
    data: {
      id: projectId,
      userId,
      name: "Integration",
      sourceImageId: sourceId,
    },
  });
  const before = (
    await db.creditWallet.findUniqueOrThrow({ where: { userId } })
  ).balance;
  const dependencies = {
    db,
    aiProvider: "fake",
    buildFinalPrompt: () => "test",
    buildRefinementPrompt: () => "test",
    randomUUID,
    now: () => new Date(),
    limits: { maxParallelGenerations: 2, maxReferenceImages: 10 },
  };
  const input = {
    userId,
    projectId,
    prompt: "Test interior",
    aspectRatio: "RATIO_4_3" as const,
    idempotencyKey: randomUUID(),
  };
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      reserveRootGenerationWithDependencies(dependencies, input),
    ),
  );
  assert.equal(new Set(results.map((result) => result.generation.id)).size, 1);
  assert.equal(
    (await db.creditWallet.findUniqueOrThrow({ where: { userId } })).balance,
    before - 4,
  );
  const id = results[0]!.generation.id;
  await Promise.all([
    failGenerationWithDatabase(db, {
      generationId: id,
      code: "TEST",
      message: "Test failure",
    }),
    cancelOwnedGenerationWithDatabase(db, userId, id),
  ]);
  assert.equal(
    (await db.creditWallet.findUniqueOrThrow({ where: { userId } })).balance,
    before,
  );
  assert.equal(
    await db.creditTransaction.count({
      where: {
        generationId: id,
        kind: { in: ["TECHNICAL_REFUND", "CANCELLATION_REFUND"] },
      },
    }),
    1,
  );
});

test("two admins cannot concurrently remove each other's access", async () => {
  const a = randomUUID(),
    b = randomUUID();
  await db.profile.createMany({
    data: [
      { id: a, role: "ADMIN" },
      { id: b, role: "ADMIN" },
    ],
  });
  try {
    const results = await Promise.allSettled([
      updateAdminAccess(db, a, b, { role: "USER" }),
      updateAdminAccess(db, b, a, { role: "USER" }),
    ]);
    assert.equal(
      results.filter((result) => result.status === "fulfilled").length,
      1,
    );
    assert.equal(
      await db.profile.count({
        where: { id: { in: [a, b] }, role: "ADMIN", status: "ACTIVE" },
      }),
      1,
    );
  } finally {
    await db.profile.deleteMany({ where: { id: { in: [a, b] } } });
  }
});

test("concurrent package changes leave exactly one active popular package", async () => {
  const prefix = `test_${randomUUID()}`;
  try {
    await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        createCreditPackageWithDatabase(db, {
          code: `${prefix}_${i}`,
          name: "Test",
          nameEn: "Test",
          nameUz: null,
          description: null,
          descriptionEn: null,
          descriptionUz: null,
          credits: 10,
          priceUzs: 100,
          popular: true,
          active: true,
          sortOrder: i,
        }),
      ),
    );
    assert.equal(
      await db.creditPackage.count({ where: { active: true, popular: true } }),
      1,
    );
  } finally {
    await db.creditPackage.deleteMany({
      where: { code: { startsWith: prefix } },
    });
  }
});

test("SQL-ограничения пакетов сохраняют положительную цену и единственный популярный пакет", async () => {
  const prefix = `constraints_${randomUUID()}`;
  const data = {
    code: prefix,
    name: "Проверка ограничений",
    credits: 10,
    priceUzs: 100,
  };
  try {
    for (const invalid of [
      { credits: 0 },
      { priceUzs: 0 },
      { active: false, popular: true },
    ]) {
      await assert.rejects(
        db.creditPackage.create({ data: { ...data, ...invalid } }),
      );
    }
    await assert.rejects(
      db.$transaction(async (tx) => {
        // Изменения откатываются вместе с ожидаемым нарушением unique index.
        await tx.creditPackage.updateMany({ data: { popular: false } });
        await tx.creditPackage.create({ data: { ...data, popular: true } });
        await tx.creditPackage.create({
          data: { ...data, code: `${prefix}_second`, popular: true },
        });
      }),
    );
    assert.equal(
      await db.creditPackage.count({ where: { code: { startsWith: prefix } } }),
      0,
    );
  } finally {
    await db.creditPackage.deleteMany({
      where: { code: { startsWith: prefix } },
    });
  }
});
