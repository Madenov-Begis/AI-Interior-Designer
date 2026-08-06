import { type NextRequest } from "next/server";
import { ZodError } from "zod";
import {
  GenerationClientPayloadError,
  getGenerationClientPayload,
} from "@/server/features/generations/client-payload";
import { generationIdSchema } from "@/server/features/generations/schema";
import { softDeleteOwnedGeneration } from "@/server/features/generations/service";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import {
  requireCurrentUser,
  UnauthorizedError,
} from "@/server/features/auth/current-user";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const { id } = await context.params;
    const generationId = generationIdSchema.parse(id);
    return apiSuccess(
      await getGenerationClientPayload(user.id, generationId),
      requestId,
    );
  } catch (error) {
    if (error instanceof UnauthorizedError)
      return apiError("UNAUTHORIZED", error.message, requestId, 401);
    if (error instanceof ZodError)
      return apiError(
        "GENERATION_NOT_FOUND",
        "Генерация не найдена",
        requestId,
        404,
      );
    if (error instanceof GenerationClientPayloadError) {
      return apiError(
        error.code,
        error.message,
        requestId,
        error.code === "GENERATION_NOT_FOUND" ? 404 : 502,
      );
    }
    return apiError(
      "GENERATION_READ_FAILED",
      "Не удалось получить генерацию",
      requestId,
      500,
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const { id } = await context.params;
    const deleted = await softDeleteOwnedGeneration(
      user.id,
      generationIdSchema.parse(id),
    );
    return deleted
      ? apiSuccess({ id }, requestId)
      : apiError(
          "GENERATION_NOT_FOUND",
          "Генерацию нельзя удалить",
          requestId,
          404,
        );
  } catch (error) {
    if (error instanceof UnauthorizedError)
      return apiError("UNAUTHORIZED", error.message, requestId, 401);
    if (error instanceof ZodError)
      return apiError(
        "GENERATION_NOT_FOUND",
        "Генерация не найдена",
        requestId,
        404,
      );
    return apiError(
      "GENERATION_DELETE_FAILED",
      "Не удалось удалить генерацию",
      requestId,
      500,
    );
  }
}
