import assert from "node:assert/strict";
import test from "node:test";
import {
  APP_NAV_ITEMS,
  CREDIT_PACKAGES,
  GENERATION_CREDIT_COST,
  GENERATION_REFUND_MESSAGE,
  getCreditPackage,
} from "./product.ts";

test("shows customers the generation allowance in each approved UZS package", () => {
  assert.deepEqual(
    CREDIT_PACKAGES.map(({ code, credits, priceUzs }) => ({
      code,
      priceUzs,
      generations: credits / GENERATION_CREDIT_COST,
    })),
    [
      { code: "mini", priceUzs: 25_000, generations: 5 },
      { code: "standard", priceUzs: 69_000, generations: 15 },
      { code: "pro", priceUzs: 169_000, generations: 40 },
    ],
  );
});

test("returns a purchasable package by its public code", () => {
  assert.deepEqual(getCreditPackage("standard"), {
    code: "standard",
    name: "Стандарт",
    credits: 60,
    priceUzs: 69_000,
    popular: true,
  });
  assert.equal(getCreditPackage("unknown"), null);
});

test("shows the customer the refund policy", () => {
  assert.match(GENERATION_REFUND_MESSAGE, /техническ/i);
  assert.match(GENERATION_REFUND_MESSAGE, /не списываются|возвращ/i);
});

test("keeps credit packages ordered from the smallest to the largest", () => {
  assert.deepEqual(
    CREDIT_PACKAGES.map((item) => item.credits),
    [20, 60, 160],
  );
});

test("uses unique protected navigation routes", () => {
  const hrefs = APP_NAV_ITEMS.map((item) => item.href);
  assert.equal(new Set(hrefs).size, hrefs.length);
  assert.deepEqual(hrefs, ["/app", "/app/history", "/app/profile", "/app/credits"]);
});
