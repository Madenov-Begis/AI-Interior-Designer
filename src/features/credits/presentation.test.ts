import assert from "node:assert/strict";
import test from "node:test";
import {
  presentCreditBalance,
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
