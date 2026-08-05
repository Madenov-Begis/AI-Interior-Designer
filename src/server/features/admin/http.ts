import type { NextRequest } from "next/server";
import { ZodError } from "zod";
import { apiError } from "@/server/shared/api/responses";
import { ForbiddenError } from "@/server/features/auth/admin";
import { UnauthorizedError } from "@/server/features/auth/current-user";
import { RateLimitError } from "@/server/shared/security/rate-limit";

export function adminApiError(
  error: unknown,
  requestId: string,
  fallback: string,
) {
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
  return apiError("INTERNAL_ERROR", fallback, requestId, 500);
}

export function adminMutationLimit(request: NextRequest) {
  return import("@/server/shared/security/rate-limit").then(({ enforceRateLimit }) =>
    enforceRateLimit(request, "admin-mutation", 60, 60_000),
  );
}
