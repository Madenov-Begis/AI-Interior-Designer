const ALLOWED_PAYMENT_TRANSITIONS = {
  PENDING: new Set(["PAID", "FAILED", "CANCELLED", "EXPIRED"]),
  PAID: new Set<string>(),
  FAILED: new Set<string>(),
  CANCELLED: new Set<string>(),
  EXPIRED: new Set<string>(),
} as const;

export type PaymentStatus = keyof typeof ALLOWED_PAYMENT_TRANSITIONS;
export type PaymentProvider = "disabled" | "mock";
export type PaymentConfiguration = {
  nodeEnv: string;
  aiProvider: string;
  paymentProvider: PaymentProvider;
};

export type CreditPackageSnapshotSource = {
  code: string;
  name: string;
  credits: number;
  priceUzs: number;
};

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus) {
  return ALLOWED_PAYMENT_TRANSITIONS[from].has(to);
}

export function snapshotCreditPackage(
  creditPackage: CreditPackageSnapshotSource,
) {
  return {
    packageCode: creditPackage.code,
    packageName: creditPackage.name,
    credits: creditPackage.credits,
    amountUzs: creditPackage.priceUzs,
  };
}

export function assertSafePaymentConfiguration(input: PaymentConfiguration) {
  if (
    input.paymentProvider === "mock" &&
    (input.nodeEnv === "production" || input.aiProvider !== "fake")
  ) {
    throw new Error("MOCK_PAYMENTS_NOT_SAFE");
  }
}
