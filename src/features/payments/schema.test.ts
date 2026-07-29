import assert from "node:assert/strict";
import test from "node:test";
import {
  mockOutcomeSchema,
  paymentOrderCreateSchema,
  paymentOrderIdSchema,
} from "./schema.ts";

test("payment order input accepts only a server-known package code", () => {
  assert.deepEqual(paymentOrderCreateSchema.parse({ packageCode: "standard" }), {
    packageCode: "standard",
  });
  assert.equal(
    paymentOrderCreateSchema.safeParse({
      packageCode: "standard",
      priceUzs: 1,
      credits: 1_000_000,
    }).success,
    true,
  );
  assert.equal(
    paymentOrderCreateSchema.safeParse({ packageCode: "enterprise" }).success,
    false,
  );
});

test("payment order path accepts UUIDs only", () => {
  assert.equal(
    paymentOrderIdSchema.safeParse("550e8400-e29b-41d4-a716-446655440000")
      .success,
    true,
  );
  assert.equal(paymentOrderIdSchema.safeParse("order-1").success, false);
});

test("mock outcome accepts only terminal customer outcomes", () => {
  for (const outcome of ["PAID", "FAILED", "CANCELLED"]) {
    assert.deepEqual(mockOutcomeSchema.parse({ outcome }), { outcome });
  }
  assert.equal(
    mockOutcomeSchema.safeParse({ outcome: "EXPIRED" }).success,
    false,
  );
});
