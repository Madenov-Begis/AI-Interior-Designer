import { randomUUID } from "node:crypto";

export type NormalizedPaymentEvent = {
  provider: "MOCK" | "PAYME" | "CLICK";
  providerEventId: string;
  orderId: string;
  outcome: "PAID" | "FAILED" | "CANCELLED" | "EXPIRED";
  occurredAt: Date;
};

export type CheckoutOrder = {
  id: string;
  amountUzs: number;
  credits: number;
};

export interface CheckoutProvider {
  createCheckout(order: CheckoutOrder): Promise<{
    checkoutUrl: string;
    providerOrderId: string;
  }>;
}

export class MockPaymentProvider implements CheckoutProvider {
  async createCheckout(order: CheckoutOrder) {
    return {
      checkoutUrl: `/app/credits/checkout/${order.id}`,
      providerOrderId: `mock-${order.id}`,
    };
  }

  createOutcomeEvent(
    order: CheckoutOrder,
    outcome: "PAID" | "FAILED" | "CANCELLED",
  ): NormalizedPaymentEvent {
    return {
      provider: "MOCK",
      providerEventId: randomUUID(),
      orderId: order.id,
      outcome,
      occurredAt: new Date(),
    };
  }
}
