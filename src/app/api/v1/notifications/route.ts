import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireCurrentUser, UnauthorizedError } from "@/lib/auth/current-user";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) { const requestId = getRequestId(request.headers); try { await requireCurrentUser(); const now = new Date(); const rows = await getDb().notification.findMany({ where: { active: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] }, orderBy: { createdAt: "desc" }, take: 20 }); return apiSuccess(rows, requestId); } catch (error) { return error instanceof UnauthorizedError ? apiError("UNAUTHORIZED", error.message, requestId, 401) : apiError("INTERNAL_ERROR", "Не удалось загрузить уведомления", requestId, 500); } }
