import { randomUUID } from "node:crypto";

const workerState = globalThis as typeof globalThis & {
  __ruvieGenerationWorkerInstanceId?: string;
};

export function getGenerationWorkerInstanceId() {
  return (workerState.__ruvieGenerationWorkerInstanceId ??= randomUUID());
}
