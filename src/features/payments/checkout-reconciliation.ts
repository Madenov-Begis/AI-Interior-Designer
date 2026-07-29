type CheckoutOrder = {
  status: string;
};

export type OwnedCheckout<Order extends CheckoutOrder> = {
  order: Order;
  balance: number | null;
};

export type ReconciledCheckout<Order extends CheckoutOrder> =
  OwnedCheckout<Order> & {
    submissionError: Error | null;
  };

export class CheckoutReconciliationError extends Error {
  constructor(options: { cause: unknown }) {
    super(
      "Не удалось подтвердить состояние заказа. Обновите страницу перед повторной попыткой.",
      options,
    );
    this.name = "CheckoutReconciliationError";
  }
}

function toError(error: unknown) {
  return error instanceof Error ? error : new Error("Запрос не выполнен");
}

export async function reconcileCheckoutOutcome<Order extends CheckoutOrder>({
  submitOutcome,
  readOwnedOrder,
}: {
  submitOutcome(): Promise<unknown>;
  readOwnedOrder(): Promise<OwnedCheckout<Order>>;
}): Promise<ReconciledCheckout<Order>> {
  let submissionError: Error | null = null;
  try {
    await submitOutcome();
  } catch (error) {
    submissionError = toError(error);
  }

  let authoritative: OwnedCheckout<Order>;
  try {
    authoritative = await readOwnedOrder();
  } catch (error) {
    throw new CheckoutReconciliationError({ cause: error });
  }

  if (submissionError && authoritative.order.status === "PENDING") {
    throw new CheckoutReconciliationError({ cause: submissionError });
  }

  return {
    ...authoritative,
    submissionError: null,
  };
}
