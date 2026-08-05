export {
  assertSafePaymentConfiguration,
  type PaymentConfiguration,
  type PaymentProvider,
} from "../../shared/config/payment.ts";

const ALLOWED_PAYMENT_TRANSITIONS = {
  PENDING: new Set(["PAID", "FAILED", "CANCELLED", "EXPIRED"]),
  PAID: new Set<string>(),
  FAILED: new Set<string>(),
  CANCELLED: new Set<string>(),
  EXPIRED: new Set<string>(),
} as const;

export type PaymentStatus = keyof typeof ALLOWED_PAYMENT_TRANSITIONS;

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
