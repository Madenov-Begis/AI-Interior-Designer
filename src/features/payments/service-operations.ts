import type {
  PaymentOrder,
  Prisma,
  PrismaClient,
} from "../../generated/prisma/client.ts";
import { creditPaidOrder } from "../credits/service-operations.ts";
import type { CreditPackageSnapshotSource } from "./policy.ts";
import {
  assertSafePaymentConfiguration,
  canTransitionPayment,
  snapshotCreditPackage,
} from "./policy.ts";
import type {
  CheckoutProvider,
  NormalizedPaymentEvent,
} from "./provider.ts";

export type PaymentDatabase = Pick<
  PrismaClient,
  "$transaction" | "paymentOrder"
>;

const PAYMENT_ERROR_MESSAGES: Record<string, string> = {
  PAYMENTS_DISABLED: "Оплата временно недоступна",
  MOCK_PAYMENTS_NOT_SAFE: "Тестовая оплата недоступна в этом режиме",
  INVALID_PAYMENT_TRANSITION:
    "Статус оплаты уже изменился. Обновите страницу",
  PAYMENT_ORDER_EXPIRED: "Время оплаты заказа истекло",
  PAYMENT_EVENT_MISMATCH: "Не удалось подтвердить результат оплаты",
  CREDIT_PACKAGE_NOT_FOUND: "Пакет кредитов не найден",
  PAYMENT_ORDER_NOT_FOUND: "Заказ на оплату не найден",
};

export class PaymentServiceError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(
      PAYMENT_ERROR_MESSAGES[code] ??
        "Не удалось выполнить платёжный запрос",
    );
    this.name = "PaymentServiceError";
    this.code = code;
  }
}

export async function createPaymentOrderWithDependencies(
  dependencies: {
    db: PaymentDatabase;
    provider: CheckoutProvider;
    paymentMode: "disabled" | "mock";
    getPackage: (code: string) => CreditPackageSnapshotSource | null;
    now: () => Date;
  },
  userId: string,
  packageCode: string,
) {
  if (dependencies.paymentMode === "disabled") {
    throw new PaymentServiceError("PAYMENTS_DISABLED");
  }
  const creditPackage = dependencies.getPackage(packageCode);
  if (!creditPackage) {
    throw new PaymentServiceError("CREDIT_PACKAGE_NOT_FOUND");
  }

  const now = dependencies.now();
  const order = await dependencies.db.paymentOrder.create({
    data: {
      userId,
      provider: "MOCK",
      status: "PENDING",
      ...snapshotCreditPackage(creditPackage),
      expiresAt: new Date(now.getTime() + 30 * 60 * 1_000),
    },
  });
  const checkout = await dependencies.provider.createCheckout(order);
  const updatedOrder = await dependencies.db.paymentOrder.update({
    where: { id: order.id },
    data: { providerOrderId: checkout.providerOrderId },
  });
  return { order: updatedOrder, checkoutUrl: checkout.checkoutUrl };
}

export async function getOwnedPaymentOrderWithDatabase(
  db: PaymentDatabase,
  userId: string,
  orderId: string,
  now: Date,
) {
  await db.paymentOrder.updateMany({
    where: {
      id: orderId,
      userId,
      status: "PENDING",
      expiresAt: { lte: now },
    },
    data: { status: "EXPIRED" },
  });
  const order = await db.paymentOrder.findFirst({
    where: { id: orderId, userId },
  });
  if (!order) {
    throw new PaymentServiceError("PAYMENT_ORDER_NOT_FOUND");
  }
  return order;
}

type PaymentEventApplication = {
  order: PaymentOrder;
  balance: number | null;
  rejection?: "PAYMENT_ORDER_EXPIRED";
};

async function finalEventResult(
  tx: Prisma.TransactionClient,
  order: PaymentOrder,
): Promise<PaymentEventApplication> {
  if (order.status !== "PAID") return { order, balance: null };
  const wallet = await tx.creditWallet.findUnique({
    where: { userId: order.userId },
    select: { balance: true },
  });
  return { order, balance: wallet?.balance ?? null };
}

export async function applyPaymentEventWithDatabase(
  db: PaymentDatabase,
  event: NormalizedPaymentEvent,
  now: Date,
) {
  const result = await db.$transaction(async (tx) => {
    const inserted = await tx.paymentEvent.createMany({
      data: {
        provider: event.provider,
        providerEventId: event.providerEventId,
        orderId: event.orderId,
        outcome: event.outcome,
        createdAt: event.occurredAt,
      },
      skipDuplicates: true,
    });
    if (inserted.count === 0) {
      const previousEvent = await tx.paymentEvent.findUnique({
        where: {
          provider_providerEventId: {
            provider: event.provider,
            providerEventId: event.providerEventId,
          },
        },
      });
      if (
        !previousEvent ||
        previousEvent.orderId !== event.orderId ||
        previousEvent.outcome !== event.outcome
      ) {
        throw new PaymentServiceError("PAYMENT_EVENT_MISMATCH");
      }
      const previousOrder = await tx.paymentOrder.findUnique({
        where: { id: previousEvent.orderId },
      });
      if (!previousOrder) {
        throw new PaymentServiceError("PAYMENT_ORDER_NOT_FOUND");
      }
      if (
        previousOrder.status === "EXPIRED" &&
        previousEvent.outcome !== "EXPIRED"
      ) {
        return {
          order: previousOrder,
          balance: null,
          rejection: "PAYMENT_ORDER_EXPIRED" as const,
        };
      }
      return finalEventResult(tx, previousOrder);
    }

    const [order] = await tx.$queryRaw<PaymentOrder[]>`
      SELECT *
      FROM "PaymentOrder"
      WHERE "id" = ${event.orderId}::uuid
      FOR NO KEY UPDATE
    `;
    if (!order) {
      throw new PaymentServiceError("PAYMENT_ORDER_NOT_FOUND");
    }
    if (order.provider !== event.provider || order.id !== event.orderId) {
      throw new PaymentServiceError("PAYMENT_EVENT_MISMATCH");
    }

    if (order.status === "PENDING" && order.expiresAt <= now) {
      const expired = await tx.paymentOrder.update({
        where: { id: order.id },
        data: { status: "EXPIRED" },
      });
      return {
        order: expired,
        balance: null,
        rejection:
          event.outcome === "EXPIRED"
            ? undefined
            : ("PAYMENT_ORDER_EXPIRED" as const),
      };
    }
    if (!canTransitionPayment(order.status, event.outcome)) {
      throw new PaymentServiceError("INVALID_PAYMENT_TRANSITION");
    }

    await tx.paymentOrder.update({
      where: { id: order.id },
      data:
        event.outcome === "PAID"
          ? { status: event.outcome, paidAt: event.occurredAt }
          : { status: event.outcome },
    });
    const balance =
      event.outcome === "PAID"
        ? await creditPaidOrder(tx, { orderId: order.id })
        : null;
    const finalOrder = await tx.paymentOrder.findUniqueOrThrow({
      where: { id: order.id },
    });
    return { order: finalOrder, balance };
  });

  if (result.rejection) {
    throw new PaymentServiceError(result.rejection);
  }
  return result;
}

export function assertMockPaymentAccess(configuration: {
  nodeEnv: string;
  aiProvider: string;
  paymentProvider: string;
}) {
  if (configuration.paymentProvider !== "mock") {
    throw new PaymentServiceError("MOCK_PAYMENTS_NOT_SAFE");
  }
  try {
    assertSafePaymentConfiguration({
      nodeEnv: configuration.nodeEnv,
      aiProvider: configuration.aiProvider,
      paymentProvider: "mock",
    });
  } catch {
    throw new PaymentServiceError("MOCK_PAYMENTS_NOT_SAFE");
  }
}
