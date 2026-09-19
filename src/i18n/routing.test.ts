import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("next-intl owns locale negotiation only for the root route", async () => {
  const [routing, proxy] = await Promise.all([
    readFile(new URL("./routing.ts", import.meta.url), "utf8"),
    readFile(new URL("../proxy.ts", import.meta.url), "utf8"),
  ]);

  assert.match(routing, /locales:\s*\["en",\s*"ru",\s*"uz"\]/);
  assert.match(routing, /defaultLocale:\s*"en"/);
  assert.match(routing, /localePrefix:\s*"always"/);
  assert.match(proxy, /createMiddleware\(routing\)/);
  assert.match(proxy, /request\.nextUrl\.pathname === "\/"/);
});
