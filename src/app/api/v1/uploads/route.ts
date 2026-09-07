import type { NextRequest } from "next/server";
import { ZodError } from "zod";
import {
  requireCurrentUser,
  UnauthorizedError,
} from "@/server/features/auth/current-user";
import {
  initializeUpload,
  stagedUploadSchema,
} from "@/server/features/media/staged-upload";
import {
  enforceRateLimit,
  RateLimitError,
} from "@/server/shared/security/rate-limit";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    await enforceRateLimit(request, "upload-init", 60, 60_000, user.id);
    return apiSuccess(
      await initializeUpload(
        user.id,
        stagedUploadSchema.parse(await request.json()),
      ),
      requestId,
    );
  } catch (error) {
    if (error instanceof UnauthorizedError)
      return apiError("UNAUTHORIZED", error.message, requestId, 401);
    if (error instanceof RateLimitError) {
      const response = apiError("RATE_LIMITED", error.message, requestId, 429);
      response.headers.set("retry-after", String(error.retryAfter));
      return response;
    }
    if (error instanceof ZodError)
      return apiError(
        "INVALID_UPLOAD",
        "Проверьте формат и размер файла",
        requestId,
        400,
      );
    const code = error instanceof Error ? error.message : "UPLOAD_INIT_FAILED";
    return apiError(
      ["UPLOAD_TOO_LARGE", "UPLOAD_TARGET_NOT_FOUND"].includes(code)
        ? code
        : "UPLOAD_INIT_FAILED",
      "Не удалось подготовить загрузку файла",
      requestId,
      code === "UPLOAD_TOO_LARGE"
        ? 413
        : code === "UPLOAD_TARGET_NOT_FOUND"
          ? 404
          : 503,
    );
  }
}
