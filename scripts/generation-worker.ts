import { writeFile } from "node:fs/promises";
import { getDb } from "@/server/shared/db/prisma";
import { serverEnv } from "@/server/shared/config/env";
import { processGeneration } from "@/server/features/generations/worker";
import { runGenerationQueue } from "@/server/features/generations/queue-loop";

if (process.argv.includes("--help")) {
  console.log(
    "worker:start — отдельный worker PostgreSQL; WORKER_CONCURRENCY=1..20; dotenv не загружается",
  );
  process.exit(0);
}

const env = serverEnv();
const db = getDb();
const controller = new AbortController();
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.once(signal, () => controller.abort());

try {
  await runGenerationQueue(
    {
      async findQueued(limit) {
        const jobs = await db.generation.findMany({
          where: {
            status: "QUEUED",
            deletedAt: null,
            usageEvent: { status: "RESERVED", expiresAt: { gt: new Date() } },
          },
          orderBy: [{ queuedAt: "asc" }, { id: "asc" }],
          take: limit,
          select: { id: true },
        });
        return jobs.map((job) => job.id);
      },
      process: processGeneration,
      async heartbeat(active) {
        await writeFile(
          env.WORKER_HEARTBEAT_FILE,
          JSON.stringify({ at: Date.now(), active }),
          { mode: 0o600 },
        );
      },
      reportError(code) {
        console.error(JSON.stringify({ code }));
      },
    },
    {
      concurrency: env.WORKER_CONCURRENCY,
      pollIntervalMs: 1000,
      signal: controller.signal,
    },
  );
} catch {
  console.error(JSON.stringify({ code: "WORKER_STOPPED" }));
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
