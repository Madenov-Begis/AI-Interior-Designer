import type { NextRequest } from "next/server";
import { adminApiError } from "@/server/features/admin/http";
import { adminIdSchema } from "@/server/features/admin/schemas";
import { getAdminGeneration } from "@/server/features/admin/service";
import { requireAdmin } from "@/server/features/auth/admin";
import { apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  try {
    await requireAdmin(request);
    const id = adminIdSchema.parse((await context.params).id);
    return apiSuccess(await getAdminGeneration(id), requestId);
  } catch (error) {
    return adminApiError(error, requestId, "Не удалось загрузить генерацию");
  }
}
