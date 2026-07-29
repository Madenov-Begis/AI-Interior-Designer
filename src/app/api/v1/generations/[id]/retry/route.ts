import { after, type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { isInteriorStyleCode } from "@/features/generations/interior-styles";
import { reserveRootGeneration } from "@/features/generations/reservation";
import {
  namespaceRetryIdempotencyKey,
  parseRetryIdempotencyKey,
} from "@/features/generations/retry-policy";
import { handleRetryGenerationReservation } from "@/features/generations/route-handlers";
import { processGeneration } from "@/features/generations/worker";
import { apiError } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import {
  requireCurrentUser,
  UnauthorizedError,
} from "@/lib/auth/current-user";
import { getDb } from "@/lib/db";
import {
  enforceRateLimit,
  RateLimitError,
} from "@/lib/security/rate-limit";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId(request.headers);
  try {
    enforceRateLimit(request, "generation-retry", 10, 60_000);
    const user = await requireCurrentUser();
    const id = z.uuid().parse((await context.params).id);
    const clientIdempotencyKey = parseRetryIdempotencyKey(
      request.headers.get("idempotency-key"),
    );
    const generation = await getDb().generation.findFirst({
      where: { id, userId: user.id, deletedAt: null },
      select: {
        projectId: true,
        prompt: true,
        styleCode: true,
        aspectRatio: true,
        status: true,
        usageEvent: true,
      },
    });
    if (!generation) {
      return apiError(
        "GENERATION_NOT_FOUND",
        "Генерация не найдена",
        requestId,
        404,
      );
    }
    if (
      generation.status !== "FAILED" ||
      generation.usageEvent?.status !== "REFUNDED"
    ) {
      return apiError(
        "GENERATION_NOT_RETRYABLE",
        "Эту генерацию нельзя повторить",
        requestId,
        409,
      );
    }

    const styleCode = isInteriorStyleCode(generation.styleCode)
      ? generation.styleCode
      : undefined;
    return await handleRetryGenerationReservation(
      {
        userId: user.id,
        projectId: generation.projectId,
        prompt: generation.prompt,
        aspectRatio: generation.aspectRatio,
        styleCode,
        idempotencyKey: namespaceRetryIdempotencyKey(
          id,
          clientIdempotencyKey,
        ),
      },
      id,
      requestId,
      {
        reserve: reserveRootGeneration,
        schedule: (generationId) =>
          after(() => processGeneration(generationId)),
      },
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return apiError("UNAUTHORIZED", error.message, requestId, 401);
    }
    if (error instanceof RateLimitError) {
      return apiError("RATE_LIMITED", error.message, requestId, 429);
    }
    if (error instanceof ZodError) {
      return apiError(
        "VALIDATION_ERROR",
        "Передайте корректный ключ повторного запроса",
        requestId,
        400,
        error.flatten(),
      );
    }
    return apiError(
      "RETRY_FAILED",
      "Не удалось повторить генерацию",
      requestId,
      500,
    );
  }
}
