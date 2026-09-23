import { readUploadFormData } from "@/server/features/media/staged-upload";
import { type NextRequest } from "next/server";
import { GenerationEmergencyStopError } from "@/server/features/generations/emergency-stop";
import { ZodError } from "zod";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import {
  requireCurrentUser,
  UnauthorizedError,
} from "@/server/features/auth/current-user";
import { projectIdSchema } from "@/server/features/projects/schemas";
import { ImageValidationError } from "@/server/features/media/image-validation";
import { InteriorImageValidationUnavailableError } from "@/server/features/media/interior-image-validator";
import { getInteriorImageValidationFailureDetails } from "@/server/features/media/interior-image-validation-retry";
import {
  ProjectNotFoundError,
  ProjectSourceAlreadyExistsError,
  uploadProjectSource,
} from "@/server/features/media/source-upload";
import { getSystemLimits } from "@/server/shared/config/system-limits";
import {
  enforceRateLimit,
  RateLimitError,
} from "@/server/shared/security/rate-limit";

export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  try {
    const limits = getSystemLimits();
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > limits.maxUploadSizeBytes + 1024 * 1024)
      return apiError(
        "IMAGE_TOO_LARGE",
        `Файл превышает ${limits.maxUploadSizeMb} МБ`,
        requestId,
        413,
      );

    const user = await requireCurrentUser();
    await enforceRateLimit(request, "source-upload", 20, 60_000, user.id);
    const { id } = await context.params;
    const projectId = projectIdSchema.parse(id);
    const value = (await readUploadFormData(request, user.id)).get("file");
    if (!(value instanceof File))
      return apiError(
        "FILE_REQUIRED",
        "Добавьте фотографию помещения",
        requestId,
        400,
      );

    return apiSuccess(
      await uploadProjectSource(user.id, projectId, value),
      requestId,
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof GenerationEmergencyStopError)
      return apiError(error.code, error.message, requestId, 503);
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
    if (error instanceof ProjectNotFoundError || error instanceof ZodError)
      return apiError("PROJECT_NOT_FOUND", "Проект не найден", requestId, 404);
    if (error instanceof ProjectSourceAlreadyExistsError)
      return apiError("SOURCE_ALREADY_EXISTS", error.message, requestId, 409);
    if (error instanceof ImageValidationError)
      return apiError(error.code, error.message, requestId, 400);
    if (error instanceof InteriorImageValidationUnavailableError) {
      console.error("Interior image validation failed", {
        requestId,
        modelId: error.modelId,
        attempts: error.attempts,
        ...getInteriorImageValidationFailureDetails(error.cause),
      });
      return apiError(
        "IMAGE_VALIDATION_UNAVAILABLE",
        error.message,
        requestId,
        503,
      );
    }
    return apiError(
      "UPLOAD_FAILED",
      "Не удалось сохранить фотографию",
      requestId,
      500,
    );
  }
}
