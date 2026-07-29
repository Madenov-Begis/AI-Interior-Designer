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

test("maps payment service failures to 503, 403, 409, and 404", () => {
  const cases = [
    ["PAYMENTS_DISABLED", 503],
    ["MOCK_PAYMENTS_NOT_SAFE", 403],
    ["INVALID_PAYMENT_TRANSITION", 409],
    ["PAYMENT_ORDER_EXPIRED", 409],
    ["PAYMENT_EVENT_MISMATCH", 409],
    ["CREDIT_PACKAGE_NOT_FOUND", 404],
    ["PAYMENT_ORDER_NOT_FOUND", 404],
  ] as const;

  for (const [code, status] of cases) {
    assert.deepEqual(paymentHttpError(new PaymentServiceError(code)), {
      code,
      message: code,
      status,
    });
  }
});
