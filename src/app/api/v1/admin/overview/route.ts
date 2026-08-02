import type { NextRequest } from "next/server";
import { getAdminOverview } from "@/features/admin/overview";
import { adminApiError } from "@/features/admin/http";
import { apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireAdmin } from "@/lib/auth/admin";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    await requireAdmin(request);
    return apiSuccess(await getAdminOverview(), requestId);
  } catch (error) {
    return adminApiError(error, requestId, "Не удалось загрузить админ-панель");
  }
}
