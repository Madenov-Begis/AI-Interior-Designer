export type PaymentProvider = "disabled" | "mock";

export type PaymentConfiguration = {
  nodeEnv: string;
  aiProvider: string;
  paymentProvider: PaymentProvider;
};

export function assertSafePaymentConfiguration(input: PaymentConfiguration) {
  if (
    input.paymentProvider === "mock" &&
    (input.nodeEnv === "production" || input.aiProvider !== "fake")
  ) {
    throw new Error("MOCK_PAYMENTS_NOT_SAFE");
  }
}
