import type { NextRequest } from "next/server";
import { adminApiError, adminMutationLimit, parseAdminJson } from "@/server/features/admin/http";
import { adminIdSchema, updatePlanSchema } from "@/server/features/admin/schemas";
import { updateAdminPlan } from "@/server/features/admin/service";
import { requireAdmin } from "@/server/features/auth/admin";
import { apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  try {
    await adminMutationLimit(request);
    await requireAdmin(request);
    const id = adminIdSchema.parse((await context.params).id);
    const input = updatePlanSchema.parse(await parseAdminJson(request));
    return apiSuccess(await updateAdminPlan(id, input), requestId);
  } catch (error) {
    return adminApiError(error, requestId, "Не удалось обновить тариф");
  }
}
