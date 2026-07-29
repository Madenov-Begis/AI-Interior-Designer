import "server-only";

import { getDb } from "@/lib/db";
import {
  getCreditWalletWithDatabase,
} from "@/features/credits/service-operations";

export {
  CreditBalanceError,
  creditPaidOrder,
  debitGenerationCredits,
  ensureCreditWallet,
  refundReservedGeneration,
} from "@/features/credits/service-operations";
export type { WalletSnapshot } from "@/features/credits/service-operations";

export function getCreditWallet(userId: string, transactionLimit = 30) {
  return getCreditWalletWithDatabase(getDb(), userId, transactionLimit);
}
