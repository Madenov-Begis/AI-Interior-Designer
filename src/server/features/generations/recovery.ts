import "server-only";

import { failGenerationWithDatabase } from "@/server/features/generations/operations";
import {
  recoverExpiredReservationsWithDependencies,
  recoverInterruptedDevelopmentGenerationWithDependencies,
} from "@/server/features/generations/recovery-operations";
import { getDb } from "@/server/shared/db/prisma";
import { getGenerationWorkerInstanceId } from "./worker-instance";

export function recoverInterruptedDevelopmentGeneration(
  userId: string,
  generationId: string,
) {
  const db = getDb();
  return recoverInterruptedDevelopmentGenerationWithDependencies(
    {
      nodeEnv: process.env.NODE_ENV,
      userId,
      generationId,
      currentWorkerId: getGenerationWorkerInstanceId(),
    },
    {
      findGeneration: (ownerId, id) =>
        db.generation.findFirst({
          where: { id, userId: ownerId, deletedAt: null },
          select: { status: true, jobId: true },
        }),
      failGeneration: (id) =>
        failGenerationWithDatabase(db, {
          generationId: id,
          code: "WORKER_INTERRUPTED",
          message:
            "Генерация была прервана перезапуском сервера. Кредиты возвращены — запрос можно повторить.",
        }),
    },
  );
}

export async function recoverExpiredGenerationReservations(
  userId: string,
  now = new Date(),
) {
  const db = getDb();
  return recoverExpiredReservationsWithDependencies(userId, now, {
    findExpired: (recoveryUserId, cutoff) =>
      db.usageEvent.findMany({
        where: {
          userId: recoveryUserId,
          status: "RESERVED",
          expiresAt: { lte: cutoff },
          generation: { status: { in: ["QUEUED", "PROCESSING"] } },
        },
        orderBy: { expiresAt: "asc" },
        take: 100,
        select: { generationId: true },
      }),
    failGeneration: (generationId) =>
      failGenerationWithDatabase(db, {
        generationId,
        code: "GENERATION_EXPIRED",
        message: "Генерация не завершилась вовремя. Кредиты возвращены.",
      }),
  });
}
