import type { PrismaClient } from "../../../generated/prisma/client.ts";

export async function drainStorageDeletions(
  db: Pick<PrismaClient, "storageDeletion">,
  remove: (bucket: string, path: string) => Promise<void>,
  limit = 100,
) {
  const due = await db.storageDeletion.findMany({
    where: { nextAttemptAt: { lte: new Date() } },
    orderBy: [{ nextAttemptAt: "asc" }, { id: "asc" }],
    take: limit,
  });
  let removed = 0;
  let failed = 0;
  for (const item of due) {
    // CAS lease permits multiple workers without holding a DB transaction across HTTP.
    const claimed = await db.storageDeletion.updateMany({
      where: {
        id: item.id,
        attempts: item.attempts,
        nextAttemptAt: item.nextAttemptAt,
      },
      data: {
        attempts: { increment: 1 },
        nextAttemptAt: new Date(Date.now() + 300_000),
      },
    });
    if (!claimed.count) continue;
    try {
      await remove(item.bucket, item.path);
      await db.storageDeletion.deleteMany({ where: { id: item.id } });
      removed++;
    } catch {
      failed++;
      await db.storageDeletion.updateMany({
        where: { id: item.id, attempts: item.attempts + 1 },
        data: {
          nextAttemptAt: new Date(
            Date.now() +
              Math.min(86400, 60 * 2 ** Math.min(item.attempts, 11)) * 1000,
          ),
        },
      });
    }
  }
  return { examined: due.length, removed, failed };
}
