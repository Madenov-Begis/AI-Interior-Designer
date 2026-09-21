import { after, type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import {
  GenerationClientPayloadError,
  getGenerationClientPayload,
} from "@/server/features/generations/client-payload";
import { GenerationReservationError } from "@/server/features/generations/operations";
import {
  reserveRefinement,
  reserveRootGeneration,
} from "@/server/features/generations/reservation";
import { buildRetryReservationPlan } from "@/server/features/generations/retry-reservation";
import { retryReservationHttpStatus } from "@/server/features/generations/reservation-policy";
import { recoverExpiredGenerationReservations } from "@/server/features/generations/recovery";
import {
  namespaceRetryIdempotencyKey,
  parseRetryIdempotencyKey,
} from "@/server/features/generations/retry-policy";
import { processGeneration } from "@/server/features/generations/worker";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import { localeFromHeaders } from "@/server/shared/i18n/api-locale";
import {
  requireCurrentUser,
  UnauthorizedError,
} from "@/server/features/auth/current-user";
import { getDb } from "@/server/shared/db/prisma";
import {
  enforceRateLimit,
  RateLimitError,
} from "@/server/shared/security/rate-limit";
import {
  ensureGenerationsEnabled,
  GenerationEmergencyStopError,
} from "@/server/features/generations/emergency-stop";

type RouteContext = { params: Promise<{ id: string }> };

export const maxDuration = 300;

export async function POST(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    await enforceRateLimit(request, "generation-retry", 10, 60_000, user.id);
    ensureGenerationsEnabled();
    await recoverExpiredGenerationReservations(user.id);
    const id = z.uuid().parse((await context.params).id);
    const clientIdempotencyKey = parseRetryIdempotencyKey(
      request.headers.get("idempotency-key"),
    );
    const generation = await getDb().generation.findFirst({
      where: { id, userId: user.id, deletedAt: null },
      select: {
        projectId: true,
        parentGenerationId: true,
        prompt: true,
        styleCode: true,
        roomTypeId: true,
        roomCode: true,
        roomName: true,
        roomPrompt: true,
        aspectRatio: true,
        visualPromptImageId: true,
        references: {
          orderBy: { position: "asc" },
          select: { fileId: true },
        },
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

    const idempotencyKey = namespaceRetryIdempotencyKey(
      id,
      clientIdempotencyKey,
    );
    const plan = buildRetryReservationPlan(generation);
    const reserved =
      plan.kind === "refinement"
        ? await reserveRefinement({
            userId: user.id,
            idempotencyKey,
            ...plan.input,
          })
        : await reserveRootGeneration({
            userId: user.id,
            idempotencyKey,
            ...plan.input,
          });
    if (!reserved.isExisting && reserved.generation.status === "QUEUED") {
      after(() => processGeneration(reserved.generation.id));
    }
    const payload = await getGenerationClientPayload(
      user.id,
      reserved.generation.id,
      localeFromHeaders(request.headers),
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
    if (error instanceof GenerationEmergencyStopError) {
      return apiError(error.code, error.message, requestId, 503);
    }
    if (error instanceof RateLimitError) {
      const response = await apiError(
        "RATE_LIMITED",
        error.message,
        requestId,
        429,
      );
      response.headers.set("retry-after", String(error.retryAfter));
      return response;
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
