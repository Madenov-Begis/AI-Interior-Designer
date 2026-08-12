import assert from "node:assert/strict";
import test from "node:test";
import { resolveApiBaseUrl } from "./url.ts";

test("builds the versioned API URL from the configured domain", () => {
  assert.equal(
    resolveApiBaseUrl("https://api.ruvie.cc/"),
    "https://api.ruvie.cc/api/v1",
  );
});

test("defaults to the public Ruvie API domain", () => {
  assert.equal(resolveApiBaseUrl(undefined), "https://api.ruvie.cc/api/v1");
});
