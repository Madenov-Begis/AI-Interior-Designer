import type { NextRequest } from "next/server";
import {
  adminApiError,
  adminMutationLimit,
  parseAdminJson,
} from "@/server/features/admin/http";
import {
  adminIdSchema,
  updateRoomTypeSchema,
} from "@/server/features/admin/schemas";
import {
  deactivateAdminRoomType,
  updateAdminRoomType,
} from "@/server/features/admin/service";
import { requireAdmin } from "@/server/features/auth/admin";
import { apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const requestId = getRequestId(request.headers);
  try {
    await adminMutationLimit(request);
    await requireAdmin(request);
    const id = adminIdSchema.parse((await context.params).id);
    const input = updateRoomTypeSchema.parse(await parseAdminJson(request));
    return apiSuccess(await updateAdminRoomType(id, input), requestId);
  } catch (error) {
    return adminApiError(error, requestId, "Не удалось обновить комнату");
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const requestId = getRequestId(request.headers);
  try {
    await adminMutationLimit(request);
    await requireAdmin(request);
    const id = adminIdSchema.parse((await context.params).id);
    return apiSuccess(await deactivateAdminRoomType(id), requestId);
  } catch (error) {
    return adminApiError(error, requestId, "Не удалось отключить комнату");
  }
}
