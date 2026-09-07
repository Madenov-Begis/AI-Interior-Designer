import { readFile } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { failGenerationWithDatabase } from "../src/server/features/generations/operations.ts";
import { recoverExpiredReservationBatch } from "../src/server/features/generations/recovery-operations.ts";

const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log(
    "recover:generations [--apply] — dry run by default; requires SUPABASE_DATABASE_URL",
  );
  process.exit(0);
}
if (args.some((arg) => arg !== "--apply"))
  throw new Error("Unknown recovery option");
const connectionString = process.env.SUPABASE_DATABASE_URL;
if (!connectionString) throw new Error("SUPABASE_DATABASE_URL is required");
const ca = await readFile(
  new URL("../prisma/certs/supabase-root-2021.crt", import.meta.url),
  "utf8",
);
const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString,
    ssl: { ca, rejectUnauthorized: true },
    connectionTimeoutMillis: 10_000,
    statement_timeout: 15_000,
    max: 2,
  }),
});

try {
  const now = new Date();
  let cursor: string | undefined;
  let examined = 0;
  let recovered = 0;
  let failed = 0;
  // Bounded batches and a stable cutoff: never retry a paid AI call.
  for (let batch = 0; batch < 20; batch += 1) {
    const expired = await db.usageEvent.findMany({
      where: {
        status: "RESERVED",
        expiresAt: { lte: now },
        generation: { status: { in: ["QUEUED", "PROCESSING"] } },
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      orderBy: { id: "asc" },
      take: 100,
      select: { id: true, generationId: true },
    });
    if (!expired.length) break;
    examined += expired.length;
    cursor = expired.at(-1)!.id;
    if (args.includes("--apply")) {
      const result = await recoverExpiredReservationBatch(
        expired,
        (generationId) =>
          failGenerationWithDatabase(db, {
            generationId,
            code: "GENERATION_EXPIRED",
            message: "Генерация не завершилась вовремя. Кредиты возвращены.",
          }),
      );
      recovered += result.recovered;
      failed += result.failedIds.length;
    }
  }
  console.log(
    JSON.stringify({
      dryRun: !args.includes("--apply"),
      examined,
      recovered,
      failed,
    }),
  );
  if (failed) process.exitCode = 1;
} catch {
  // Never print a connection string or a raw provider/database exception.
  console.error(
    "Generation recovery failed; check database availability and workflow configuration",
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
