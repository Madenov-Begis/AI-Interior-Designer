import { type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { getSystemLimits } from "@/server/shared/config/system-limits";
import {
  RefinementParentNotFoundError,
  RefinementReferenceLimitError,
  uploadRefinementReferences,
} from "@/server/features/generations/refinement";
import { ImageValidationError } from "@/server/features/media/image-validation";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import { requireCurrentUser, UnauthorizedError } from "@/server/features/auth/current-user";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId(request.headers);
  try {
    const limits = getSystemLimits();
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (
      contentLength >
      limits.maxUploadSizeBytes * limits.maxReferenceImages +
        1024 * 1024
    ) {
      return apiError(
        "FILE_TOO_LARGE",
        "Общий размер файлов слишком велик",
        requestId,
        413,
      );
    }
    const user = await requireCurrentUser();
    const parentId = z.uuid().parse((await context.params).id);
    const formData = await request.formData();
    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File);
    const references = await uploadRefinementReferences(
      user.id,
      parentId,
      files,
    );
    return apiSuccess({ references }, requestId, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return apiError("UNAUTHORIZED", error.message, requestId, 401);
    }
    if (
      error instanceof RefinementParentNotFoundError ||
      error instanceof ZodError
    ) {
      return apiError(
        "GENERATION_NOT_FOUND",
        "Результат не найден",
        requestId,
        404,
      );
    }
    if (error instanceof ImageValidationError) {
      return apiError(error.code, error.message, requestId, 400);
    }
    if (error instanceof RefinementReferenceLimitError) {
      return apiError(
        "REFERENCE_LIMIT_EXCEEDED",
        error.message,
        requestId,
        400,
      );
    }
    if (error instanceof Error && error.message === "REFERENCE_REQUIRED") {
      return apiError(
        "REFERENCE_REQUIRED",
        "Добавьте референс",
        requestId,
        400,
      );
    }
    return apiError(
      "REFERENCE_UPLOAD_FAILED",
      "Не удалось загрузить референс",
      requestId,
      500,
    );
  }
}
