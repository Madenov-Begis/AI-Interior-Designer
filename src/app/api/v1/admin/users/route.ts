import type { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db";
import { adminApiError } from "@/features/admin/http";
import { adminListSchema } from "@/features/admin/schemas";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    await requireAdmin();
    const input = adminListSchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const where = { deletedAt: null, ...(input.query ? { OR: [{ email: { contains: input.query, mode: "insensitive" as const } }, { displayName: { contains: input.query, mode: "insensitive" as const } }] } : {}) };
    const rows = await getDb().profile.findMany({ where, take: input.limit + 1, ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}), orderBy: [{ createdAt: "desc" }, { id: "desc" }], include: { plan: true }, });
    const hasMore = rows.length > input.limit; const items = hasMore ? rows.slice(0, input.limit) : rows;
    return apiSuccess({ items, nextCursor: hasMore ? items.at(-1)?.id ?? null : null }, requestId);
  } catch (error) { return adminApiError(error, requestId, "Не удалось загрузить пользователей"); }
}
