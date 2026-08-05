import "server-only";

import { getCreditPackage } from "@/server/shared/config/product";
import { getDb } from "@/server/shared/db/prisma";
import {
  applyPaymentEventWithDatabase,
  assertMockPaymentAccess,
  createPaymentOrderWithDependencies,
  getOwnedPaymentOrderWithDatabase,
  PaymentServiceError,
} from "@/server/features/payments/service-operations";
import {
  MockPaymentProvider,
  type NormalizedPaymentEvent,
} from "@/server/features/payments/provider";

export { PaymentServiceError } from "@/server/features/payments/service-operations";

function paymentMode(): "disabled" | "mock" {
  return process.env.PAYMENT_PROVIDER === "mock" ? "mock" : "disabled";
}

function mockConfiguration() {
  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    aiProvider: process.env.AI_PROVIDER ?? "fake",
    paymentProvider: process.env.PAYMENT_PROVIDER ?? "disabled",
  };
}

export function createPaymentOrder(userId: string, packageCode: string) {
  const mode = paymentMode();
  if (mode === "mock") assertMockPaymentAccess(mockConfiguration());
  return createPaymentOrderWithDependencies(
    {
      db: getDb(),
      provider: new MockPaymentProvider(),
      paymentMode: mode,
      getPackage: getCreditPackage,
      now: () => new Date(),
    },
    userId,
    packageCode,
  );
}

export function getOwnedPaymentOrder(userId: string, orderId: string) {
  return getOwnedPaymentOrderWithDatabase(getDb(), userId, orderId, new Date());
}

export function applyPaymentEvent(event: NormalizedPaymentEvent) {
  return applyPaymentEventWithDatabase(getDb(), event, new Date());
}

export async function submitMockPaymentOutcome(
  userId: string,
  orderId: string,
  outcome: "PAID" | "FAILED" | "CANCELLED",
) {
  assertMockPaymentAccess(mockConfiguration());
  const order = await getOwnedPaymentOrder(userId, orderId);
  if (order.status === "EXPIRED") {
    throw new PaymentServiceError("PAYMENT_ORDER_EXPIRED");
  }
  const event = new MockPaymentProvider().createOutcomeEvent(order, outcome);
  return applyPaymentEvent(event);
}
