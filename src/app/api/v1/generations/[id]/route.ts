import { type NextRequest } from "next/server";
import { ZodError } from "zod";
import { generationIdSchema } from "@/features/generations/schema";
import { getOwnedGeneration, softDeleteOwnedGeneration } from "@/features/generations/service";
import { apiError, apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireCurrentUser, UnauthorizedError } from "@/lib/auth/current-user";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const { id } = await context.params;
    const generation = await getOwnedGeneration(user.id, generationIdSchema.parse(id));
    return generation ? apiSuccess(generation, requestId) : apiError("GENERATION_NOT_FOUND", "Генерация не найдена", requestId, 404);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiError("UNAUTHORIZED", error.message, requestId, 401);
    if (error instanceof ZodError) return apiError("GENERATION_NOT_FOUND", "Генерация не найдена", requestId, 404);
    return apiError("GENERATION_READ_FAILED", "Не удалось получить генерацию", requestId, 500);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const { id } = await context.params;
    const deleted = await softDeleteOwnedGeneration(user.id, generationIdSchema.parse(id));
    return deleted ? apiSuccess({ id }, requestId) : apiError("GENERATION_NOT_FOUND", "Генерацию нельзя удалить", requestId, 404);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiError("UNAUTHORIZED", error.message, requestId, 401);
    if (error instanceof ZodError) return apiError("GENERATION_NOT_FOUND", "Генерация не найдена", requestId, 404);
    return apiError("GENERATION_DELETE_FAILED", "Не удалось удалить генерацию", requestId, 500);
  }
}
