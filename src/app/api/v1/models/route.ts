import { type NextRequest } from "next/server";
import { listAvailableModels } from "@/features/generations/service";
import { apiError, apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireCurrentUser, UnauthorizedError } from "@/lib/auth/current-user";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    return apiSuccess({ models: await listAvailableModels(user.id) }, requestId);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiError("UNAUTHORIZED", error.message, requestId, 401);
    return apiError("MODELS_READ_FAILED", "Не удалось получить список моделей", requestId, 500);
  }
}
