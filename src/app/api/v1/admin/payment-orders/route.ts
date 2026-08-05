import type { NextRequest } from "next/server";
import { apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import { requireAdmin } from "@/server/features/auth/admin";
import { getDb } from "@/server/shared/db/prisma";
import { adminApiError } from "@/server/features/admin/http";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    await requireAdmin(request);
    const items = await getDb().paymentOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { email: true, phone: true, displayName: true } },
      },
    });
    return apiSuccess(items, requestId);
  } catch (error) {
    return adminApiError(error, requestId, "Не удалось загрузить платежи");
  }
}
