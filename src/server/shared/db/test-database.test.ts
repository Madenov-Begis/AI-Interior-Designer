import assert from "node:assert/strict";
import test from "node:test";
import {
  requireIsolatedTestDatabase,
  TIMEWEB_TEST_DATABASE_URL,
} from "./test-database.ts";

test("разрешена только выделенная локальная тестовая БД", () => {
  assert.equal(
    requireIsolatedTestDatabase(TIMEWEB_TEST_DATABASE_URL),
    TIMEWEB_TEST_DATABASE_URL,
  );
  for (const url of [
    undefined,
    "invalid",
    "postgresql://localhost/production",
    "postgresql://remote.example.invalid/ruvie_refactor_test",
    "postgresql://localhost/ruvie_refactor_test?host=remote.example.invalid",
    "https://localhost/ruvie_refactor_test",
  ]) {
    assert.throws(() => requireIsolatedTestDatabase(url));
  }
});
