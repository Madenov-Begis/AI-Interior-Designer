import type { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db";
import { adminApiError, adminMutationLimit } from "@/features/admin/http";
import { settingsSchema } from "@/features/admin/schemas";
import { writeAuditLog } from "@/features/admin/audit";
import { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) { const requestId = getRequestId(request.headers); try { await requireAdmin(); const rows = await getDb().systemSetting.findMany({ orderBy: { key: "asc" } }); return apiSuccess(Object.fromEntries(rows.map((row) => [row.key, row.value])), requestId); } catch (error) { return adminApiError(error, requestId, "Не удалось загрузить настройки"); } }
export async function PATCH(request: NextRequest) { const requestId = getRequestId(request.headers); try { await adminMutationLimit(request); const { profile } = await requireAdmin(); const input = settingsSchema.parse(await request.json()); await getDb().$transaction(Object.entries(input).map(([key, rawValue]) => { const value = rawValue === null ? Prisma.JsonNull : rawValue; return getDb().systemSetting.upsert({ where: { key }, create: { key, value }, update: { value } }); })); await writeAuditLog({ request, actorId: profile.id, action: "admin.settings.update", entityType: "SystemSetting", metadata: { keys: Object.keys(input) } }); return apiSuccess(input, requestId); } catch (error) { return adminApiError(error, requestId, "Не удалось сохранить настройки"); } }
