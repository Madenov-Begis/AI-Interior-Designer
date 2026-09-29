import { readFile, statfs } from "node:fs/promises";
import { serverEnv } from "../../shared/config/env";
import { memoryPaused } from "./worker-policy";
import { Gate } from "../../shared/concurrency/gate";

let memoryBudget = 0;
let paused = false;
let inputBytes = 0;
export const imageGate = new Gate(
  Number(process.env.WORKER_IMAGE_CONCURRENCY || 2),
  100,
);
export async function initializeWorkerResources() {
  const env = serverEnv();
  const limits: number[] = [];
  if (env.WORKER_MEMORY_MB) limits.push(env.WORKER_MEMORY_MB * 1024 ** 2);
  for (const path of [
    "/sys/fs/cgroup/memory.max",
    "/sys/fs/cgroup/memory/memory.limit_in_bytes",
  ]) {
    try {
      const value = Number((await readFile(path, "utf8")).trim());
      if (Number.isFinite(value) && value > 0 && value < 2 ** 50)
        limits.push(value);
    } catch {
      /* На хосте cgroup может отсутствовать. */
    }
  }
  memoryBudget = limits.length ? Math.min(...limits) : 0;
  if (!memoryBudget && env.WORKER_MODE === "adaptive")
    throw new Error("WORKER_MEMORY_BUDGET_REQUIRED");
}
export async function canStartProvider() {
  paused = memoryPaused(paused, process.memoryUsage().rss, memoryBudget);
  if (paused) return false;
  try {
    const fs = await statfs(serverEnv().STORAGE_ROOT!);
    return fs.bavail * fs.bsize >= 256 * 1024 ** 2;
  } catch {
    return false;
  }
}
export function reserveInputs(bytes: number) {
  if (inputBytes + bytes > serverEnv().WORKER_INPUT_BUDGET_MB * 1024 ** 2)
    return null;
  inputBytes += bytes;
  let released = false;
  return () => {
    if (!released) {
      released = true;
      inputBytes -= bytes;
    }
  };
}
export function resourceMetrics() {
  return { rss: process.memoryUsage().rss, memoryBudget, inputBytes, paused };
}
