export type CreditBalanceState = {
  balance: number;
  appliedKeys: Set<string>;
};

export type CreditMovement = {
  idempotencyKey: string;
  amount: number;
};

function assertValidBalance(balance: number) {
  if (!Number.isInteger(balance) || balance < 0) {
    throw new Error("INVALID_CREDIT_BALANCE");
  }
}

function assertValidDebitAmount(amount: number) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("INVALID_CREDIT_AMOUNT");
  }
}

function assertValidMovementAmount(amount: number) {
  if (!Number.isInteger(amount) || amount === 0) {
    throw new Error("INVALID_CREDIT_AMOUNT");
  }
}

export function canDebit(balance: number, amount: number) {
  assertValidBalance(balance);
  assertValidDebitAmount(amount);
  return balance >= amount;
}

export function balanceAfter(balance: number, signedAmount: number) {
  assertValidBalance(balance);
  assertValidMovementAmount(signedAmount);
  const projectedBalance = balance + signedAmount;
  if (projectedBalance < 0) {
    throw new Error("INSUFFICIENT_CREDITS");
  }
  return projectedBalance;
}

export function creditTransactionKey(kind: string, entityId: string) {
  return `${kind}:${entityId}`;
}

export function applyCreditMovement(
  state: CreditBalanceState,
  movement: CreditMovement,
): CreditBalanceState {
  const appliedKeys = new Set(state.appliedKeys);
  if (appliedKeys.has(movement.idempotencyKey)) {
    return { balance: state.balance, appliedKeys };
  }

  const balance = balanceAfter(state.balance, movement.amount);
  appliedKeys.add(movement.idempotencyKey);
  return { balance, appliedKeys };
}
