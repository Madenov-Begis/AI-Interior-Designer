import { after, type NextRequest } from "next/server";
import { ZodError } from "zod";
import {
  GenerationClientPayloadError,
  getGenerationClientPayload,
} from "@/server/features/generations/client-payload";
import { generationIdSchema } from "@/server/features/generations/schema";
import { recoverInterruptedDevelopmentGeneration } from "@/server/features/generations/recovery";
import { processGeneration } from "@/server/features/generations/worker";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import { localeFromHeaders } from "@/server/shared/i18n/api-locale";
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
    await recoverInterruptedDevelopmentGeneration(user.id, generationId);
    const payload = await getGenerationClientPayload(
      user.id,
      generationId,
      localeFromHeaders(request.headers),
    );
    if (payload.generation.status === "QUEUED") {
      after(() => processGeneration(generationId));
    }
    return apiSuccess(payload, requestId);
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
