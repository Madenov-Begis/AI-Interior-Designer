import assert from "node:assert/strict";
import test from "node:test";
import {
  recoverExpiredReservationBatch,
  recoverExpiredReservationsWithDependencies,
  recoverInterruptedDevelopmentGenerationWithDependencies,
} from "./recovery-operations.ts";

test("recovery counts only active expired generations that transitioned", async () => {
  const now = new Date("2026-08-02T12:00:00.000Z");
  const failed: string[] = [];
  const recovered = await recoverExpiredReservationsWithDependencies(
    "user-1",
    now,
    {
      async findExpired(userId, cutoff) {
        assert.equal(userId, "user-1");
        assert.equal(cutoff, now);
        return [
          { generationId: "active-expired" },
          { generationId: "already-terminal" },
          { generationId: null },
        ];
      },
      async failGeneration(generationId) {
        failed.push(generationId);
        return generationId === "active-expired";
      },
    },
  );

  assert.equal(recovered, 1);
  assert.deepEqual(failed, ["active-expired", "already-terminal"]);
});

test("recovery continues after a failed refund and deduplicates a batch", async () => {
  const seen: string[] = [];
  const result = await recoverExpiredReservationBatch(
    [
      { generationId: "broken" },
      { generationId: "healthy" },
      { generationId: "healthy" },
      { generationId: null },
    ],
    async (id) => {
      seen.push(id);
      if (id === "broken") throw new Error("temporary database failure");
      return true;
    },
  );
  assert.deepEqual(seen, ["broken", "healthy"]);
  assert.deepEqual(result, { recovered: 1, failedIds: ["broken"] });
});

test("development recovery refunds processing work owned by a previous worker", async () => {
  const failed: string[] = [];
  const recovered = await recoverInterruptedDevelopmentGenerationWithDependencies(
    {
      nodeEnv: "development",
      userId: "user-1",
      generationId: "generation-1",
      currentWorkerId: "worker-new",
    },
    {
      async findGeneration(userId, generationId) {
        assert.equal(userId, "user-1");
        assert.equal(generationId, "generation-1");
        return { status: "PROCESSING", jobId: "worker-old:generation-1" };
      },
      async failGeneration(generationId) {
        failed.push(generationId);
        return true;
      },
    },
  );

  assert.equal(recovered, true);
  assert.deepEqual(failed, ["generation-1"]);
});

test("worker mismatch is ignored outside development", async () => {
  let reads = 0;
  const recovered = await recoverInterruptedDevelopmentGenerationWithDependencies(
    {
      nodeEnv: "production",
      userId: "user-1",
      generationId: "generation-1",
      currentWorkerId: "worker-new",
    },
    {
      async findGeneration() {
        reads += 1;
        return { status: "PROCESSING", jobId: "worker-old:generation-1" };
      },
      async failGeneration() {
        throw new Error("must not fail production work");
      },
    },
  );

  assert.equal(recovered, false);
  assert.equal(reads, 0);
});

test("current development worker keeps processing its own generation", async () => {
  let failed = false;
  const recovered = await recoverInterruptedDevelopmentGenerationWithDependencies(
    {
      nodeEnv: "development",
      userId: "user-1",
      generationId: "generation-1",
      currentWorkerId: "worker-current",
    },
    {
      async findGeneration() {
        return {
          status: "PROCESSING",
          jobId: "worker-current:generation-1",
        };
      },
      async failGeneration() {
        failed = true;
        return true;
      },
    },
  );

  assert.equal(recovered, false);
  assert.equal(failed, false);
});
