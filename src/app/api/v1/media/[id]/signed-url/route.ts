import { type NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireCurrentUser, UnauthorizedError } from "@/lib/auth/current-user";
import { getDb } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { enforceRateLimit, RateLimitError } from "@/lib/security/rate-limit";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  try {
    enforceRateLimit(request, "signed-url", 60, 60_000);
    const user = await requireCurrentUser();
    const { id } = await context.params;
    const fileId = z.uuid().parse(id);
    const file = await getDb().mediaFile.findFirst({
      where: { id: fileId, ownerId: user.id, deletedAt: null },
    });
    if (!file)
      return apiError("FILE_NOT_FOUND", "Файл не найден", requestId, 404);

    const { data, error } = await getSupabaseAdmin()
      .storage.from(file.bucket)
      .createSignedUrl(file.path, 600);
    if (error)
      return apiError(
        "SIGNED_URL_FAILED",
        "Не удалось открыть файл",
        requestId,
        502,
      );
    const response = apiSuccess(
      { url: data.signedUrl, expiresIn: 600 },
      requestId,
    );
    response.headers.set("cache-control", "private, no-store");
    return response;
  } catch (error) {
    if (error instanceof RateLimitError)
      return apiError("RATE_LIMITED", error.message, requestId, 429);
    if (error instanceof UnauthorizedError)
      return apiError("UNAUTHORIZED", error.message, requestId, 401);
    if (error instanceof z.ZodError)
      return apiError("FILE_NOT_FOUND", "Файл не найден", requestId, 404);
    return apiError(
      "INTERNAL_ERROR",
      "Не удалось открыть файл",
      requestId,
      500,
    );
  }
}
