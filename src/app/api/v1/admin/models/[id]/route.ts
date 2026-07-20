import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db";
import { adminApiError, adminMutationLimit } from "@/features/admin/http";
import { updateModelSchema } from "@/features/admin/schemas";
import { writeAuditLog } from "@/features/admin/audit";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) { const requestId = getRequestId(request.headers); try { await adminMutationLimit(request); const { profile } = await requireAdmin(); const id = z.uuid().parse((await context.params).id); const input = updateModelSchema.parse(await request.json()); const model = await getDb().aiModel.update({ where: { id }, data: input }); await writeAuditLog({ request, actorId: profile.id, action: "admin.model.update", entityType: "AiModel", entityId: id, metadata: { changedFields: Object.keys(input) } }); return apiSuccess(model, requestId); } catch (error) { return adminApiError(error, requestId, "Не удалось обновить модель"); } }
