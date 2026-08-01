import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db";
import { adminApiError, adminMutationLimit } from "@/features/admin/http";
import { updateUserSchema } from "@/features/admin/schemas";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  try {
    await requireAdmin();
    const id = z.uuid().parse((await context.params).id);
    const profile = await getDb().profile.findUnique({
      where: { id },
      include: {
        plan: true,
        subscriptions: { orderBy: { createdAt: "desc" }, take: 10 },
        _count: { select: { projects: true, generations: true } },
      },
    });
    return profile
      ? apiSuccess(profile, requestId)
      : apiError("NOT_FOUND", "Пользователь не найден", requestId, 404);
  } catch (error) {
    return adminApiError(error, requestId, "Не удалось загрузить пользователя");
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  try {
    await adminMutationLimit(request);
    const { profile: actor } = await requireAdmin();
    const id = z.uuid().parse((await context.params).id);
    const input = updateUserSchema.parse(await request.json());
    if (
      id === actor.id &&
      (input.role === "USER" ||
        input.status === "BLOCKED" ||
        input.status === "DELETED")
    )
      return apiError(
        "SELF_LOCKOUT",
        "Нельзя лишить себя административного доступа",
        requestId,
        409,
      );
    const updated = await getDb().profile.update({
      where: { id },
      data: {
        ...input,
        vipExpiresAt:
          input.vipExpiresAt === undefined
            ? undefined
            : input.vipExpiresAt
              ? new Date(input.vipExpiresAt)
              : null,
        deletedAt:
          input.status === "DELETED"
            ? new Date()
            : input.status
              ? null
              : undefined,
      },
      include: { plan: true },
    });
    return apiSuccess(updated, requestId);
  } catch (error) {
    return adminApiError(error, requestId, "Не удалось обновить пользователя");
  }
}
