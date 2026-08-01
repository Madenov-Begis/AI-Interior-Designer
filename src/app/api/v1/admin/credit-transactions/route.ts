import type { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db";
import { adminApiError } from "@/features/admin/http";

export async function GET(request: NextRequest) { const requestId = getRequestId(request.headers); try { await requireAdmin(request); const items = await getDb().creditTransaction.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { wallet: { include: { user: { select: { email: true, phone: true, displayName: true } } } } } }); return apiSuccess(items, requestId); } catch (error) { return adminApiError(error, requestId, "Не удалось загрузить операции"); } }
