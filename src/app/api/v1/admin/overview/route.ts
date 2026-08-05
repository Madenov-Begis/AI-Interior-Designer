import type { NextRequest } from "next/server";
import { getAdminOverview } from "@/server/features/admin/overview";
import { adminApiError } from "@/server/features/admin/http";
import { apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import { requireAdmin } from "@/server/features/auth/admin";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    await requireAdmin(request);
    return apiSuccess(await getAdminOverview(), requestId);
  } catch (error) {
    return adminApiError(error, requestId, "Не удалось загрузить админ-панель");
  }
}
