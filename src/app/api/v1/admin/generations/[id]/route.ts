import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db";
import { adminApiError } from "@/features/admin/http";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  try {
    await requireAdmin();
    const id = z.uuid().parse((await context.params).id);
    const item = await getDb().generation.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
        project: { select: { id: true, name: true } },
        references: {
          orderBy: { position: "asc" },
          include: {
            file: {
              select: {
                id: true,
                mimeType: true,
                sizeBytes: true,
                width: true,
                height: true,
              },
            },
          },
        },
        usageEvent: true,
      },
    });
    return item
      ? apiSuccess(item, requestId)
      : apiError("NOT_FOUND", "Генерация не найдена", requestId, 404);
  } catch (error) {
    return adminApiError(error, requestId, "Не удалось загрузить генерацию");
  }
}
