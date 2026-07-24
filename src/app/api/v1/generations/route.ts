import { after, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { createGenerationSchema, idempotencyKeySchema, listGenerationsSchema } from "@/features/generations/schema";
import { GenerationReservationError, reserveGeneration } from "@/features/generations/reservation";
import { processGeneration } from "@/features/generations/worker";
import { listOwnedGenerations } from "@/features/generations/service";
import { apiError, apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireCurrentUser, UnauthorizedError, upsertProfileFromAuthUser } from "@/lib/auth/current-user";
import { enforceRateLimit, RateLimitError } from "@/lib/security/rate-limit";

const reservationStatus: Record<string, number> = {
  USER_BLOCKED: 403,
  PROFILE_NOT_FOUND: 404,
  PROJECT_NOT_READY: 400,
  MODEL_NOT_FOUND: 404,
  MODEL_NOT_ALLOWED: 403,
  GENERATION_ALREADY_RUNNING: 409,
  GENERATION_LIMIT_EXCEEDED: 429,
};

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    enforceRateLimit(request, "generation", 10, 60_000);
    const user = await requireCurrentUser();
    await upsertProfileFromAuthUser(user);
    const input = createGenerationSchema.parse(await request.json());
    const idempotencyKey = idempotencyKeySchema.parse(request.headers.get("idempotency-key"));
    const reserved = await reserveGeneration({ userId: user.id, ...input, idempotencyKey });
    if (!reserved.isExisting && reserved.generation.status === "QUEUED") after(() => processGeneration(reserved.generation.id));
    return apiSuccess({ id: reserved.generation.id, status: reserved.generation.status, isExisting: reserved.isExisting }, requestId, { status: reserved.isExisting ? 200 : 202 });
  } catch (error) {
    if (error instanceof RateLimitError) return apiError("RATE_LIMITED", error.message, requestId, 429);
    if (error instanceof UnauthorizedError) return apiError("UNAUTHORIZED", error.message, requestId, 401);
    if (error instanceof GenerationReservationError) return apiError(error.code, error.message, requestId, reservationStatus[error.code] ?? 400);
    if (error instanceof ZodError) return apiError("VALIDATION_ERROR", "Проверьте инструкцию, модель и формат", requestId, 400, error.flatten());
    return apiError("GENERATION_CREATE_FAILED", "Не удалось создать генерацию", requestId, 500);
  }
}

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const input = listGenerationsSchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const generations = await listOwnedGenerations(user.id, input);
    return apiSuccess(generations, requestId);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiError("UNAUTHORIZED", error.message, requestId, 401);
    if (error instanceof ZodError) return apiError("VALIDATION_ERROR", "Некорректные фильтры истории", requestId, 400, error.flatten());
    return apiError("HISTORY_READ_FAILED", "Не удалось получить историю", requestId, 500);
  }
}
