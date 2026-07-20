import { type NextRequest } from "next/server";
import { getTodayUsage } from "@/features/generations/service";
import { apiError, apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireCurrentUser, UnauthorizedError, upsertProfileFromAuthUser } from "@/lib/auth/current-user";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    await upsertProfileFromAuthUser(user);
    return apiSuccess(await getTodayUsage(user.id), requestId);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiError("UNAUTHORIZED", error.message, requestId, 401);
    return apiError("USAGE_READ_FAILED", "Не удалось получить дневной лимит", requestId, 500);
  }
}
