import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../../../../prisma/migrations/20260920120000_localize_public_catalogs/migration.sql",
    import.meta.url,
  ),
  "utf8",
);

test("миграция добавляет локализованные каталоги и snapshots заказа", () => {
  for (const field of [
    "nameEn",
    "nameUz",
    "descriptionEn",
    "descriptionUz",
    "packageNameEn",
    "packageNameUz",
  ]) {
    assert.match(migration, new RegExp(`"${field}"`));
  }
  assert.match(migration, /WHEN 'living-room' THEN 'Living room'/);
  assert.match(migration, /WHEN 'standard' THEN 'Standart'/);
});
