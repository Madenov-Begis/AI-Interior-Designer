import assert from "node:assert/strict";
import test from "node:test";
import {
  handleMockOutcomePost,
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
