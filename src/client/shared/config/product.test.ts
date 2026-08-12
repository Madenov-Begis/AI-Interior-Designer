import assert from "node:assert/strict";
import test from "node:test";
import {
  APP_NAV_ITEMS,
  GENERATION_REFUND_MESSAGE,
} from "./product.ts";

test("shows the customer the refund policy", () => {
  assert.match(GENERATION_REFUND_MESSAGE, /техническ/i);
  assert.match(GENERATION_REFUND_MESSAGE, /не списываются|возвращ/i);
});

test("uses unique protected navigation routes", () => {
  const hrefs = APP_NAV_ITEMS.map((item) => item.href);
  assert.equal(new Set(hrefs).size, hrefs.length);
  assert.deepEqual(hrefs, ["/app", "/app/profile", "/app/credits"]);
});
