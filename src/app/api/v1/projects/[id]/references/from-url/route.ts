import { type NextRequest } from "next/server";
import { ZodError } from "zod";
import { projectIdSchema } from "@/server/features/projects/schemas";
import { importReferenceUrlsSchema } from "@/server/features/references/schema";
import { importReferenceUrls } from "@/server/features/references/url-import";
import { attachReferencePreviewUrls } from "@/server/features/references/service";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import {
  requireCurrentUser,
  UnauthorizedError,
} from "@/server/features/auth/current-user";
import {
  enforceRateLimit,
  RateLimitError,
} from "@/server/shared/security/rate-limit";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    await enforceRateLimit(request, "reference-url", 10, 60_000, user.id);
    const { id } = await context.params;
    const { urls } = importReferenceUrlsSchema().parse(await request.json());
    const results = await importReferenceUrls(
      user.id,
      projectIdSchema.parse(id),
      urls,
    );
    const successful = results.filter((result) => result.success);
    const signed = await attachReferencePreviewUrls(user.id, successful);
    const previewUrls = new Map(
      signed.map((result) => [result.fileId, result.previewUrl]),
    );
    const clientResults = results.map((result) =>
      result.success
        ? { ...result, previewUrl: previewUrls.get(result.fileId)! }
        : result,
    );
    return apiSuccess({ results: clientResults }, requestId, {
      status: results.some((result) => !result.success) ? 207 : 201,
    });
  } catch (error) {
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
    if (error instanceof UnauthorizedError)
      return apiError("UNAUTHORIZED", error.message, requestId, 401);
    if (error instanceof ZodError)
      return apiError(
        "VALIDATION_ERROR",
        "Проверьте количество и формат URL",
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
