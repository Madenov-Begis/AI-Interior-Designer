import assert from "node:assert/strict";
import test from "node:test";
import { allowedCookieOrigin } from "./cookie-origin.ts";

test("cookie mutations reject absent, opaque and unrelated origins", () => {
  const original = process.env.APP_ORIGINS;
  process.env.APP_ORIGINS = "https://app.example.com";
  try {
    const check = (origin?: string) =>
      allowedCookieOrigin({
        headers: new Headers(origin ? { origin } : {}),
        nextUrl: { origin: "https://api.example.com" },
      });
    assert.equal(check(), false);
    assert.equal(check("null"), false);
    assert.equal(check("https://attacker.example"), false);
    assert.equal(check("https://app.example.com.attacker.example"), false);
    assert.equal(check("https://app.example.com"), true);
    assert.equal(check("https://api.example.com"), true);
  } finally {
    if (original === undefined) delete process.env.APP_ORIGINS;
    else process.env.APP_ORIGINS = original;
  }
});
