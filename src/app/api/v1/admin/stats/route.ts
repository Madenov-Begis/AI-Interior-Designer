import type { NextRequest } from "next/server";
import { adminApiError } from "@/server/features/admin/http";
import { adminPeriodSchema } from "@/server/features/admin/schemas";
import { getAdminStats } from "@/server/features/admin/service";
import { requireAdmin } from "@/server/features/auth/admin";
import { apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    await requireAdmin(request);
    const period = adminPeriodSchema.parse(request.nextUrl.searchParams.get("period") ?? "today");
    return apiSuccess(await getAdminStats(period), requestId);
  } catch (error) {
    return adminApiError(error, requestId, "Не удалось загрузить статистику");
  }
}
