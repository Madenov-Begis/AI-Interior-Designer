import assert from "node:assert/strict";
import test from "node:test";
import { settleFailedGeneration } from "./failure-cleanup.ts";

test("refund happens before cleanup and a failed removal does not skip other files", async () => {
  const calls: string[] = [];
  const result = await settleFailedGeneration({
    async markFailed() {
      calls.push("refund");
    },
    async readStatus() {
      return "FAILED";
    },
    files: ["original", "preview"],
    async removeFile(file) {
      calls.push(file);
      if (file === "original") throw new Error("storage unavailable");
    },
  });
  assert.deepEqual(calls, ["refund", "original", "preview"]);
  assert.equal(result.cleanupFailures, 1);
});

test("lost commit acknowledgement never deletes successful output", async () => {
  const removed: string[] = [];
  await settleFailedGeneration({
    async markFailed() {
      return false;
    },
    async readStatus() {
      return "SUCCEEDED";
    },
    files: ["original"],
    async removeFile(file) {
      removed.push(file);
    },
  });
  assert.deepEqual(removed, []);
});

test("database failure leaves output intact for later reconciliation", async () => {
  await assert.rejects(
    settleFailedGeneration({
      async markFailed() {
        throw new Error("database offline");
      },
      async readStatus() {
        return "FAILED";
      },
      files: ["original"],
      async removeFile() {
        assert.fail("must not delete");
      },
    }),
    /database offline/,
  );
});
