import assert from "node:assert/strict";
import test from "node:test";
import { paymentOrderSummary } from "./summary.ts";

test("public payment summaries omit owner and provider internals", () => {
  const summary = paymentOrderSummary(
    {
      id: "order-1",
      userId: "user-1",
      provider: "MOCK",
      providerOrderId: "mock-order-1",
      status: "PENDING",
      packageCode: "standard",
      packageName: "Стандарт",
      packageNameEn: "Standard",
      packageNameUz: "Standart",
      credits: 60,
      amountUzs: 69_000,
      expiresAt: new Date("2026-07-29T10:30:00.000Z"),
      paidAt: null,
      creditedAt: null,
      createdAt: new Date("2026-07-29T10:00:00.000Z"),
      updatedAt: new Date("2026-07-29T10:00:00.000Z"),
    },
    "ru",
  );

  assert.deepEqual(summary, {
    id: "order-1",
    status: "PENDING",
    packageCode: "standard",
    packageName: "Стандарт",
    credits: 60,
    amountUzs: 69_000,
    expiresAt: new Date("2026-07-29T10:30:00.000Z"),
    paidAt: null,
    createdAt: new Date("2026-07-29T10:00:00.000Z"),
    updatedAt: new Date("2026-07-29T10:00:00.000Z"),
  });
  assert.equal("userId" in summary, false);
  assert.equal("providerOrderId" in summary, false);
  assert.equal("creditedAt" in summary, false);
});
