import type { NextRequest } from "next/server";
import { adminApiError } from "@/server/features/admin/http";
import { getAdminSession } from "@/server/features/admin/service";
import { requireAdmin } from "@/server/features/auth/admin";
import { apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    const { profile } = await requireAdmin(request);
    return apiSuccess(getAdminSession(profile), requestId);
  } catch (error) {
    return adminApiError(error, requestId, "Не удалось проверить сессию");
  }
}
