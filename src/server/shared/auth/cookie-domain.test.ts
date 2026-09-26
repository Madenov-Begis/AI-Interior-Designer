import assert from "node:assert/strict";
import test from "node:test";
import {
  authCookieDomain,
  authCookieSecure,
  isLocalHttpOrigin,
  isLocalOAuthCallback,
} from "./cookie-domain.ts";

test("local auth cookies never inherit the production domain", () => {
  assert.equal(authCookieDomain("development", ".ruvie.cc"), undefined);
  assert.equal(authCookieDomain("test", ".ruvie.cc"), undefined);
});

test("production auth cookies retain the configured shared domain", () => {
  assert.equal(
    authCookieDomain("production", ".ruvie.cc", "https://app.ruvie.cc"),
    ".ruvie.cc",
  );
  assert.equal(authCookieSecure("production", "https://app.ruvie.cc"), true);
});

test("локальный HTTP-preview не требует Secure и общего cookie domain", () => {
  for (const appUrl of ["http://127.0.0.1:3000", "http://localhost:3000"]) {
    assert.equal(isLocalHttpOrigin(appUrl), true);
    assert.equal(authCookieSecure("production", appUrl), false);
    assert.equal(authCookieDomain("production", "localhost", appUrl), undefined);
  }
  assert.equal(isLocalHttpOrigin("http://example.com"), false);
  assert.equal(authCookieSecure("production", "http://example.com"), true);
});

test("HTTP callback разрешён только для локального адреса приложения", () => {
  assert.equal(
    isLocalOAuthCallback(
      "http://localhost:3000",
      "http://localhost:3000/auth/callback",
    ),
    true,
  );
  for (const callback of [
    "http://localhost:3001/auth/callback",
    "http://127.0.0.1:3000/auth/callback",
    "http://localhost:3000/other",
    "https://example.invalid/auth/callback",
  ])
    assert.equal(isLocalOAuthCallback("http://localhost:3000", callback), false);
});
