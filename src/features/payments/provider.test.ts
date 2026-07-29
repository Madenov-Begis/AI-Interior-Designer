import assert from "node:assert/strict";
import test from "node:test";
import { MockPaymentProvider } from "./provider.ts";

const order = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  amountUzs: 69_000,
  credits: 60,
};

test("mock checkout points to the owned order checkout page", async () => {
  const checkout = await new MockPaymentProvider().createCheckout(order);

  assert.deepEqual(checkout, {
    checkoutUrl:
      "/app/credits/checkout/550e8400-e29b-41d4-a716-446655440000",
    providerOrderId: "mock-550e8400-e29b-41d4-a716-446655440000",
  });
});

test("each submitted mock outcome receives one fresh provider event id", () => {
  const provider = new MockPaymentProvider();

  const first = provider.createOutcomeEvent(order, "PAID");
  const second = provider.createOutcomeEvent(order, "PAID");

  assert.equal(first.provider, "MOCK");
  assert.equal(first.orderId, order.id);
  assert.equal(first.outcome, "PAID");
  assert.match(first.providerEventId, /^[0-9a-f-]{36}$/);
  assert.notEqual(first.providerEventId, second.providerEventId);
  assert.ok(first.occurredAt instanceof Date);
});
