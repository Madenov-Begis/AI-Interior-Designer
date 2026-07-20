import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db";
import { adminApiError, adminMutationLimit } from "@/features/admin/http";
import { updateNotificationSchema } from "@/features/admin/schemas";
import { writeAuditLog } from "@/features/admin/audit";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) { const requestId = getRequestId(request.headers); try { await adminMutationLimit(request); const { profile } = await requireAdmin(); const id = z.uuid().parse((await context.params).id); const input = updateNotificationSchema.parse(await request.json()); const item = await getDb().notification.update({ where: { id }, data: { ...input, startsAt: input.startsAt === undefined ? undefined : input.startsAt ? new Date(input.startsAt) : null, endsAt: input.endsAt === undefined ? undefined : input.endsAt ? new Date(input.endsAt) : null } }); await writeAuditLog({ request, actorId: profile.id, action: "admin.notification.update", entityType: "Notification", entityId: id, metadata: { changedFields: Object.keys(input) } }); return apiSuccess(item, requestId); } catch (error) { return adminApiError(error, requestId, "Не удалось обновить уведомление"); } }
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) { const requestId = getRequestId(request.headers); try { await adminMutationLimit(request); const { profile } = await requireAdmin(); const id = z.uuid().parse((await context.params).id); await getDb().notification.delete({ where: { id } }); await writeAuditLog({ request, actorId: profile.id, action: "admin.notification.delete", entityType: "Notification", entityId: id }); return apiSuccess({ deleted: true }, requestId); } catch (error) { return adminApiError(error, requestId, "Не удалось удалить уведомление"); } }
