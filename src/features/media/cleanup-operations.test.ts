import assert from "node:assert/strict";
import test from "node:test";
import { removeUnreferencedMediaWithDependencies } from "./cleanup-operations.ts";

test("unreferenced cleanup deletes the database row before Storage", async () => {
  const calls: string[] = [];
  const removed = await removeUnreferencedMediaWithDependencies("file-1", {
    async findCandidate() {
      calls.push("find");
      return { id: "file-1", bucket: "references", path: "file.webp" };
    },
    async deleteIfStillUnreferenced() {
      calls.push("delete-db");
      return true;
    },
    async removeStorageObject(bucket, path) {
      calls.push(`remove-storage:${bucket}:${path}`);
    },
  });

  assert.equal(removed, true);
  assert.deepEqual(calls, [
    "find",
    "delete-db",
    "remove-storage:references:file.webp",
  ]);
});

test("a newly referenced file is retained when the atomic delete loses the race", async () => {
  let storageCalled = false;
  const removed = await removeUnreferencedMediaWithDependencies("file-1", {
    async findCandidate() {
      return { id: "file-1", bucket: "references", path: "file.webp" };
    },
    async deleteIfStillUnreferenced() {
      return false;
    },
    async removeStorageObject() {
      storageCalled = true;
    },
  });

  assert.equal(removed, false);
  assert.equal(storageCalled, false);
});
