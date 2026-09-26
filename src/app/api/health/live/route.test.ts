import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "./route.ts";

test("liveness не требует credentials и запрещает кеширование", async () => {
  const response = GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), { status: "ok" });
});
