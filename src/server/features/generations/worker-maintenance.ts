import { getDb } from "../../shared/db/prisma";
import { getStorage } from "../../shared/storage";
import { STORAGE_BUCKETS } from "../../shared/config/storage";
import { failGenerationWithDatabase } from "./operations";
import { drainStorageDeletions } from "../media/deletion-outbox";

/** Финансовое завершение переиспользует ту же транзакцию, что API recovery. */
export async function maintainGenerations() {
  const db = getDb();
  const now = new Date();
  const expired = await db.generation.findMany({
    where: {
      status: { in: ["QUEUED", "PROCESSING"] },
      usageEvent: { status: "RESERVED", expiresAt: { lte: now } },
    },
    select: { id: true },
    take: 100,
  });
  for (const item of expired)
    await failGenerationWithDatabase(db, {
      generationId: item.id,
      code: "GENERATION_EXPIRED",
      message: "Генерация не завершилась вовремя. Кредиты возвращены.",
    });
  const interrupted = await db.generationExecution.findMany({
    where: {
      stage: "SENDING",
      leaseUntil: { lte: now },
      generation: { status: "PROCESSING" },
    },
    take: 100,
  });
  for (const item of interrupted)
    await failGenerationWithDatabase(db, {
      generationId: item.generationId,
      claimToken: item.owner,
      lostBefore: now,
      code: "WORKER_INTERRUPTED",
      message: "Связь с обработчиком потеряна. Кредиты возвращены.",
    });
  const terminal = await db.generationExecution.findMany({
    where: {
      generation: {
        status: { in: ["SUCCEEDED", "FAILED", "REJECTED", "CANCELLED"] },
      },
    },
    take: 100,
  });
  for (const item of terminal)
    await db.$transaction(async (tx) => {
      const permit = await tx.generationPermit.findUnique({
        where: { generationId: item.generationId },
      });
      // Отложенная очистка не должна опередить поздний ответ прежнего процесса.
      const cleanupAt = new Date(
        Math.max(
          now.getTime(),
          permit?.expiresAt.getTime() || 0,
          item.leaseUntil.getTime(),
        ),
      );
      if (item.rawPath)
        await tx.storageDeletion.createMany({
          data: [
            {
              bucket: STORAGE_BUCKETS.generationTemporary,
              path: item.rawPath,
              nextAttemptAt: cleanupAt,
            },
          ],
          skipDuplicates: true,
        });
      if (
        item.finalPath &&
        !(await tx.mediaFile.findUnique({
          where: { path: item.finalPath },
          select: { id: true },
        }))
      ) {
        await tx.storageDeletion.createMany({
          data: [
            {
              bucket: STORAGE_BUCKETS.generationOriginals,
              path: item.finalPath,
              nextAttemptAt: cleanupAt,
            },
          ],
          skipDuplicates: true,
        });
      }
    });
  await db.generationPermit.deleteMany({ where: { expiresAt: { lte: now } } });
  await drainStorageDeletions(
    db,
    async (bucket, path) => {
      const result = await getStorage().from(bucket).remove([path]);
      if (result.error) throw result.error;
    },
    100,
  );
  for (const item of terminal) {
    if (item.leaseUntil > now) continue;
    await db.$transaction(async (tx) => {
      if (
        await tx.generationPermit.findFirst({
          where: { generationId: item.generationId, expiresAt: { gt: now } },
        })
      )
        return;
      const paths = [item.rawPath, item.finalPath].filter(
        (value): value is string => Boolean(value),
      );
      if (
        await tx.storageDeletion.findFirst({ where: { path: { in: paths } } })
      )
        return;
      await tx.generationExecution.deleteMany({
        where: { generationId: item.generationId, owner: item.owner },
      });
    });
  }
}
