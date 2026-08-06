import "server-only";

import { getDb } from "@/server/shared/db/prisma";
import {
  ensureCreditWallet,
  getCreditWalletWithDatabase,
} from "@/server/features/credits/service-operations";

export {
  CreditBalanceError,
  creditPaidOrder,
  debitGenerationCredits,
  ensureCreditWallet,
  refundReservedGeneration,
  adjustCreditBalance,
} from "@/server/features/credits/service-operations";
export type { WalletSnapshot } from "@/server/features/credits/service-operations";

export function getCreditWallet(userId: string, transactionLimit = 30) {
  return getCreditWalletWithDatabase(getDb(), userId, transactionLimit);
}

export function getCreditBalance(userId: string) {
  return getDb().$transaction(async (tx) => {
    const wallet = await ensureCreditWallet(tx, userId);
    return wallet.balance;
  });
}

export function listCreditTransactions(userId: string, limit = 20) {
  return getDb().creditTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: Math.max(1, Math.min(50, Math.trunc(limit))),
    select: {
      id: true,
      kind: true,
      amount: true,
      balanceAfter: true,
      createdAt: true,
    },
  });
}
