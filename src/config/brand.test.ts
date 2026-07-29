import assert from "node:assert/strict";
import test from "node:test";
import { resolveAppName } from "./brand.ts";

test("resolveAppName uses Renoa when the environment value is missing", () => {
  assert.equal(resolveAppName(undefined), "Renoa");
});

test("resolveAppName uses Renoa when the environment value is blank", () => {
  assert.equal(resolveAppName("   "), "Renoa");
});

test("resolveAppName trims a configured brand name", () => {
  assert.equal(resolveAppName("  New Brand  "), "New Brand");
});
