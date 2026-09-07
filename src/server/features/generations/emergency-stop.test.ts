import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("all generation entry points enforce the emergency stop", async () => {
  const routes = await Promise.all([
    readFile(
      new URL(
        "../../../app/api/v1/projects/[id]/generations/route.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../../../app/api/v1/generations/[id]/refinements/route.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../../../app/api/v1/generations/[id]/retry/route.ts",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);

  for (const route of routes) {
    assert.match(route, /ensureGenerationsEnabled\(\)/);
    assert.match(route, /GenerationEmergencyStopError/);
    assert.match(route, /503/);
  }
});
