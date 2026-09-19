import assert from "node:assert/strict";
import test from "node:test";
import { authCookieDomain } from "./cookie-domain.ts";

test("local auth cookies never inherit the production domain", () => {
  assert.equal(authCookieDomain("development", ".ruvie.cc"), undefined);
  assert.equal(authCookieDomain("test", ".ruvie.cc"), undefined);
});

test("production auth cookies retain the configured shared domain", () => {
  assert.equal(authCookieDomain("production", ".ruvie.cc"), ".ruvie.cc");
});
