import assert from "node:assert/strict";
import test from "node:test";
import {
  handleMockOutcomePost,
  handlePaymentOrderGet,
  handlePaymentOrderPost,
} from "./route-handlers.ts";

const user = {
  id: "d9428888-122b-11e1-b85c-61cd3cbb3210",
};

function malformedRequest() {
  return new Request("http://localhost/api/v1/payment-orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: '{"packageCode":',
  });
}

test("create-order POST returns validation 400 for malformed JSON before service operations", async () => {
  const response = await handlePaymentOrderPost(
    malformedRequest(),
    "request-create",
    {
      requireCurrentUser: async () => user,
      createPaymentOrder: async () => {
        throw new Error("SERVICE_OPERATION_ENTERED");
      },
    },
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: {
      code: "VALIDATION_ERROR",
      message: "Проверьте входные данные",
    },
    meta: { requestId: "request-create" },
  });
});

test("mock-outcome POST returns validation 400 for malformed JSON before service operations", async () => {
  const response = await handleMockOutcomePost(
    malformedRequest(),
    { params: Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440000" }) },
    "request-outcome",
    {
      requireCurrentUser: async () => user,
      submitMockPaymentOutcome: async () => {
        throw new Error("SERVICE_OPERATION_ENTERED");
      },
    },
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: {
      code: "VALIDATION_ERROR",
      message: "Проверьте входные данные",
    },
    meta: { requestId: "request-outcome" },
  });
});

test("owned PAID order GET returns its trusted balance without payment internals", async () => {
  const response = await handlePaymentOrderGet(
    { params: Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440000" }) },
    "request-owned-paid",
    {
      requireCurrentUser: async () => user,
      getOwnedPaymentOrder: async () => ({
        id: "550e8400-e29b-41d4-a716-446655440000",
        userId: user.id,
        provider: "MOCK",
        providerOrderId: "mock-secret",
        status: "PAID",
        packageCode: "standard",
        packageName: "Стандарт",
        credits: 60,
        amountUzs: 69_000,
        expiresAt: new Date("2026-07-29T10:30:00.000Z"),
        paidAt: new Date("2026-07-29T10:05:00.000Z"),
        creditedAt: new Date("2026-07-29T10:05:00.000Z"),
        createdAt: new Date("2026-07-29T10:00:00.000Z"),
        updatedAt: new Date("2026-07-29T10:05:00.000Z"),
      }),
      getCreditBalance: async () => 70,
    },
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.data.balance, 70);
  assert.equal(payload.data.order.status, "PAID");
  assert.equal(payload.data.order.packageName, "Стандарт");
  assert.equal("userId" in payload.data.order, false);
  assert.equal("provider" in payload.data.order, false);
  assert.equal("providerOrderId" in payload.data.order, false);
  assert.equal("creditedAt" in payload.data.order, false);
});

test("owned PENDING order GET does not depend on an unrelated balance read", async () => {
  const response = await handlePaymentOrderGet(
    { params: Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440000" }) },
    "request-owned-pending",
    {
      requireCurrentUser: async () => user,
      getOwnedPaymentOrder: async () => ({
        id: "550e8400-e29b-41d4-a716-446655440000",
        userId: user.id,
        provider: "MOCK",
        providerOrderId: "mock-secret",
        status: "PENDING",
        packageCode: "standard",
        packageName: "Стандарт",
        credits: 60,
        amountUzs: 69_000,
        expiresAt: new Date("2026-07-29T10:30:00.000Z"),
        paidAt: null,
        creditedAt: null,
        createdAt: new Date("2026-07-29T10:00:00.000Z"),
        updatedAt: new Date("2026-07-29T10:00:00.000Z"),
      }),
      getCreditBalance: async () => {
        throw new Error("BALANCE_READ_MUST_BE_DEFERRED");
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.balance, null);
});
