import assert from "node:assert/strict";
import test from "node:test";
import {
  assertSafePaymentConfiguration,
  canTransitionPayment,
  snapshotCreditPackage,
} from "./policy.ts";

test("accepts only transitions out of PENDING", () => {
  assert.equal(canTransitionPayment("PENDING", "PAID"), true);
  assert.equal(canTransitionPayment("PENDING", "FAILED"), true);
  assert.equal(canTransitionPayment("PENDING", "CANCELLED"), true);
  assert.equal(canTransitionPayment("PENDING", "EXPIRED"), true);
  assert.equal(canTransitionPayment("PAID", "FAILED"), false);
  assert.equal(canTransitionPayment("FAILED", "PAID"), false);
});

test("rejects unsafe mock payment configurations", () => {
  assert.throws(
    () =>
      assertSafePaymentConfiguration({
        nodeEnv: "production",
        aiProvider: "fake",
        paymentProvider: "mock",
      }),
    /MOCK_PAYMENTS_NOT_SAFE/,
  );
  assert.throws(
    () =>
      assertSafePaymentConfiguration({
        nodeEnv: "development",
        aiProvider: "vertex",
        paymentProvider: "mock",
      }),
    /MOCK_PAYMENTS_NOT_SAFE/,
  );
  assert.doesNotThrow(() =>
    assertSafePaymentConfiguration({
      nodeEnv: "production",
      aiProvider: "vertex",
      paymentProvider: "disabled",
    }),
  );
});

test("keeps an immutable order snapshot when package config changes", () => {
  const source = { code: "mini", name: "Мини", credits: 20, priceUzs: 25_000 };
  const snapshot = snapshotCreditPackage(source);
  source.credits = 999;
  source.priceUzs = 1;
  assert.deepEqual(snapshot, {
    packageCode: "mini",
    packageName: "Мини",
    credits: 20,
    amountUzs: 25_000,
  });
});
