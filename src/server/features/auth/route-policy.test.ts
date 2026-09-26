import assert from "node:assert/strict";
import test from "node:test";
import {
  authErrorUrl,
  isLocalDevelopmentOrigin,
  safeReturnOrigin,
} from "./route-policy.ts";

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

test("keeps OAuth start errors on the validated frontend origin", () => {
  assert.equal(
    authErrorUrl("http://localhost:3000", "legal_consent").toString(),
    "http://localhost:3000/login?error=legal_consent",
  );
  assert.equal(
    authErrorUrl("https://ruvie.cc", "oauth_start").toString(),
    "https://ruvie.cc/login?error=oauth_start",
  );
});
