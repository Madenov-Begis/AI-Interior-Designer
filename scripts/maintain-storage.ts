import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { createStorage } from "../src/server/shared/storage/factory.ts";
import { FilesystemStorage } from "../src/server/shared/storage/filesystem.ts";
import { databaseConnectionOptions } from "../src/server/shared/db/connection-options.ts";
import { drainStorageDeletions } from "../src/server/features/media/deletion-outbox.ts";

const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log(
    "maintain:storage [--apply] — по умолчанию dry run; нужен DATABASE_URL",
  );
  process.exit(0);
}
if (args.some((arg) => arg !== "--apply"))
  throw new Error("Unknown maintenance option");
const connectionString = process.env.DATABASE_URL;
if (!connectionString)
  throw new Error("Нужен DATABASE_URL");
const db = new PrismaClient({
  adapter: new PrismaPg({
    ...databaseConnectionOptions({
      DATABASE_URL: connectionString,
      DATABASE_SSL_MODE: process.env.DATABASE_SSL_MODE,
    }),
    connectionTimeoutMillis: 10_000,
    statement_timeout: 15_000,
    max: 2,
  }),
});

try {
  if (!args.includes("--apply")) {
    console.log(
      JSON.stringify({
        dryRun: true,
        due: await db.storageDeletion.count({
          where: { nextAttemptAt: { lte: new Date() } },
        }),
      }),
    );
  } else {
    const storage = createStorage(process.env);
    const result = await drainStorageDeletions(db, async (bucket, path) => {
      const response = await storage.from(bucket).remove([path]);
      if (response.error) throw response.error;
    });
    await db.storageUpload.deleteMany({
      where: { expiresAt: { lt: new Date(Date.now() - 86400_000) } },
    });
    await db.rateLimitBucket.deleteMany({
      where: { resetAt: { lt: new Date(Date.now() - 86400_000) } },
    });
    const temporaryRemoved =
      storage instanceof FilesystemStorage
        ? await storage.cleanupTemporaryUploads()
        : 0;
    console.log(JSON.stringify({ ...result, temporaryRemoved }));
    if (result.failed) process.exitCode = 1;
  }
} catch {
  console.error(
    "Storage maintenance failed; check database and Storage configuration",
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
