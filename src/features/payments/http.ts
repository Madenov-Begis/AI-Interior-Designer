export type PaymentHttpError = {
  code: string;
  message: string;
  status: number;
  details?: unknown;
};

const paymentStatuses: Record<string, number> = {
  PAYMENTS_DISABLED: 503,
  MOCK_PAYMENTS_NOT_SAFE: 403,
  INVALID_PAYMENT_TRANSITION: 409,
  PAYMENT_ORDER_EXPIRED: 409,
  PAYMENT_EVENT_MISMATCH: 409,
  CREDIT_PACKAGE_NOT_FOUND: 404,
  PAYMENT_ORDER_NOT_FOUND: 404,
};

export function paymentHttpError(error: unknown): PaymentHttpError {
  if (error instanceof Error && error.name === "UnauthorizedError") {
    return {
      code: "UNAUTHORIZED",
      message: error.message,
      status: 401,
    };
  }
  if (error instanceof ZodError) {
    return {
      code: "VALIDATION_ERROR",
      message: "Проверьте входные данные",
      status: 400,
      details: error.flatten(),
    };
  }
  if (error instanceof PaymentServiceError) {
    return {
      code: error.code,
      message: error.message,
      status: paymentStatuses[error.code] ?? 400,
    };
  }
  return {
    code: "INTERNAL_ERROR",
    message: "Не удалось выполнить платежный запрос",
    status: 500,
  };
}
import { ZodError } from "zod";
import { PaymentServiceError } from "./service-operations.ts";
