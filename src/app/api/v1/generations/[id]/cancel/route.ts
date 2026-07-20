import { type NextRequest } from "next/server";
import { ZodError } from "zod";
import { generationIdSchema } from "@/features/generations/schema";
import { cancelOwnedGeneration } from "@/features/generations/service";
import { apiError, apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireCurrentUser, UnauthorizedError } from "@/lib/auth/current-user";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const { id } = await context.params;
    const cancelled = await cancelOwnedGeneration(user.id, generationIdSchema.parse(id));
    return cancelled ? apiSuccess({ id, status: "CANCELLED" }, requestId) : apiError("GENERATION_NOT_CANCELLABLE", "Генерацию уже нельзя отменить", requestId, 409);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiError("UNAUTHORIZED", error.message, requestId, 401);
    if (error instanceof ZodError) return apiError("GENERATION_NOT_FOUND", "Генерация не найдена", requestId, 404);
    return apiError("GENERATION_CANCEL_FAILED", "Не удалось отменить генерацию", requestId, 500);
  }
}
