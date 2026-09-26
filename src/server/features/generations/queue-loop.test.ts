import assert from "node:assert/strict";
import test from "node:test";
import { runGenerationQueue } from "./queue-loop.ts";

test("worker ограничивает параллельность, исключает локальные дубли и дожидается задач при остановке", async () => {
  const controller = new AbortController();
  const started: string[] = [];
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let completed = 0;
  const loop = runGenerationQueue(
    {
      findQueued: async () => ["one", "one", "two", "three"],
      process: async (id) => {
        started.push(id);
        await pending;
        completed++;
      },
      heartbeat: async (active) => {
        assert.equal(active, 2);
        controller.abort();
      },
      reportError: () => assert.fail("Не должно быть ошибок"),
    },
    { concurrency: 2, pollIntervalMs: 10, signal: controller.signal },
  );
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(started, ["one", "two"]);
  assert.equal(completed, 0);
  release();
  await loop;
  assert.equal(completed, 2);
});

test("ошибка БД не останавливает цикл, ошибка задания не мешает следующему", async () => {
  const controller = new AbortController();
  const errors: string[] = [];
  let polls = 0;
  await runGenerationQueue(
    {
      findQueued: async () => {
        polls++;
        if (polls === 1) throw new Error("DB");
        return polls === 2 ? ["bad"] : ["good"];
      },
      process: async (id) => {
        if (id === "bad") throw new Error("AI");
        controller.abort();
      },
      heartbeat: async () => {},
      reportError: (code) => {
        errors.push(code);
      },
    },
    { concurrency: 1, pollIntervalMs: 10, signal: controller.signal },
  );
  assert.deepEqual(errors, ["WORKER_POLL_FAILED", "WORKER_TASK_FAILED"]);
  assert.equal(polls, 3);
});
