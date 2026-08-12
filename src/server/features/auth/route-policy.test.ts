import assert from "node:assert/strict";
import test from "node:test";
import { isLocalDevelopmentOrigin, safeReturnOrigin } from "./route-policy.ts";

const origins = [
  "https://www.ruvie.cc",
  "https://ruvie.cc",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
].join(",");

test("returns only origins from the application allowlist", () => {
  assert.equal(
    safeReturnOrigin("http://localhost:3000", origins, "https://www.ruvie.cc"),
    "http://localhost:3000",
  );
  assert.equal(
    safeReturnOrigin("https://ruvie.cc/app", origins, "https://www.ruvie.cc"),
    "https://ruvie.cc",
  );
  assert.equal(
    safeReturnOrigin("https://evil.example", origins, "https://www.ruvie.cc"),
    "https://www.ruvie.cc",
  );
  assert.equal(
    safeReturnOrigin("not-a-url", origins, "https://www.ruvie.cc"),
    "https://www.ruvie.cc",
  );
  assert.equal(
    safeReturnOrigin(null, origins, "https://www.ruvie.cc"),
    "https://www.ruvie.cc",
  );
});

test("recognizes only HTTP localhost origins for the OAuth handoff", () => {
  assert.equal(isLocalDevelopmentOrigin("http://localhost:3000"), true);
  assert.equal(isLocalDevelopmentOrigin("http://127.0.0.1:3000"), true);
  assert.equal(isLocalDevelopmentOrigin("https://localhost:3000"), false);
  assert.equal(isLocalDevelopmentOrigin("https://www.ruvie.cc"), false);
});
