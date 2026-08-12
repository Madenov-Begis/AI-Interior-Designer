export type CreditAdjustmentValues = {
  amount: number;
  reason: string;
};

export type CreditAdjustmentAttempt = {
  fingerprint: string;
  idempotencyKey: string;
};

export function resolveCreditAdjustmentAttempt(
  current: CreditAdjustmentAttempt | null,
  values: CreditAdjustmentValues,
  createId: () => string = () => crypto.randomUUID(),
) {
  const normalizedValues = {
    amount: values.amount,
    reason: values.reason.trim(),
  };
  const fingerprint = JSON.stringify(normalizedValues);

  return {
    values: normalizedValues,
    attempt:
      current?.fingerprint === fingerprint
        ? current
        : { fingerprint, idempotencyKey: createId() },
  };
}
