import { GENERATION_CREDIT_COST } from "../../config/product.ts";

export type CreditWalletPayload = {
  balance: number;
  generationCost: number;
};

export function presentWalletSummary(wallet: CreditWalletPayload) {
  const availableGenerations = Math.floor(
    wallet.balance / wallet.generationCost,
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
