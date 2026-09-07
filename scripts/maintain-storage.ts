import { readFile } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { createClient } from "@supabase/supabase-js";
import { drainStorageDeletions } from "../src/server/features/media/deletion-outbox.ts";

const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log(
    "maintain:storage [--apply] — dry run by default; requires SUPABASE_DATABASE_URL",
  );
  process.exit(0);
}
if (args.some((arg) => arg !== "--apply"))
  throw new Error("Unknown maintenance option");
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
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Storage configuration missing");
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const result = await drainStorageDeletions(db, async (bucket, path) => {
      const response = await client.storage.from(bucket).remove([path]);
      if (response.error) throw response.error;
    });
    await db.storageUpload.deleteMany({
      where: { expiresAt: { lt: new Date(Date.now() - 86400_000) } },
    });
    await db.rateLimitBucket.deleteMany({
      where: { resetAt: { lt: new Date(Date.now() - 86400_000) } },
    });
    console.log(JSON.stringify(result));
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
