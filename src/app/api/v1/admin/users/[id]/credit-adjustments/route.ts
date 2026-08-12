import type { NextRequest } from "next/server";
import { adminApiError, adminMutationLimit, parseAdminJson } from "@/server/features/admin/http";
import { adminIdSchema, creditAdjustmentSchema } from "@/server/features/admin/schemas";
import { adjustAdminUserCredits } from "@/server/features/admin/service";
import { requireAdmin } from "@/server/features/auth/admin";
import { apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  try {
    await adminMutationLimit(request);
    const { profile: actor } = await requireAdmin(request);
    const userId = adminIdSchema.parse((await context.params).id);
    const input = creditAdjustmentSchema.parse(await parseAdminJson(request));
    return apiSuccess(await adjustAdminUserCredits(actor.id, userId, input), requestId);
  } catch (error) {
    return adminApiError(error, requestId, "Не удалось скорректировать баланс");
  }
}
