import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import { requireAdmin } from "@/server/features/auth/admin";
import { cancelGenerationAsAdmin } from "@/server/features/generations/service";
import { adminApiError, adminMutationLimit } from "@/server/features/admin/http";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  try {
    await adminMutationLimit(request);
    await requireAdmin(request);
    const id = z.uuid().parse((await context.params).id);
    const cancelled = await cancelGenerationAsAdmin(id);
    if (!cancelled)
      return apiError(
        "GENERATION_NOT_CANCELLABLE",
        "Генерацию уже нельзя отменить",
        requestId,
        409,
      );
    return apiSuccess({ id, status: "CANCELLED" }, requestId);
  } catch (error) {
    return adminApiError(error, requestId, "Не удалось отменить генерацию");
  }
}
