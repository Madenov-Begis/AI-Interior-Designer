import { type NextRequest } from "next/server";
import { ZodError } from "zod";
import { REFERENCE_IMAGE_RULES } from "@/config/storage";
import { ImageValidationError } from "@/features/media/image-validation";
import { projectIdSchema } from "@/features/projects/schemas";
import { addReferenceFiles, clearReferences, ReferenceLimitError, ReferenceProjectNotFoundError } from "@/features/references/service";
import { apiError, apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireCurrentUser, UnauthorizedError } from "@/lib/auth/current-user";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId(request.headers);
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > REFERENCE_IMAGE_RULES.maxBytes * REFERENCE_IMAGE_RULES.maxCount + 1024 * 1024) {
      return apiError("FILE_TOO_LARGE", "Общий размер файлов слишком велик", requestId, 413);
    }
    const user = await requireCurrentUser();
    const { id } = await context.params;
    const formData = await request.formData();
    const files = formData.getAll("files").filter((value): value is File => value instanceof File);
    const references = await addReferenceFiles(user.id, projectIdSchema.parse(id), files);
    return apiSuccess({ references }, requestId, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiError("UNAUTHORIZED", error.message, requestId, 401);
    if (error instanceof ReferenceProjectNotFoundError || error instanceof ZodError) return apiError("PROJECT_NOT_FOUND", "Проект не найден", requestId, 404);
    if (error instanceof ReferenceLimitError) return apiError("REFERENCE_LIMIT_EXCEEDED", error.message, requestId, 400);
    if (error instanceof ImageValidationError) return apiError(error.code, error.message, requestId, 400);
    return apiError("REFERENCE_UPLOAD_FAILED", "Не удалось сохранить референсы", requestId, 500);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const { id } = await context.params;
    await clearReferences(user.id, projectIdSchema.parse(id));
    return apiSuccess({ references: [] }, requestId);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiError("UNAUTHORIZED", error.message, requestId, 401);
    if (error instanceof ReferenceProjectNotFoundError || error instanceof ZodError) return apiError("PROJECT_NOT_FOUND", "Проект не найден", requestId, 404);
    return apiError("REFERENCE_CLEAR_FAILED", "Не удалось очистить референсы", requestId, 500);
  }
}
