import type { NextRequest } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { ForbiddenError } from "@/server/features/auth/admin";
import { UnauthorizedError } from "@/server/features/auth/current-user";
import { CreditBalanceError } from "@/server/features/credits/service";
import { apiError } from "@/server/shared/api/responses";
import { RateLimitError } from "@/server/shared/security/rate-limit";

export class AdminServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: 400 | 404 | 409 | 502,
  ) {
    super(message);
    this.name = "AdminServiceError";
  }
}

export async function parseAdminJson(request: NextRequest) {
  try {
    return JSON.parse(await request.text()) as unknown;
  } catch {
    throw new AdminServiceError("MALFORMED_JSON", "Некорректный JSON", 400);
  }
}

export function adminApiError(error: unknown, requestId: string, fallback: string) {
  if (error instanceof UnauthorizedError)
    return apiError("UNAUTHORIZED", error.message, requestId, 401);
  if (error instanceof ForbiddenError)
    return apiError("FORBIDDEN", error.message, requestId, 403);
  if (error instanceof RateLimitError) {
    const response = apiError("RATE_LIMITED", error.message, requestId, 429);
    response.headers.set("retry-after", String(error.retryAfter));
    return response;
  }
  if (error instanceof ZodError)
    return apiError(
      "VALIDATION_ERROR",
      "Проверьте введённые данные",
      requestId,
      422,
      error.flatten(),
    );
  if (error instanceof AdminServiceError)
    return apiError(error.code, error.message, requestId, error.status);
  if (error instanceof CreditBalanceError) {
    const message =
      error.code === "INSUFFICIENT_CREDITS"
        ? "Недостаточно кредитов для списания"
        : "Не удалось изменить баланс";
    return apiError(error.code, message, requestId, 409);
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025")
      return apiError("NOT_FOUND", "Запись не найдена", requestId, 404);
    if (error.code === "P2002")
      return apiError("CONFLICT", "Такая запись уже существует", requestId, 409);
  }
  console.error("Unexpected admin API error", {
    requestId,
    name: error instanceof Error ? error.name : typeof error,
  });
  return apiError("INTERNAL_ERROR", fallback, requestId, 500);
}

export function adminMutationLimit(request: NextRequest) {
  return import("@/server/shared/security/rate-limit").then(({ enforceRateLimit }) =>
    enforceRateLimit(request, "admin-mutation", 60, 60_000),
  );
}
