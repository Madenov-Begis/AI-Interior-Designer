import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../../../../prisma/migrations/20260914090000_add_room_types/migration.sql",
    import.meta.url,
  ),
  "utf8",
);

test("room catalog migration creates snapshots and the residential seed", () => {
  assert.match(migration, /CREATE TABLE "RoomType"/);
  assert.match(migration, /CREATE UNIQUE INDEX "RoomType_code_key"/);
  assert.match(migration, /ADD COLUMN "roomTypeId" UUID/);
  assert.match(migration, /ON DELETE RESTRICT/);
  for (const code of [
    "living-room",
    "bedroom",
    "kitchen",
    "bathroom",
    "kids-room",
    "home-office",
    "hallway",
    "balcony-loggia",
  ]) {
    assert.match(migration, new RegExp(`'${code}'`));
  }
});
