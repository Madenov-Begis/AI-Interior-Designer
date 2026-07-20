import type { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db";
import { adminApiError } from "@/features/admin/http";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    await requireAdmin();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [users, activeUsers, projects, generations, generations24h, failed24h, queued] = await Promise.all([
      getDb().profile.count({ where: { deletedAt: null } }), getDb().profile.count({ where: { status: "ACTIVE", lastLoginAt: { gte: since } } }),
      getDb().project.count({ where: { deletedAt: null } }), getDb().generation.count({ where: { deletedAt: null } }),
      getDb().generation.count({ where: { createdAt: { gte: since }, deletedAt: null } }), getDb().generation.count({ where: { createdAt: { gte: since }, status: "FAILED", deletedAt: null } }),
      getDb().generation.count({ where: { status: { in: ["QUEUED", "PROCESSING"] }, deletedAt: null } }),
    ]);
    return apiSuccess({ users, activeUsers, projects, generations, generations24h, failed24h, queued }, requestId);
  } catch (error) { return adminApiError(error, requestId, "Не удалось загрузить статистику"); }
}
