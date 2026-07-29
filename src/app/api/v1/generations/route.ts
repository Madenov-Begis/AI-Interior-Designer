import { after, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { createGenerationSchema, idempotencyKeySchema, listGenerationsSchema } from "@/features/generations/schema";
import { reserveRootGeneration } from "@/features/generations/reservation";
import { handleRootGenerationReservation } from "@/features/generations/route-handlers";
import { processGeneration } from "@/features/generations/worker";
import { attachHistoryResultUrls } from "@/features/generations/history-media";
import { listOwnedGenerations } from "@/features/generations/service";
import { apiError, apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireCurrentUser, UnauthorizedError } from "@/lib/auth/current-user";
import { enforceRateLimit, RateLimitError } from "@/lib/security/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    enforceRateLimit(request, "generation", 10, 60_000);
    const user = await requireCurrentUser();
    const input = createGenerationSchema.parse(await request.json());
    const idempotencyKey = idempotencyKeySchema.parse(request.headers.get("idempotency-key"));
    return await handleRootGenerationReservation(
      { userId: user.id, ...input, idempotencyKey },
      requestId,
      {
        reserve: reserveRootGeneration,
        schedule: (generationId) =>
          after(() => processGeneration(generationId)),
      },
    );
  } catch (error) {
    if (error instanceof RateLimitError) return apiError("RATE_LIMITED", error.message, requestId, 429);
    if (error instanceof UnauthorizedError) return apiError("UNAUTHORIZED", error.message, requestId, 401);
    if (error instanceof ZodError) return apiError("VALIDATION_ERROR", "Проверьте инструкцию и формат", requestId, 400, error.flatten());
    return apiError("GENERATION_CREATE_FAILED", "Не удалось создать генерацию", requestId, 500);
  }
}

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const input = listGenerationsSchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const generations = await listOwnedGenerations(user.id, input);
    const items = await attachHistoryResultUrls(
      generations.items,
      async (bucket, paths) => {
        const result = await getSupabaseAdmin().storage
          .from(bucket)
          .createSignedUrls(paths, 600);
        if (result.error) return [];
        return result.data.flatMap((file) =>
          file.path && file.signedUrl
            ? [{ path: file.path, signedUrl: file.signedUrl }]
            : [],
        );
      },
    );
    return apiSuccess({ ...generations, items }, requestId);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiError("UNAUTHORIZED", error.message, requestId, 401);
    if (error instanceof ZodError) return apiError("VALIDATION_ERROR", "Некорректные фильтры истории", requestId, 400, error.flatten());
    return apiError("HISTORY_READ_FAILED", "Не удалось получить историю", requestId, 500);
  }
}
