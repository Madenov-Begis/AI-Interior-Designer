import "server-only";

import { failGenerationWithDatabase } from "@/server/features/generations/operations";
import { recoverExpiredReservationsWithDependencies } from "@/server/features/generations/recovery-operations";
import { getDb } from "@/server/shared/db/prisma";

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
