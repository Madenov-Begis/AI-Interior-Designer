import assert from "node:assert/strict";
import test from "node:test";
import { exactOrigins } from "./cors.ts";

test("production browser origins are matched exactly", () => {
  const origins = exactOrigins("https://ruvie.cc", [], "production");
  assert.equal(origins.has("https://ruvie.cc"), true);
  assert.equal(origins.has("https://ruvie.cc.evil"), false);
  assert.equal(origins.has("http://localhost:3000"), false);
});

test("development defaults do not leak into production", () => {
  assert.equal(
    exactOrigins(undefined, ["http://localhost:3000"], "development").has(
      "http://localhost:3000",
    ),
    true,
  );
  assert.equal(
    exactOrigins(undefined, ["http://localhost:3000"], "production").size,
    0,
  );
});
