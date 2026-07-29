import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { paymentHttpError } from "./http.ts";
import { PaymentServiceError } from "./service-operations.ts";

test("maps authentication and validation failures to their HTTP contracts", () => {
  const unauthorized = new Error("Требуется авторизация");
  unauthorized.name = "UnauthorizedError";
  const validation = z.object({ packageCode: z.literal("mini") });

  assert.deepEqual(paymentHttpError(unauthorized), {
    code: "UNAUTHORIZED",
    message: "Требуется авторизация",
    status: 401,
  });
  assert.deepEqual(
    paymentHttpError(
      validation.parse.bind(validation, { packageCode: "pro" }),
    ),
    {
      code: "INTERNAL_ERROR",
      message: "Не удалось выполнить платежный запрос",
      status: 500,
    },
  );
  try {
    validation.parse({ packageCode: "pro" });
    assert.fail("expected validation to fail");
  } catch (error) {
    const mapped = paymentHttpError(error);
    assert.equal(mapped.code, "VALIDATION_ERROR");
    assert.equal(mapped.status, 400);
    assert.ok(mapped.details);
  }
});

test("maps payment service failures to localized provider-neutral HTTP errors", () => {
  const cases = [
    ["PAYMENTS_DISABLED", 503, "Оплата временно недоступна"],
    [
      "MOCK_PAYMENTS_NOT_SAFE",
      403,
      "Тестовая оплата недоступна в этом режиме",
    ],
    [
      "INVALID_PAYMENT_TRANSITION",
      409,
      "Статус оплаты уже изменился. Обновите страницу",
    ],
    ["PAYMENT_ORDER_EXPIRED", 409, "Время оплаты заказа истекло"],
    [
      "PAYMENT_EVENT_MISMATCH",
      409,
      "Не удалось подтвердить результат оплаты",
    ],
    ["CREDIT_PACKAGE_NOT_FOUND", 404, "Пакет кредитов не найден"],
    ["PAYMENT_ORDER_NOT_FOUND", 404, "Заказ на оплату не найден"],
  ] as const;

  for (const [code, status, message] of cases) {
    assert.deepEqual(paymentHttpError(new PaymentServiceError(code)), {
      code,
      message,
      status,
    });
  }
});
