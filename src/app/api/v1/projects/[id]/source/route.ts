import { type NextRequest } from "next/server";
import { ZodError } from "zod";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import { requireCurrentUser, UnauthorizedError } from "@/server/features/auth/current-user";
import { projectIdSchema } from "@/server/features/projects/schemas";
import { ImageValidationError } from "@/server/features/media/image-validation";
import { InteriorImageValidationUnavailableError } from "@/server/features/media/interior-image-validator";
import {
  ProjectNotFoundError,
  ProjectSourceAlreadyExistsError,
  uploadProjectSource,
} from "@/server/features/media/source-upload";
import { SOURCE_IMAGE_RULES } from "@/server/shared/config/storage";
import { enforceRateLimit, RateLimitError } from "@/server/shared/security/rate-limit";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  try {
    enforceRateLimit(request, "source-upload", 20, 60_000);
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > SOURCE_IMAGE_RULES.maxBytes + 1024 * 1024)
      return apiError(
        "IMAGE_TOO_LARGE",
        "Файл превышает 15 МБ",
        requestId,
        413,
      );

    const user = await requireCurrentUser();
    const { id } = await context.params;
    const projectId = projectIdSchema.parse(id);
    const value = (await request.formData()).get("file");
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
    if (error instanceof RateLimitError)
      return apiError("RATE_LIMITED", error.message, requestId, 429);
    if (error instanceof UnauthorizedError)
      return apiError("UNAUTHORIZED", error.message, requestId, 401);
    if (error instanceof ProjectNotFoundError || error instanceof ZodError)
      return apiError("PROJECT_NOT_FOUND", "Проект не найден", requestId, 404);
    if (error instanceof ProjectSourceAlreadyExistsError)
      return apiError(
        "SOURCE_ALREADY_EXISTS",
        error.message,
        requestId,
        409,
      );
    if (error instanceof ImageValidationError)
      return apiError(error.code, error.message, requestId, 400);
    if (error instanceof InteriorImageValidationUnavailableError)
      return apiError(
        "IMAGE_VALIDATION_UNAVAILABLE",
        error.message,
        requestId,
        503,
      );
    return apiError(
      "UPLOAD_FAILED",
      "Не удалось сохранить фотографию",
      requestId,
      500,
    );
  }
}
