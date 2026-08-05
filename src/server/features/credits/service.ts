import "server-only";

import { getDb } from "@/server/shared/db/prisma";
import { getCreditWalletWithDatabase } from "@/server/features/credits/service-operations";

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
