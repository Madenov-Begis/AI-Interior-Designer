import { after, type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import {
  GenerationClientPayloadError,
  getGenerationClientPayload,
} from "@/server/features/generations/client-payload";
import { isInteriorStyleCode } from "@/server/features/generations/interior-styles";
import { GenerationReservationError } from "@/server/features/generations/operations";
import { reserveRootGeneration } from "@/server/features/generations/reservation";
import { retryReservationHttpStatus } from "@/server/features/generations/reservation-policy";
import { recoverExpiredGenerationReservations } from "@/server/features/generations/recovery";
import {
  namespaceRetryIdempotencyKey,
  parseRetryIdempotencyKey,
} from "@/server/features/generations/retry-policy";
import { processGeneration } from "@/server/features/generations/worker";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import { requireCurrentUser, UnauthorizedError } from "@/server/features/auth/current-user";
import { getDb } from "@/server/shared/db/prisma";
import { enforceRateLimit, RateLimitError } from "@/server/shared/security/rate-limit";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId(request.headers);
  try {
    enforceRateLimit(request, "generation-retry", 10, 60_000);
    const user = await requireCurrentUser();
    await recoverExpiredGenerationReservations(user.id);
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
    const reserved = await reserveRootGeneration({
      userId: user.id,
      projectId: generation.projectId,
      prompt: generation.prompt,
      aspectRatio: generation.aspectRatio,
      styleCode,
      idempotencyKey: namespaceRetryIdempotencyKey(id, clientIdempotencyKey),
    });
    if (!reserved.isExisting && reserved.generation.status === "QUEUED") {
      after(() => processGeneration(reserved.generation.id));
    }
    const payload = await getGenerationClientPayload(
      user.id,
      reserved.generation.id,
      "always",
    );
    return apiSuccess(
      { ...payload, retriedFromId: id, isExisting: reserved.isExisting },
      requestId,
      { status: reserved.isExisting ? 200 : 202 },
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return apiError("UNAUTHORIZED", error.message, requestId, 401);
    }
    if (error instanceof RateLimitError) {
      return apiError("RATE_LIMITED", error.message, requestId, 429);
    }
    if (error instanceof GenerationReservationError) {
      return apiError(
        error.code,
        error.message,
        requestId,
        retryReservationHttpStatus(error.code),
      );
    }
    if (error instanceof GenerationClientPayloadError) {
      return apiError(
        error.code,
        error.message,
        requestId,
        error.code === "GENERATION_NOT_FOUND" ? 404 : 502,
      );
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
