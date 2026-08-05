import assert from "node:assert/strict";
import test from "node:test";
import {
  getOrCreateEntryProjectWithDatabase,
  type EntryProjectDatabase,
  type EntryProjectTransaction,
} from "./entry-operations.ts";

test("concurrent entry requests reuse one empty project after the user lock", async () => {
  let project: { id: string } | null = null;
  let creates = 0;
  let lock = Promise.resolve();

  const database: EntryProjectDatabase = {
    async transaction<T>(callback: (tx: EntryProjectTransaction) => Promise<T>) {
      let release = () => {};
      const previous = lock;
      lock = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous;
      try {
        return await callback({
          async lockUserEntry() {},
          async findEmptyDraft() {
            return project;
          },
          async createEmptyDraft() {
            creates += 1;
            await Promise.resolve();
            project = { id: "entry-project" };
            return project;
          },
        });
      } finally {
        release();
      }
    },
  };

  const entries = await Promise.all([
    getOrCreateEntryProjectWithDatabase(database, "user-1"),
    getOrCreateEntryProjectWithDatabase(database, "user-1"),
  ]);

  assert.deepEqual(entries, [
    { id: "entry-project" },
    { id: "entry-project" },
  ]);
  assert.equal(creates, 1);
});
