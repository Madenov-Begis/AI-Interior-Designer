import type { NextRequest } from "next/server";
import { adminApiError, adminMutationLimit, parseAdminJson } from "@/server/features/admin/http";
import { adminIdSchema, updateUserSchema } from "@/server/features/admin/schemas";
import { getAdminUser, updateAdminUser } from "@/server/features/admin/service";
import { requireAdmin } from "@/server/features/auth/admin";
import { apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  const requestId = getRequestId(request.headers);
  try {
    await requireAdmin(request);
    const id = adminIdSchema.parse((await context.params).id);
    return apiSuccess(await getAdminUser(id), requestId);
  } catch (error) {
    return adminApiError(error, requestId, "Не удалось загрузить пользователя");
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  const requestId = getRequestId(request.headers);
  try {
    await adminMutationLimit(request);
    const { profile: actor } = await requireAdmin(request);
    const id = adminIdSchema.parse((await context.params).id);
    const input = updateUserSchema.parse(await parseAdminJson(request));
    return apiSuccess(await updateAdminUser(actor.id, id, input), requestId);
  } catch (error) {
    return adminApiError(error, requestId, "Не удалось обновить пользователя");
  }
}
