import { writeFile } from "node:fs/promises";
import { getDb } from "@/server/shared/db/prisma";
import { serverEnv } from "@/server/shared/config/env";
import {
  dispatchConfig,
  processGeneration,
} from "@/server/features/generations/worker";
import { runGenerationQueue } from "@/server/features/generations/queue-loop";

import {
  initializeWorkerResources,
  resourceMetrics,
} from "@/server/features/generations/worker-resources";
import { maintainGenerations } from "@/server/features/generations/worker-maintenance";

if (process.argv.includes("--help")) {
  console.log(
    "worker:start — отдельный worker PostgreSQL; WORKER_CONCURRENCY=1..100; WORKER_MODE=fixed|adaptive; dotenv не загружается",
  );
  process.exit(0);
}

const env = serverEnv();
const db = getDb();
const controller = new AbortController();
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.once(signal, () => controller.abort());

let lastMaintenance = 0;
try {
  await initializeWorkerResources();
  await runGenerationQueue(
    {
      async findQueued(limit) {
        const jobs = await db.generation.findMany({
          where: {
            status: { in: ["QUEUED", "PROCESSING"] },
            OR: [
              { status: "QUEUED", execution: null },
              {
                execution: {
                  stage: { in: ["PREPARING", "RETRY_WAIT", "RAW_READY"] },
                  leaseUntil: { lte: new Date() },
                  nextAttemptAt: { lte: new Date() },
                },
              },
            ],
            deletedAt: null,
            usageEvent: { status: "RESERVED", expiresAt: { gt: new Date() } },
          },
          orderBy: [{ queuedAt: "asc" }, { id: "asc" }],
          take: limit,
          select: { id: true },
        });
        return jobs.map((job) => job.id);
      },
      process: (id) => processGeneration(id, controller.signal),
      async heartbeat(active) {
        if (Date.now() - lastMaintenance >= 30_000) {
          await maintainGenerations();
          lastMaintenance = Date.now();
          const [regulator, queue, oldest, temporary] = await Promise.all([
            db.generationRegulator.findUnique({
              where: { key: dispatchConfig().key },
            }),
            db.generation.count({ where: { status: "QUEUED" } }),
            db.generation.findFirst({
              where: { status: "QUEUED" },
              orderBy: { queuedAt: "asc" },
              select: { queuedAt: true },
            }),
            db.generationExecution.aggregate({ _sum: { rawBytes: true } }),
          ]);
          console.log(
            JSON.stringify({
              event: "worker_metrics",
              at: Date.now(),
              pid: process.pid,
              active,
              queue,
              oldestMs: oldest ? Date.now() - oldest.queuedAt.getTime() : 0,
              limit: regulator?.limit,
              temporaryBytes: temporary._sum.rawBytes || 0,
              ...resourceMetrics(),
              cpu: process.cpuUsage(),
            }),
          );
        }
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
      concurrency:
        env.WORKER_MODE === "adaptive"
          ? env.WORKER_ADAPTIVE_MAX
          : env.WORKER_CONCURRENCY,
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
