import { type NextRequest } from "next/server";
import { ZodError } from "zod";
import {
  GenerationClientPayloadError,
  getGenerationClientPayload,
} from "@/server/features/generations/client-payload";
import { generationIdSchema } from "@/server/features/generations/schema";
import { cancelOwnedGeneration } from "@/server/features/generations/service";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import {
  requireCurrentUser,
  UnauthorizedError,
} from "@/server/features/auth/current-user";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const { id } = await context.params;
    const cancelled = await cancelOwnedGeneration(
      user.id,
      generationIdSchema.parse(id),
    );
    if (!cancelled) {
      return apiError(
        "GENERATION_NOT_CANCELLABLE",
        "Генерацию уже нельзя отменить",
        requestId,
        409,
      );
    }
    return apiSuccess(await getGenerationClientPayload(user.id, id), requestId);
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
      "GENERATION_CANCEL_FAILED",
      "Не удалось отменить генерацию",
      requestId,
      500,
    );
  }
}
