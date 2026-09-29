import { getDb } from "../../src/server/shared/db/prisma";
import { serverEnv } from "../../src/server/shared/config/env";
const env = serverEnv();
if (env.LOAD_TEST_MODE !== "true" || env.AI_PROVIDER !== "fake")
  throw new Error("Только тестовый контур");
const db = getDb();
try {
  const [statuses, reservations, negativeWallets, failed, refunds] =
    await Promise.all([
      db.generation.groupBy({ by: ["status"], _count: true }),
      db.usageEvent.count({ where: { status: "RESERVED" } }),
      db.creditWallet.count({ where: { balance: { lt: 0 } } }),
      db.generation.groupBy({
        by: ["errorCode"],
        where: { status: "FAILED" },
        _count: true,
      }),
      db.creditTransaction.findMany({
        where: { generationId: { not: null }, amount: { gt: 0 } },
        select: { generationId: true },
      }),
    ]);
  const replayedInterrupted = await db.generation.count({
    where: { errorCode: "WORKER_INTERRUPTED", attemptCount: { gt: 1 } },
  });
  const counts = new Map<string, number>();
  for (const refund of refunds)
    counts.set(
      refund.generationId!,
      (counts.get(refund.generationId!) || 0) + 1,
    );
  const duplicateRefunds = [...counts.values()].filter((n) => n > 1).length;
  console.log(
    JSON.stringify({
      statuses,
      reservations,
      negativeWallets,
      failed,
      duplicateRefunds,
      replayedInterrupted,
    }),
  );
  if (
    negativeWallets ||
    duplicateRefunds ||
    reservations ||
    replayedInterrupted
  )
    process.exitCode = 1;
} finally {
  await db.$disconnect();
}
