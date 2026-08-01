import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db";
import { adminApiError, adminMutationLimit } from "@/features/admin/http";
import { updatePlanSchema } from "@/features/admin/schemas";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  try {
    await adminMutationLimit(request);
    await requireAdmin();
    const id = z.uuid().parse((await context.params).id);
    const input = updatePlanSchema.parse(await request.json());
    const plan = await getDb().plan.update({ where: { id }, data: input });
    return apiSuccess(plan, requestId);
  } catch (error) {
    return adminApiError(error, requestId, "Не удалось обновить тариф");
  }
}
