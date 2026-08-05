import assert from "node:assert/strict";
import test from "node:test";
import { recoverExpiredReservationsWithDependencies } from "./recovery-operations.ts";

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
