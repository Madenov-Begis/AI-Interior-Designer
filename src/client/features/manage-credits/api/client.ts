import { apiData } from "../../../shared/api/index.ts";
import type { CreditTransactionKind } from "../model/presentation.ts";

export type CreditPackage = {
  code: string;
  name: string;
  credits: number;
  priceUzs: number;
  popular: boolean;
};

export type CreditTransaction = {
  id: string;
  kind: CreditTransactionKind;
  amount: number;
  balanceAfter: number;
  createdAt: string;
};

export type CreditPackagesPayload = {
  items: CreditPackage[];
  paymentMode: "disabled" | "mock";
};

export type CreditTransactionsPayload = {
  items: CreditTransaction[];
};

export const CREDIT_PACKAGES_QUERY_KEY = ["credits", "packages"] as const;
export const CREDIT_TRANSACTIONS_QUERY_KEY = [
  "credits",
  "transactions",
] as const;

export function loadCreditPackages(signal?: AbortSignal) {
  return apiData<CreditPackagesPayload>({
    url: "/credits/packages",
    method: "GET",
    signal,
  });
}

export function loadCreditTransactions(signal?: AbortSignal) {
  return apiData<CreditTransactionsPayload>({
    url: "/credits/transactions",
    method: "GET",
    signal,
  });
}
