import type { Prisma } from "../../generated/prisma/client.ts";
import type { CreditTransactionKind } from "../../generated/prisma/enums.ts";
import { SIGNUP_CREDIT_GRANT } from "../../config/product.ts";
import { creditTransactionKey } from "./policy.ts";

type CreditTx = Prisma.TransactionClient;

export type WalletSnapshot = {
  balance: number;
  transactions: Array<{
    id: string;
    kind: CreditTransactionKind;
    amount: number;
    balanceAfter: number;
    reason: string | null;
    createdAt: Date;
  }>;
};

export type CreditDatabase = {
  $transaction<T>(
    operation: (tx: CreditTx) => Promise<T>,
  ): Promise<T>;
};

export class CreditBalanceError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "CreditBalanceError";
    this.code = code;
  }
}

async function lockCreditWallet(tx: CreditTx, userId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`;
}

export async function ensureCreditWallet(tx: CreditTx, userId: string) {
  await lockCreditWallet(tx, userId);
  await tx.creditWallet.upsert({
    where: { userId },
    create: { userId, balance: SIGNUP_CREDIT_GRANT },
    update: {},
  });
  await tx.creditTransaction.createMany({
    data: {
      userId,
      kind: "SIGNUP_GRANT",
      amount: SIGNUP_CREDIT_GRANT,
      balanceAfter: SIGNUP_CREDIT_GRANT,
      idempotencyKey: creditTransactionKey("SIGNUP_GRANT", userId),
      orderId: null,
      generationId: null,
      reason: null,
    },
    skipDuplicates: true,
  });
  return tx.creditWallet.findUniqueOrThrow({ where: { userId } });
}

export function getCreditWalletWithDatabase(
  db: CreditDatabase,
  userId: string,
  transactionLimit = 30,
): Promise<WalletSnapshot> {
  return db.$transaction(async (tx) => {
    const wallet = await ensureCreditWallet(tx, userId);
    const transactions = await tx.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: transactionLimit,
      select: {
        id: true,
        kind: true,
        amount: true,
        balanceAfter: true,
        reason: true,
        createdAt: true,
      },
    });
    return {
      balance: wallet.balance,
      transactions,
    };
  });
}

export async function debitGenerationCredits(
  tx: CreditTx,
  input: {
    userId: string;
    generationId: string;
    amount: number;
  },
) {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new CreditBalanceError("INVALID_CREDIT_AMOUNT");
  }
  await lockCreditWallet(tx, input.userId);
  const result = await tx.creditWallet.updateMany({
    where: {
      userId: input.userId,
      balance: { gte: input.amount },
    },
    data: { balance: { decrement: input.amount } },
  });
  if (result.count === 0) {
    throw new CreditBalanceError("INSUFFICIENT_CREDITS");
  }

  const wallet = await tx.creditWallet.findUniqueOrThrow({
    where: { userId: input.userId },
  });
  await tx.creditTransaction.create({
    data: {
      userId: input.userId,
      kind: "GENERATION_DEBIT",
      amount: -input.amount,
      balanceAfter: wallet.balance,
      idempotencyKey: creditTransactionKey(
        "GENERATION_DEBIT",
        input.generationId,
      ),
      orderId: null,
      generationId: input.generationId,
      reason: null,
    },
  });
  return wallet.balance;
}

export async function refundReservedGeneration(
  tx: CreditTx,
  input: {
    generationId: string;
    kind: "TECHNICAL_REFUND" | "CANCELLATION_REFUND";
    reason: string;
  },
) {
  const usageEvent = await tx.usageEvent.findUnique({
    where: { generationId: input.generationId },
    select: {
      userId: true,
      creditAmount: true,
    },
  });
  if (!usageEvent) return false;

  await lockCreditWallet(tx, usageEvent.userId);
  const transition = await tx.usageEvent.updateMany({
    where: {
      generationId: input.generationId,
      status: "RESERVED",
    },
    data: {
      status: "REFUNDED",
      refundedAt: new Date(),
      reason: input.reason,
    },
  });
  if (transition.count === 0) return false;

  const wallet = await tx.creditWallet.update({
    where: { userId: usageEvent.userId },
    data: { balance: { increment: usageEvent.creditAmount } },
  });
  await tx.creditTransaction.create({
    data: {
      userId: usageEvent.userId,
      kind: input.kind,
      amount: usageEvent.creditAmount,
      balanceAfter: wallet.balance,
      idempotencyKey: creditTransactionKey(input.kind, input.generationId),
      orderId: null,
      generationId: input.generationId,
      reason: input.reason,
    },
  });
  return true;
}

export async function creditPaidOrder(
  tx: CreditTx,
  input: { orderId: string },
) {
  const owner = await tx.paymentOrder.findUniqueOrThrow({
    where: { id: input.orderId },
    select: { userId: true },
  });

  await lockCreditWallet(tx, owner.userId);
  const order = await tx.paymentOrder.findUniqueOrThrow({
    where: { id: input.orderId },
    select: {
      id: true,
      userId: true,
      status: true,
      credits: true,
      creditedAt: true,
    },
  });
  if (order.status !== "PAID") {
    throw new CreditBalanceError("PAYMENT_ORDER_NOT_PAID");
  }
  if (order.creditedAt) return null;

  const wallet = await tx.creditWallet.update({
    where: { userId: order.userId },
    data: { balance: { increment: order.credits } },
  });
  await tx.creditTransaction.create({
    data: {
      userId: order.userId,
      kind: "PURCHASE",
      amount: order.credits,
      balanceAfter: wallet.balance,
      idempotencyKey: creditTransactionKey("PURCHASE", order.id),
      orderId: order.id,
      generationId: null,
      reason: null,
    },
  });
  await tx.paymentOrder.update({
    where: { id: order.id },
    data: { creditedAt: new Date() },
  });
  return wallet.balance;
}
