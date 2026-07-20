import type { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db";
import { adminApiError } from "@/features/admin/http";
import { adminListSchema } from "@/features/admin/schemas";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try { await requireAdmin(); const input = adminListSchema.parse(Object.fromEntries(request.nextUrl.searchParams)); const status = request.nextUrl.searchParams.get("status"); const allowed = ["QUEUED", "PROCESSING", "SUCCEEDED", "FAILED", "CANCELLED", "REJECTED"] as const; const rows = await getDb().generation.findMany({ where: { deletedAt: null, ...(allowed.includes(status as typeof allowed[number]) ? { status: status as typeof allowed[number] } : {}) }, take: input.limit + 1, ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}), orderBy: [{ createdAt: "desc" }, { id: "desc" }], include: { user: { select: { email: true, displayName: true } }, model: { select: { name: true, provider: true } }, project: { select: { name: true } } } }); const hasMore = rows.length > input.limit; const items = hasMore ? rows.slice(0, input.limit) : rows; return apiSuccess({ items, nextCursor: hasMore ? items.at(-1)?.id ?? null : null }, requestId); }
  catch (error) { return adminApiError(error, requestId, "Не удалось загрузить генерации"); }
}
