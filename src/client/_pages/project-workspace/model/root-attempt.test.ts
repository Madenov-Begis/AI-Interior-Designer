import assert from "node:assert/strict";
import test from "node:test";
import { RootAttemptRegistry, rootAttemptSignature } from "./root-attempt.ts";

test("lost response and remount reuse the reserved key, success permits a new generation", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
  const original = new RootAttemptRegistry(storage).begin(
    "user:project",
    "hash",
    () => "first",
  );
  const remounted = new RootAttemptRegistry(storage);
  const replay = remounted.begin("user:project", "hash", () => "duplicate");
  assert.equal(replay.idempotencyKey, original.idempotencyKey);
  remounted.succeed(replay);
  assert.equal(
    remounted.begin("user:project", "hash", () => "next").idempotencyKey,
    "next",
  );
});

test("root attempts distinguish every submitted input and user scope", async () => {
  const input = {
    projectId: "project",
    prompt: "Make brighter",
    aspectRatio: "RATIO_1_1",
    roomTypeId: "room-1",
    canvasState: null,
  };
  const signature = await rootAttemptSignature(input);
  for (const changed of [
    { ...input, projectId: "other" },
    { ...input, prompt: "Make darker" },
    { ...input, styleCode: "loft" },
    { ...input, aspectRatio: "RATIO_3_4" },
    { ...input, roomTypeId: "room-2" },
    { ...input, canvasState: { objects: [] } },
  ])
    assert.notEqual(await rootAttemptSignature(changed), signature);
  const registry = new RootAttemptRegistry();
  assert.notEqual(
    registry.begin("user1", signature).idempotencyKey,
    registry.begin("user2", signature).idempotencyKey,
  );
});

test("unavailable browser storage still retains a key in memory", () => {
  const unavailable = () => {
    throw new Error("storage disabled");
  };
  const registry = new RootAttemptRegistry({
    getItem: unavailable,
    setItem: unavailable,
    removeItem: unavailable,
  });
  const first = registry.begin("user", "hash");
  assert.equal(
    registry.begin("user", "hash").idempotencyKey,
    first.idempotencyKey,
  );
});
