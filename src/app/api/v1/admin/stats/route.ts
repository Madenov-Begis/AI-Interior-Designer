import type { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db";
import { adminApiError } from "@/features/admin/http";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    await requireAdmin(request);
    const period = request.nextUrl.searchParams.get("period");
    const days = period === "30d" ? 30 : period === "7d" ? 7 : 1;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [
      users,
      activeUsers,
      projects,
      generations,
      generations24h,
      failed24h,
      queued,
    ] = await Promise.all([
      getDb().profile.count({ where: { deletedAt: null } }),
      getDb().profile.count({
        where: { status: "ACTIVE", lastLoginAt: { gte: since } },
      }),
      getDb().project.count({ where: { deletedAt: null } }),
      getDb().generation.count({ where: { deletedAt: null } }),
      getDb().generation.count({
        where: { createdAt: { gte: since }, deletedAt: null },
      }),
      getDb().generation.count({
        where: { createdAt: { gte: since }, status: "FAILED", deletedAt: null },
      }),
      getDb().generation.count({
        where: { status: { in: ["QUEUED", "PROCESSING"] }, deletedAt: null },
      }),
    ]);
    const dailyGenerations = await getDb().$queryRaw<
      Array<{ date: Date; count: bigint }>
    >`
      SELECT date_trunc('day', "createdAt") AS date, count(*)::bigint AS count
      FROM "Generation"
      WHERE "deletedAt" IS NULL AND "createdAt" >= ${since}
      GROUP BY 1 ORDER BY 1 ASC
    `;
    return apiSuccess(
      {
        users,
        activeUsers,
        projects,
        generations,
        generations24h,
        failed24h,
        queued,
        period: days,
        dailyGenerations: dailyGenerations.map((row) => ({
          date: row.date.toISOString().slice(0, 10),
          count: Number(row.count),
        })),
      },
      requestId,
    );
  } catch (error) {
    return adminApiError(error, requestId, "Не удалось загрузить статистику");
  }
}
