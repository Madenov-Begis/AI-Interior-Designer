import type { PaymentOrder } from "../../generated/prisma/client.ts";

export function paymentOrderSummary(order: PaymentOrder) {
  return {
    id: order.id,
    status: order.status,
    packageCode: order.packageCode,
    packageName: order.packageName,
    credits: order.credits,
    amountUzs: order.amountUzs,
    expiresAt: order.expiresAt,
    paidAt: order.paidAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export type PaymentOrderSummary = ReturnType<typeof paymentOrderSummary>;
