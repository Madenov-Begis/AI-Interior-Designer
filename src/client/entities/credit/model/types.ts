export type CreditPackage = {
  code: string;
  name: string;
  credits: number;
  priceUzs: number;
  popular: boolean;
};

export type CreditTransaction = {
  id: string;
  kind: string;
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

export type OwnedCheckout = {
  id: string;
  status: "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "EXPIRED";
  packageCode: string;
  credits: number;
  priceUzs: number;
};
