import { GENERATION_CREDIT_COST } from "../../config/product.ts";

export type CreditWalletPayload = {
  balance: number;
  generationCost: number;
};

export const CREDIT_TRANSACTION_LABELS = {
  SIGNUP_GRANT: "Приветственные кредиты",
  PURCHASE: "Покупка кредитов",
  GENERATION_DEBIT: "Генерация интерьера",
  TECHNICAL_REFUND: "Возврат за техническую ошибку",
  CANCELLATION_REFUND: "Возврат за отменённую генерацию",
  ADMIN_ADJUSTMENT: "Корректировка баланса",
} as const;

export type CreditTransactionKind = keyof typeof CREDIT_TRANSACTION_LABELS;

export type CheckoutStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED";

export function formatUzs(priceUzs: number) {
  return `${new Intl.NumberFormat("ru-RU").format(priceUzs)} сум`;
}

export function fullGenerationCount(credits: number, generationCost: number) {
  if (generationCost <= 0) return 0;
  return Math.floor(credits / generationCost);
}

export function formatCreditAmount(amount: number) {
  if (amount > 0) return `+${amount}`;
  if (amount < 0) return `−${Math.abs(amount)}`;
  return "0";
}

export function presentCreditTransaction(transaction: {
  kind: CreditTransactionKind;
  amount: number;
  balanceAfter: number;
}) {
  return {
    label: CREDIT_TRANSACTION_LABELS[transaction.kind],
    amountText: formatCreditAmount(transaction.amount),
    balanceText: `Баланс после операции: ${transaction.balanceAfter} кредитов`,
  };
}

export function checkoutPresentation(
  status: CheckoutStatus,
  balance: number | null,
) {
  if (status === "PENDING") {
    return {
      controlsDisabled: false,
      message: null,
      destination: null,
    };
  }
  if (status === "PAID") {
    return {
      controlsDisabled: true,
      message:
        balance == null
          ? "Оплата прошла успешно. Кредиты зачислены на баланс."
          : `Оплата прошла успешно. Новый баланс: ${balance} кредитов.`,
      destination: {
        href: "/app",
        label: "Вернуться к созданию интерьера",
      },
    };
  }
  if (status === "FAILED") {
    return {
      controlsDisabled: true,
      message: "Оплата завершилась ошибкой. Кредиты не зачислены.",
      destination: {
        href: "/app/credits",
        label: "Вернуться к пакетам",
      },
    };
  }
  if (status === "CANCELLED") {
    return {
      controlsDisabled: true,
      message: "Оплата отменена. Кредиты не зачислены.",
      destination: {
        href: "/app/credits",
        label: "Вернуться к пакетам",
      },
    };
  }
  return {
    controlsDisabled: true,
    message: "Время оплаты истекло. Кредиты не зачислены.",
    destination: {
      href: "/app/credits",
      label: "Вернуться к пакетам",
    },
  };
}

export function checkoutTerminalMessageClassName(status: CheckoutStatus) {
  return status === "PAID"
    ? "text-sm font-semibold text-success tabular-nums"
    : "text-sm font-semibold text-foreground tabular-nums";
}

export function checkoutControlsDisabled(
  status: CheckoutStatus,
  state: {
    requestPending: boolean;
    reconciliationUnresolved: boolean;
  },
) {
  return (
    status !== "PENDING" ||
    state.requestPending ||
    state.reconciliationUnresolved
  );
}

export function presentWalletSummary(wallet: CreditWalletPayload) {
  const availableGenerations = fullGenerationCount(
    wallet.balance,
    wallet.generationCost,
  );

  return {
    balanceText: `Баланс: ${wallet.balance} кредитов`,
    availableGenerationsText: `Доступно генераций: ${availableGenerations}`,
    generationCostText: `Одна генерация: ${wallet.generationCost} кредита`,
    expirationText: "Кредиты не сгорают",
  };
}

export function presentCreditBalance(balance?: number | null) {
  if (balance == null) {
    return {
      text: `${GENERATION_CREDIT_COST} / генерация`,
      ariaLabel: `Открыть кредиты. Генерация стоит ${GENERATION_CREDIT_COST} кредита`,
    };
  }

  return {
    text: `${balance} кредитов`,
    ariaLabel: `Баланс ${balance} кредитов`,
  };
}
