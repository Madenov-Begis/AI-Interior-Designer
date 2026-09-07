import "server-only";

import { getDb } from "@/server/shared/db/prisma";
import { serverEnv } from "@/server/shared/config/env";
import { adminPeriodRange } from "./time";
import { generationStatuses } from "./presentation";

export async function getAdminStats(period: "today" | "7d" | "30d") {
  const db = getDb();
  const range = adminPeriodRange(period, serverEnv().APP_TIMEZONE);
  const periodWhere = {
    createdAt: { gte: range.from, lte: range.to },
    deletedAt: null,
  };
  const [
    users,
    projects,
    generations,
    activeUsers,
    periodGenerations,
    statusRows,
    queued,
    processing,
  ] = await Promise.all([
    db.profile.count(),
    db.project.count({ where: { deletedAt: null } }),
    db.generation.count({ where: { deletedAt: null } }),
    db.profile.count({
      where: { status: "ACTIVE", lastLoginAt: { gte: range.from } },
    }),
    db.$queryRaw<Array<{ date: string; count: number }>>`
      SELECT to_char("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${range.timeZone}, 'YYYY-MM-DD') AS date, COUNT(*)::int AS count
      FROM "Generation"
      WHERE "createdAt" >= ${range.from} AND "createdAt" <= ${range.to} AND "deletedAt" IS NULL
      GROUP BY date
    `,
    db.generation.groupBy({
      by: ["status"],
      where: periodWhere,
      _count: { _all: true },
    }),
    db.generation.count({ where: { status: "QUEUED", deletedAt: null } }),
    db.generation.count({ where: { status: "PROCESSING", deletedAt: null } }),
  ]);
  const statusBreakdown = Object.fromEntries(
    generationStatuses.map((status) => [status, 0]),
  ) as Record<(typeof generationStatuses)[number], number>;
  for (const row of statusRows) statusBreakdown[row.status] = row._count._all;
  const daily = new Map(range.dateKeys.map((date) => [date, 0]));
  for (const item of periodGenerations) {
    if (daily.has(item.date)) daily.set(item.date, item.count);
  }
  return {
    period: {
      key: range.period,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      timeZone: range.timeZone,
    },
    totals: { users, projects, generations },
    activity: {
      activeUsers,
      generations: periodGenerations.reduce((sum, row) => sum + row.count, 0),
      failed: statusBreakdown.FAILED,
    },
    queue: { queued, processing },
    statusBreakdown,
    dailySeries: Array.from(daily, ([date, count]) => ({ date, count })),
  };
}
