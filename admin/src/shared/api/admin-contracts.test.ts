import { expect, it } from "vitest";
import type { AdminGeneration, CreditPackage, CreditTransaction } from "./admin-contracts";

it("generation fixture uses the explicit contract without a model", () => {
  const generation: AdminGeneration = {
    id: "00000000-0000-4000-8000-000000000000",
    user: { id: "00000000-0000-4000-8000-000000000001", account: "Администратор" },
    project: { id: "00000000-0000-4000-8000-000000000002", name: "Гостиная" },
    parentGenerationId: null,
    status: "QUEUED",
    styleCode: null,
    aspectRatio: "RATIO_16_9",
    visualPromptUsed: false,
    attemptCount: 0,
    durationMs: null,
    estimatedCost: "0.120000",
    error: null,
    queuedAt: "2026-08-12T00:00:00.000Z",
    startedAt: null,
    completedAt: null,
    createdAt: "2026-08-12T00:00:00.000Z",
    updatedAt: "2026-08-12T00:00:00.000Z",
    canCancel: true,
  };
  expect(generation).not.toHaveProperty("model");
  expect(generation.estimatedCost).toBeTypeOf("string");
});

it("credit transaction fixture does not expose wallet or idempotency key", () => {
  const transaction: CreditTransaction = {
    id: "00000000-0000-4000-8000-000000000000",
    user: { id: "00000000-0000-4000-8000-000000000001", account: "Пользователь" },
    kind: "ADMIN_ADJUSTMENT",
    amount: 5,
    balanceAfter: 20,
    reason: "Поддержка",
    orderId: null,
    generationId: null,
    createdAt: "2026-08-12T00:00:00.000Z",
  };
  expect(transaction).not.toHaveProperty("wallet");
  expect(transaction).not.toHaveProperty("idempotencyKey");
});

it("credit package fixture exposes only editable catalog fields", () => {
  const creditPackage: CreditPackage = {
    id: "00000000-0000-4000-8000-000000000000",
    code: "standard",
    name: "Стандарт",
    description: "Оптимально для ремонта",
    credits: 60,
    priceUzs: 69_000,
    popular: true,
    active: true,
    sortOrder: 20,
    createdAt: "2026-08-12T00:00:00.000Z",
    updatedAt: "2026-08-12T00:00:00.000Z",
  };
  expect(creditPackage.code).toBe("standard");
  expect(creditPackage).not.toHaveProperty("paymentOrders");
});
