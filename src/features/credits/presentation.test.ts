import assert from "node:assert/strict";
import test from "node:test";
import {
  checkoutPresentation,
  formatCreditAmount,
  formatUzs,
  fullGenerationCount,
  presentCreditBalance,
  presentCreditTransaction,
  presentWalletSummary,
} from "./presentation.ts";

test("profile wallet payload presents its balance and whole available generations", () => {
  const summary = presentWalletSummary({ balance: 11, generationCost: 4 });

  assert.deepEqual(summary, {
    balanceText: "Баланс: 11 кредитов",
    availableGenerationsText: "Доступно генераций: 2",
    generationCostText: "Одна генерация: 4 кредита",
    expirationText: "Кредиты не сгорают",
  });
});

test("zero balance remains visible and accessible instead of showing a generation-cost placeholder", () => {
  assert.deepEqual(presentCreditBalance(0), {
    text: "0 кредитов",
    ariaLabel: "Баланс 0 кредитов",
  });
});

test("UZS prices use Russian grouping and the сум currency suffix", () => {
  assert.equal(formatUzs(169_000), "169 000 сум");
});

test("available generations include only fully funded generations", () => {
  assert.equal(fullGenerationCount(19, 4), 4);
  assert.equal(fullGenerationCount(0, 4), 0);
});

test("credit amounts always expose their transaction sign", () => {
  assert.equal(formatCreditAmount(20), "+20");
  assert.equal(formatCreditAmount(-4), "−4");
  assert.equal(formatCreditAmount(0), "0");
});

test("credit transactions have Russian labels for every public kind", () => {
  const kinds = [
    ["SIGNUP_GRANT", "Приветственные кредиты"],
    ["PURCHASE", "Покупка кредитов"],
    ["GENERATION_DEBIT", "Генерация интерьера"],
    ["TECHNICAL_REFUND", "Возврат за техническую ошибку"],
    ["CANCELLATION_REFUND", "Возврат за отменённую генерацию"],
    ["ADMIN_ADJUSTMENT", "Корректировка баланса"],
  ] as const;

  for (const [kind, expectedLabel] of kinds) {
    assert.deepEqual(
      presentCreditTransaction({
        kind,
        amount: kind === "GENERATION_DEBIT" ? -4 : 4,
        balanceAfter: 10,
      }),
      {
        label: expectedLabel,
        amountText: kind === "GENERATION_DEBIT" ? "−4" : "+4",
        balanceText: "Баланс после операции: 10 кредитов",
      },
    );
  }
});

test("pending checkout keeps controls enabled without a terminal claim", () => {
  assert.deepEqual(checkoutPresentation("PENDING", null), {
    controlsDisabled: false,
    message: null,
    destination: null,
  });
});

test("paid checkout disables controls, confirms crediting, and returns to the workspace", () => {
  assert.deepEqual(checkoutPresentation("PAID", 70), {
    controlsDisabled: true,
    message: "Оплата прошла успешно. Новый баланс: 70 кредитов.",
    destination: {
      href: "/app",
      label: "Вернуться к созданию интерьера",
    },
  });
});

test("failed and cancelled checkouts disable controls without claiming success", () => {
  assert.deepEqual(checkoutPresentation("FAILED", null), {
    controlsDisabled: true,
    message: "Оплата завершилась ошибкой. Кредиты не зачислены.",
    destination: {
      href: "/app/credits",
      label: "Вернуться к пакетам",
    },
  });
  assert.deepEqual(checkoutPresentation("CANCELLED", null), {
    controlsDisabled: true,
    message: "Оплата отменена. Кредиты не зачислены.",
    destination: {
      href: "/app/credits",
      label: "Вернуться к пакетам",
    },
  });
});
