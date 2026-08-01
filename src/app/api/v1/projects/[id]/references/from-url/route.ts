import { type NextRequest } from "next/server";
import { ZodError } from "zod";
import { projectIdSchema } from "@/features/projects/schemas";
import { importReferenceUrlsSchema } from "@/features/references/schema";
import { importReferenceUrls } from "@/features/references/url-import";
import { apiError, apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireCurrentUser, UnauthorizedError } from "@/lib/auth/current-user";
import { enforceRateLimit, RateLimitError } from "@/lib/security/rate-limit";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  try {
    enforceRateLimit(request, "reference-url", 10, 60_000);
    const user = await requireCurrentUser();
    const { id } = await context.params;
    const { urls } = importReferenceUrlsSchema.parse(await request.json());
    const results = await importReferenceUrls(
      user.id,
      projectIdSchema.parse(id),
      urls,
    );
    return apiSuccess({ results }, requestId, {
      status: results.some((result) => !result.success) ? 207 : 201,
    });
  } catch (error) {
    if (error instanceof RateLimitError)
      return apiError("RATE_LIMITED", error.message, requestId, 429);
    if (error instanceof UnauthorizedError)
      return apiError("UNAUTHORIZED", error.message, requestId, 401);
    if (error instanceof ZodError)
      return apiError(
        "VALIDATION_ERROR",
        "Добавьте от 1 до 10 корректных URL",
        requestId,
        400,
        error.flatten(),
      );
    return apiError(
      "URL_IMPORT_FAILED",
      "Не удалось импортировать ссылки",
      requestId,
      500,
    );
  }
}
