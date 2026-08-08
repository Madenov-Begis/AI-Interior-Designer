import assert from "node:assert/strict";
import test from "node:test";
import { resolveAppName } from "./brand.ts";

test("resolveAppName uses ROOVA when the environment value is missing", () => {
  assert.equal(resolveAppName(undefined), "ROOVA");
});

test("resolveAppName uses ROOVA when the environment value is blank", () => {
  assert.equal(resolveAppName("   "), "ROOVA");
});

test("resolveAppName trims a configured brand name", () => {
  assert.equal(resolveAppName("  New Brand  "), "New Brand");
});
