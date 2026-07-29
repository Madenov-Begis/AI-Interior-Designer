import assert from "node:assert/strict";
import test from "node:test";
import {
  APP_NAV_ITEMS,
  CREDIT_PACKAGES,
  GENERATION_CREDIT_COST,
  GENERATION_REFUND_MESSAGE,
} from "./product.ts";

test("shows the customer the real generation price and refund policy", () => {
  assert.equal(GENERATION_CREDIT_COST, 4);
  assert.match(GENERATION_REFUND_MESSAGE, /техническ/i);
  assert.match(GENERATION_REFUND_MESSAGE, /не списываются|возвращ/i);
});

test("keeps credit packages ordered from the smallest to the largest", () => {
  assert.deepEqual(
    CREDIT_PACKAGES.map((item) => item.credits),
    [50, 140, 400, 1200, 5000],
  );
});

test("uses unique protected navigation routes", () => {
  const hrefs = APP_NAV_ITEMS.map((item) => item.href);
  assert.equal(new Set(hrefs).size, hrefs.length);
  assert.deepEqual(hrefs, ["/app", "/app/history", "/app/profile", "/app/credits"]);
});
