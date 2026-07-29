import assert from "node:assert/strict";
import test from "node:test";
import {
  ApiResponseError,
  creditsInvalidationQueryKey,
  generationWalletPresentation,
  readApiData,
} from "./client-wallet.ts";

test("API failures preserve the server error code and message", async () => {
  const response = Response.json(
    {
      error: {
        code: "INSUFFICIENT_CREDITS",
        message: "Для генерации нужно 4 кредита",
      },
      meta: { requestId: "request-1" },
    },
    { status: 402 },
  );

  await assert.rejects(readApiData(response), (error: unknown) => {
    assert.ok(error instanceof ApiResponseError);
    assert.equal(error.code, "INSUFFICIENT_CREDITS");
    assert.equal(error.message, "Для генерации нужно 4 кредита");
    return true;
  });
});

test("root generation is disabled with a purchase reason below four credits", () => {
  const presentation = generationWalletPresentation(
    { balance: 3, generationCost: 4 },
    "root",
  );

  assert.equal(presentation.balanceInsufficient, true);
  assert.equal(
    presentation.disabledReason,
    "Недостаточно кредитов. Пополните баланс.",
  );
});

test("refinement is disabled with a purchase reason below four credits", () => {
  const presentation = generationWalletPresentation(
    { balance: 3, generationCost: 4 },
    "refinement",
  );

  assert.equal(presentation.balanceInsufficient, true);
  assert.equal(
    presentation.disabledReason,
    "Недостаточно кредитов. Пополните баланс.",
  );
});

test("zero balance is shown as zero with no available full generations", () => {
  const presentation = generationWalletPresentation(
    { balance: 0, generationCost: 4 },
    "root",
  );

  assert.equal(presentation.balanceText, "Баланс: 0 кредитов");
  assert.equal(
    presentation.availableGenerationsText,
    "Доступно полных генераций: 0",
  );
  assert.equal(presentation.balanceInsufficient, true);
});

test("root and refinement buttons state their exact credit price", () => {
  assert.equal(
    generationWalletPresentation(
      { balance: 10, generationCost: 4 },
      "root",
    ).buttonLabel,
    "Создать дизайн · 4 кредита",
  );
  assert.equal(
    generationWalletPresentation(
      { balance: 10, generationCost: 4 },
      "refinement",
    ).buttonLabel,
    "Создать доработку · 4 кредита",
  );
});

test("purchase link follows a low balance or authoritative insufficient-credit error", () => {
  assert.deepEqual(
    generationWalletPresentation(
      { balance: 3, generationCost: 4 },
      "root",
    ).purchaseLink,
    { href: "/app/credits", label: "Пополнить баланс" },
  );
  assert.deepEqual(
    generationWalletPresentation(
      { balance: 40, generationCost: 4 },
      "refinement",
      "INSUFFICIENT_CREDITS",
    ).purchaseLink,
    { href: "/app/credits", label: "Пополнить баланс" },
  );
  assert.equal(
    generationWalletPresentation(
      { balance: 40, generationCost: 4 },
      "root",
      "GENERATION_ALREADY_RUNNING",
    ).purchaseLink,
    null,
  );
});

test("credit query invalidation follows reservation, terminal, cancellation-refund, and stale-error lifecycles", () => {
  assert.deepEqual(creditsInvalidationQueryKey("reservation"), ["credits"]);
  assert.deepEqual(creditsInvalidationQueryKey("terminal"), ["credits"]);
  assert.deepEqual(creditsInvalidationQueryKey("cancellation-refund"), [
    "credits",
  ]);
  assert.deepEqual(creditsInvalidationQueryKey("insufficient-error"), [
    "credits",
  ]);
  assert.equal(creditsInvalidationQueryKey("poll"), null);
});
