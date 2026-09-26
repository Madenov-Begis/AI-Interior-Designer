import { setTimeout as delay } from "node:timers/promises";

type QueueDependencies = {
  findQueued(limit: number): Promise<string[]>;
  process(id: string): Promise<void>;
  heartbeat(active: number): Promise<void>;
  reportError(code: "WORKER_POLL_FAILED" | "WORKER_TASK_FAILED"): void;
};

/** Задания атомарно захватывает существующий processGeneration; этот цикл только планирует. */
export async function runGenerationQueue(
  dependencies: QueueDependencies,
  options: { concurrency: number; pollIntervalMs: number; signal: AbortSignal },
) {
  if (
    !Number.isInteger(options.concurrency) ||
    options.concurrency < 1 ||
    options.concurrency > 20 ||
    options.pollIntervalMs < 10
  )
    throw new Error("INVALID_WORKER_CONFIGURATION");
  const active = new Map<string, Promise<void>>();
  try {
    while (!options.signal.aborted) {
      try {
        const slots = options.concurrency - active.size;
        if (slots > 0) {
          const queued = await dependencies.findQueued(slots);
          for (const id of queued) {
            if (options.signal.aborted || active.size >= options.concurrency)
              break;
            if (active.has(id)) continue;
            const task = Promise.resolve()
              .then(() => dependencies.process(id))
              .catch(() => dependencies.reportError("WORKER_TASK_FAILED"))
              .finally(() => {
                active.delete(id);
              });
            active.set(id, task);
          }
        }
        await dependencies.heartbeat(active.size);
      } catch {
        dependencies.reportError("WORKER_POLL_FAILED");
      }
      await delay(options.pollIntervalMs, undefined, {
        signal: options.signal,
      }).catch((error) => {
        if (error.name !== "AbortError") throw error;
      });
    }
  } finally {
    // SIGTERM останавливает приём задач, но не обрывает платный запрос к AI.
    await Promise.allSettled(active.values());
  }
}
