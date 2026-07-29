import { after, type NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireCurrentUser, UnauthorizedError } from "@/lib/auth/current-user";
import { getDb } from "@/lib/db";
import { isInteriorStyleCode } from "@/features/generations/interior-styles";
import { processGeneration } from "@/features/generations/worker";
import { enforceRateLimit, RateLimitError } from "@/lib/security/rate-limit";
import { GenerationReservationError, reserveRootGeneration } from "@/features/generations/reservation";
import { reservationHttpStatus } from "@/features/generations/reservation-policy";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) { const requestId = getRequestId(request.headers); try { enforceRateLimit(request, "generation-retry", 10, 60_000); const user = await requireCurrentUser(); const id = z.uuid().parse((await context.params).id); const generation = await getDb().generation.findFirst({ where: { id, userId: user.id, deletedAt: null }, select: { projectId: true, prompt: true, styleCode: true, aspectRatio: true, status: true, usageEvent: true } }); if (!generation) return apiError("GENERATION_NOT_FOUND", "Генерация не найдена", requestId, 404); if (generation.status !== "FAILED" || generation.usageEvent?.status !== "REFUNDED") return apiError("GENERATION_NOT_RETRYABLE", "Эту генерацию нельзя повторить", requestId, 409); const styleCode = isInteriorStyleCode(generation.styleCode) ? generation.styleCode : undefined; const reserved = await reserveRootGeneration({ userId: user.id, projectId: generation.projectId, prompt: generation.prompt, aspectRatio: generation.aspectRatio, styleCode, idempotencyKey: `retry-${crypto.randomUUID()}` }); after(() => processGeneration(reserved.generation.id)); return apiSuccess({ id: reserved.generation.id, retriedFromId: id, status: "QUEUED" }, requestId, { status: 202 }); } catch (error) { if (error instanceof UnauthorizedError) return apiError("UNAUTHORIZED", error.message, requestId, 401); if (error instanceof RateLimitError) return apiError("RATE_LIMITED", error.message, requestId, 429); if (error instanceof GenerationReservationError) return apiError(error.code, error.message, requestId, reservationHttpStatus(error.code, error.code === "GENERATION_LIMIT_EXCEEDED" ? 429 : 409)); return apiError("RETRY_FAILED", "Не удалось повторить генерацию", requestId, 500); } }
