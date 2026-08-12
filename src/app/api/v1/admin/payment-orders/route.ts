import type { NextRequest } from "next/server";
import { adminApiError } from "@/server/features/admin/http";
import { paymentOrdersListSchema } from "@/server/features/admin/schemas";
import { listAdminPaymentOrders } from "@/server/features/admin/service";
import { requireAdmin } from "@/server/features/auth/admin";
import { apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    await requireAdmin(request);
    const input = paymentOrdersListSchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    return apiSuccess(await listAdminPaymentOrders(input), requestId);
  } catch (error) {
    return adminApiError(error, requestId, "Не удалось загрузить платежи");
  }
}
