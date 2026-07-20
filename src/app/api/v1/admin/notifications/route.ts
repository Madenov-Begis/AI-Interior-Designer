import type { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db";
import { adminApiError, adminMutationLimit } from "@/features/admin/http";
import { notificationSchema } from "@/features/admin/schemas";
import { writeAuditLog } from "@/features/admin/audit";

export async function GET(request: NextRequest) { const requestId = getRequestId(request.headers); try { await requireAdmin(); return apiSuccess(await getDb().notification.findMany({ orderBy: { createdAt: "desc" } }), requestId); } catch (error) { return adminApiError(error, requestId, "Не удалось загрузить уведомления"); } }
export async function POST(request: NextRequest) { const requestId = getRequestId(request.headers); try { await adminMutationLimit(request); const { profile } = await requireAdmin(); const input = notificationSchema.parse(await request.json()); const item = await getDb().notification.create({ data: { ...input, startsAt: input.startsAt ? new Date(input.startsAt) : null, endsAt: input.endsAt ? new Date(input.endsAt) : null } }); await writeAuditLog({ request, actorId: profile.id, action: "admin.notification.create", entityType: "Notification", entityId: item.id }); return apiSuccess(item, requestId, { status: 201 }); } catch (error) { return adminApiError(error, requestId, "Не удалось создать уведомление"); } }
