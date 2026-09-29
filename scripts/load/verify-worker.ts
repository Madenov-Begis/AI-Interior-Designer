import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getDb } from "../../src/server/shared/db/prisma";
import { serverEnv } from "../../src/server/shared/config/env";
import { getStorage } from "../../src/server/shared/storage";
import {
  processGeneration,
  dispatchConfig,
} from "../../src/server/features/generations/worker";
import {
  claimExecution,
  beginProvider,
} from "../../src/server/features/generations/execution-store";
import { maintainGenerations } from "../../src/server/features/generations/worker-maintenance";
import {
  initializeWorkerResources,
  reserveInputs,
} from "../../src/server/features/generations/worker-resources";
import { FakeImageGenerationProvider } from "../../src/server/features/generations/provider";
import { failGenerationWithDatabase } from "../../src/server/features/generations/operations";

const env = serverEnv();
if (env.LOAD_TEST_MODE !== "true" || env.AI_PROVIDER !== "fake")
  throw new Error("Только изолированный fake-контур");
const db = getDb();
const storage = getStorage();
const users: string[] = [];
const jobs: string[] = [];
const image = await sharp({
  create: { width: 1024, height: 1024, channels: 3, background: "#b0a080" },
})
  .png()
  .toBuffer();
let calls = 0;
let failure: number | undefined;
const original = FakeImageGenerationProvider.prototype.generateRaw;
FakeImageGenerationProvider.prototype.generateRaw = async () => {
  calls++;
  if (failure)
    throw Object.assign(new Error("Тестовый отказ"), {
      status: failure,
      retryAfter: "1",
    });
  return { image, mimeType: "image/png", providerRequestId: "test" };
};
// Дочерний процесс использует настоящий worker и отдельное соединение с БД.
if (process.argv[2] === "--crash-child") {
  const phase = process.argv[3];
  const generationId = process.argv[4];
  await initializeWorkerResources();
  const keepAlive = setInterval(() => {}, 1000);
  if (phase === "PREPARING") {
    const from = storage.from.bind(storage);
    storage.from = (bucket) => {
      const adapter = from(bucket);
      if (bucket === "source-images")
        adapter.download = async () => {
          process.send?.("ready");
          return new Promise(() => {});
        };
      return adapter;
    };
  }
  await processGeneration(generationId);
  if (phase === "RAW_READY") process.send?.("ready");
  await new Promise(() => {});
  clearInterval(keepAlive);
  process.exit(0);
}

async function crashAt(generationId: string, phase: "PREPARING" | "RAW_READY") {
  await db.generationRegulator.update({
    where: { key: dispatchConfig().key },
    data: { nextDispatchAt: new Date(0) },
  });
  const child = spawn(
    process.execPath,
    [fileURLToPath(import.meta.url), "--crash-child", phase, generationId],
    { stdio: ["ignore", "ignore", "inherit", "ipc"] },
  );
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("CHILD_STAGE_TIMEOUT"));
    }, 30_000);
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      if (signal === "SIGKILL") resolve();
      else reject(new Error(`CHILD_EXIT_${code}`));
    });
    child.once("message", () => {
      clearTimeout(timeout);
      child.kill("SIGKILL");
    });
  });
  const execution = await db.generationExecution.findUniqueOrThrow({
    where: { generationId },
  });
  assert.equal(execution.stage, phase);
  // Ждём настоящего истечения аренды, не меняя дату в БД.
  await new Promise((resolve) =>
    setTimeout(
      resolve,
      Math.max(0, execution.leaseUntil.getTime() - Date.now()) + 100,
    ),
  );
  const before = calls;
  await immediate(generationId);
  if (phase === "PREPARING") await processGeneration(generationId);
  assert.equal(calls - before, phase === "PREPARING" ? 1 : 0);
  const completed = await db.generation.findUniqueOrThrow({
    where: { id: generationId },
  });
  assert.equal(completed.status, "SUCCEEDED");
  assert.equal(completed.attemptCount, 1);
  console.log(
    JSON.stringify({
      event: "worker_crash_verified",
      phase,
      providerAttempts: completed.attemptCount,
    }),
  );
}

async function fixture() {
  const id = randomUUID();
  users.push(id);
  await db.profile.create({
    data: { id, creditWallet: { create: { balance: 96 } } },
  });
  const path = `users/${id}/source/${randomUUID()}.png`;
  const uploaded = await storage
    .from("source-images")
    .upload(path, image, { contentType: "image/png", upsert: false });
  assert.equal(uploaded.error, null);
  const source = await db.mediaFile.create({
    data: {
      ownerId: id,
      bucket: "source-images",
      path,
      mimeType: "image/png",
      sizeBytes: image.length,
      width: 1024,
      height: 1024,
      type: "SOURCE_IMAGE",
    },
  });
  const project = await db.project.create({
    data: {
      userId: id,
      name: "Проверка восстановления",
      sourceImageId: source.id,
    },
  });
  const job = await db.generation.create({
    data: {
      userId: id,
      projectId: project.id,
      sourceImageId: source.id,
      prompt: "Тест",
      aspectRatio: "RATIO_1_1",
      usageEvent: {
        create: {
          userId: id,
          status: "RESERVED",
          creditAmount: 4,
          usageDate: new Date(),
          expiresAt: new Date(Date.now() + 900_000),
        },
      },
    },
  });
  jobs.push(job.id);
  return job;
}
async function immediate(id: string) {
  await db.generationRegulator.updateMany({
    data: { nextDispatchAt: new Date(0) },
    where: { key: dispatchConfig().key },
  });
  await processGeneration(id);
}
try {
  const config = dispatchConfig();
  assert.equal(
    await db.generationPermit.count({
      where: { regulatorKey: config.key, expiresAt: { gt: new Date() } },
    }),
    0,
    "Другой worker не должен работать в проверяемом контуре",
  );
  await db.generationRegulator.upsert({
    where: { key: config.key },
    create: { key: config.key, limit: config.initial },
    update: {
      limit: config.initial,
      successes: 0,
      cooldownUntil: new Date(),
      lastIncreaseAt: new Date(),
    },
  });
  await initializeWorkerResources();
  // Полный цикл: checkpoint переживает передачу новому владельцу и завершается без AI.
  const saved = await fixture();
  await immediate(saved.id);
  assert.equal(
    (
      await db.generationExecution.findUniqueOrThrow({
        where: { generationId: saved.id },
      })
    ).stage,
    "RAW_READY",
  );
  const afterCheckpoint = calls;
  await processGeneration(saved.id);
  assert.equal(calls, afterCheckpoint);
  assert.equal(
    (await db.generation.findUniqueOrThrow({ where: { id: saved.id } })).status,
    "SUCCEEDED",
  );
  assert.equal(
    (
      await db.usageEvent.findUniqueOrThrow({
        where: { generationId: saved.id },
      })
    ).status,
    "CONSUMED",
  );

  // Потерянная подготовка безопасно продолжается.
  const prepared = await fixture();
  assert.ok(await claimExecution(db, prepared.id, dispatchConfig()));
  await db.generationExecution.update({
    where: { generationId: prepared.id },
    data: { leaseUntil: new Date(0) },
  });
  await db.generationPermit.update({
    where: { generationId: prepared.id },
    data: { expiresAt: new Date(0) },
  });
  await immediate(prepared.id);
  await processGeneration(prepared.id);
  assert.equal(
    (await db.generation.findUniqueOrThrow({ where: { id: prepared.id } }))
      .status,
    "SUCCEEDED",
  );

  // Потерянный SENDING нельзя повторять; параллельный возврат не удваивает баланс.
  const sent = await fixture();
  const claim = await claimExecution(db, sent.id, dispatchConfig());
  assert.ok(claim);
  await db.generationRegulator.update({
    where: { key: dispatchConfig().key },
    data: { nextDispatchAt: new Date(0) },
  });
  assert.ok(await beginProvider(db, sent.id, claim.owner, dispatchConfig()));
  await db.generationExecution.update({
    where: { generationId: sent.id },
    data: { leaseUntil: new Date(0) },
  });
  const beforeRecovery = calls;
  await Promise.all([maintainGenerations(), maintainGenerations()]);
  await processGeneration(sent.id);
  assert.equal(calls, beforeRecovery);
  assert.equal(
    (await db.generation.findUniqueOrThrow({ where: { id: sent.id } })).status,
    "FAILED",
  );
  assert.equal(
    (
      await db.creditWallet.findUniqueOrThrow({
        where: { userId: sent.userId },
      })
    ).balance,
    100,
  );
  assert.ok(
    await db.generationPermit.findUnique({ where: { generationId: sent.id } }),
  );

  await db.generationPermit.update({
    where: { generationId: sent.id },
    data: { expiresAt: new Date(0) },
  });
  // Реальная ветка worker для 429: три обращения, затем единственный возврат.
  const throttled = await fixture();
  failure = 429;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const priorLimit = (
      await db.generationRegulator.findUniqueOrThrow({
        where: { key: config.key },
      })
    ).limit;
    await immediate(throttled.id);
    const currentLimit = await db.generationRegulator.findUniqueOrThrow({
      where: { key: config.key },
    });
    assert.equal(
      currentLimit.limit,
      config.mode === "adaptive"
        ? Math.max(1, Math.floor(priorLimit / 2))
        : priorLimit,
    );
    assert.ok(currentLimit.cooldownUntil.getTime() > Date.now());
    const execution = await db.generationExecution.findUniqueOrThrow({
      where: { generationId: throttled.id },
    });
    assert.equal(execution.providerAttempts, attempt);
    if (attempt < 3) {
      assert.equal(execution.stage, "RETRY_WAIT");
      assert.ok(execution.nextAttemptAt.getTime() > Date.now());
      await db.generationExecution.update({
        where: { generationId: throttled.id },
        data: { nextAttemptAt: new Date(0) },
      });
    }
  }
  assert.equal(
    (
      await db.creditWallet.findUniqueOrThrow({
        where: { userId: throttled.userId },
      })
    ).balance,
    100,
  );
  failure = 503;
  const uncertain = await fixture();
  const before = calls;
  await immediate(uncertain.id);
  await immediate(uncertain.id);
  assert.equal(calls - before, 1);
  assert.equal(
    (await db.generation.findUniqueOrThrow({ where: { id: uncertain.id } }))
      .status,
    "FAILED",
  );

  await db.generationPermit.update({
    where: { generationId: uncertain.id },
    data: { expiresAt: new Date(0) },
  });
  // Истечение после checkpoint конкурирует с финализацией и повторным возвратом.
  failure = undefined;
  const expired = await fixture();
  await immediate(expired.id);
  await db.usageEvent.update({
    where: { generationId: expired.id },
    data: { expiresAt: new Date(0) },
  });
  await Promise.all([
    processGeneration(expired.id),
    maintainGenerations(),
    failGenerationWithDatabase(db, {
      generationId: expired.id,
      code: "TEST_EXPIRED",
      message: "Тест",
    }),
  ]);
  assert.equal(
    (
      await db.creditWallet.findUniqueOrThrow({
        where: { userId: expired.userId },
      })
    ).balance,
    100,
  );
  // Временная недоступность БД до захвата не теряет задание.
  const databaseFailure = await fixture();
  const transaction = db.$transaction.bind(db);
  db.$transaction = (() =>
    Promise.reject(
      new Error("TEST_DATABASE_UNAVAILABLE"),
    )) as typeof db.$transaction;
  try {
    await assert.rejects(
      processGeneration(databaseFailure.id),
      /TEST_DATABASE_UNAVAILABLE/,
    );
  } finally {
    db.$transaction = transaction;
  }
  await immediate(databaseFailure.id);
  await processGeneration(databaseFailure.id);
  assert.equal(
    (
      await db.generation.findUniqueOrThrow({
        where: { id: databaseFailure.id },
      })
    ).status,
    "SUCCEEDED",
  );

  // Сбой сохранения сырого ответа возвращает резерв и не повторяет AI.
  const storageFailure = await fixture();
  const from = storage.from.bind(storage);
  storage.from = (bucket) => {
    const adapter = from(bucket);
    if (bucket === "generation-temporary")
      adapter.upload = async () => {
        throw new Error("TEST_STORAGE_UNAVAILABLE");
      };
    return adapter;
  };
  const storageCalls = calls;
  try {
    await immediate(storageFailure.id);
  } finally {
    storage.from = from;
  }
  await processGeneration(storageFailure.id);
  assert.equal(calls - storageCalls, 1);
  assert.equal(
    (
      await db.creditWallet.findUniqueOrThrow({
        where: { userId: storageFailure.userId },
      })
    ).balance,
    100,
  );
  await db.generationPermit.update({
    where: { generationId: storageFailure.id },
    data: { expiresAt: new Date(0) },
  });
  // Реальный RSS выше искусственно малого бюджета: новые задачи остаются в очереди.
  const guarded = await fixture();
  const oldMemory = env.WORKER_MEMORY_MB;
  const beforeGuard = calls;
  env.WORKER_MEMORY_MB = 1;
  await initializeWorkerResources();
  await processGeneration(guarded.id);
  assert.equal(calls, beforeGuard);
  assert.equal(
    (await db.generation.findUniqueOrThrow({ where: { id: guarded.id } }))
      .status,
    "QUEUED",
  );
  env.WORKER_MEMORY_MB = oldMemory;
  await initializeWorkerResources();
  assert.equal(
    await claimExecution(db, guarded.id, {
      ...dispatchConfig(),
      tempBudgetBytes: 1,
    }),
    null,
  );
  const releaseBudget = reserveInputs(env.WORKER_INPUT_BUDGET_MB * 1024 ** 2);
  assert.ok(releaseBudget);
  assert.equal(reserveInputs(1), null);
  releaseBudget();
  await immediate(guarded.id);
  await processGeneration(guarded.id);
  assert.equal(
    (await db.generation.findUniqueOrThrow({ where: { id: guarded.id } }))
      .status,
    "SUCCEEDED",
  );
  await crashAt((await fixture()).id, "PREPARING");
  await crashAt((await fixture()).id, "RAW_READY");
  console.log(
    JSON.stringify({
      event: "worker_verification",
      passed: 11,
      providerCalls: calls,
    }),
  );
} finally {
  FakeImageGenerationProvider.prototype.generateRaw = original;
  await db.generationPermit.deleteMany({
    where: { generationId: { in: jobs } },
  });
  await db.creditTransaction.deleteMany({ where: { userId: { in: users } } });
  await db.usageEvent.deleteMany({ where: { userId: { in: users } } });
  await db.generation.deleteMany({ where: { id: { in: jobs } } });
  await db.project.deleteMany({ where: { userId: { in: users } } });
  const media = await db.mediaFile.findMany({
    where: { ownerId: { in: users } },
  });
  for (const file of media) await storage.from(file.bucket).remove([file.path]);
  await db.mediaFile.deleteMany({ where: { ownerId: { in: users } } });
  await db.profile.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
}
