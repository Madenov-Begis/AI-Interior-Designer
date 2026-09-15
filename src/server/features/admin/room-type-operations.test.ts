import assert from "node:assert/strict";
import test from "node:test";
import { AdminServiceError } from "./errors.ts";
import {
  deactivateRoomTypeWithDatabase,
  updateRoomTypeWithDatabase,
} from "./room-type-operations.ts";

function harness(input: { activeCount: number; active?: boolean }) {
  const current = {
    id: "room-1",
    code: "living-room",
    name: "Гостиная",
    promptModifier: "Назначение помещения: гостиная.",
    active: input.active ?? true,
    sortOrder: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  let updated = current;
  const tx = {
    $executeRaw: async () => 1,
    roomType: {
      findUnique: async () => current,
      count: async () => input.activeCount,
      update: async ({ data }: { data: Partial<typeof current> }) => {
        updated = { ...updated, ...data };
        return updated;
      },
    },
  };
  const db = {
    $transaction: async (operation: (client: typeof tx) => Promise<unknown>) =>
      operation(tx),
  };
  return {
    db,
    get updated() {
      return updated;
    },
  };
}

test("deactivation keeps the row and marks it inactive", async () => {
  const state = harness({ activeCount: 2 });
  const result = await deactivateRoomTypeWithDatabase(
    state.db as never,
    "room-1",
  );
  assert.equal(result.active, false);
  assert.equal(state.updated.id, "room-1");
});

test("the last active room cannot be disabled", async () => {
  const state = harness({ activeCount: 0 });
  await assert.rejects(
    () => deactivateRoomTypeWithDatabase(state.db as never, "room-1"),
    (error) =>
      error instanceof AdminServiceError &&
      error.code === "ROOM_CATALOG_REQUIRES_ACTIVE_ITEM" &&
      error.status === 409,
  );
  assert.equal(state.updated.active, true);
});

test("editing the last room is allowed while it remains active", async () => {
  const state = harness({ activeCount: 0 });
  const result = await updateRoomTypeWithDatabase(state.db as never, "room-1", {
    name: "Большая гостиная",
  });
  assert.equal(result.name, "Большая гостиная");
  assert.equal(result.active, true);
});
