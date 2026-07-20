import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db";
import { adminApiError, adminMutationLimit } from "@/features/admin/http";
import { updatePlanSchema } from "@/features/admin/schemas";
import { writeAuditLog } from "@/features/admin/audit";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) { const requestId = getRequestId(request.headers); try { await adminMutationLimit(request); const { profile } = await requireAdmin(); const id = z.uuid().parse((await context.params).id); const { modelIds, ...input } = updatePlanSchema.parse(await request.json()); const plan = await getDb().$transaction(async (tx) => { if (modelIds) { await tx.planModel.deleteMany({ where: { planId: id } }); if (modelIds.length) await tx.planModel.createMany({ data: modelIds.map((modelId) => ({ planId: id, modelId })) }); } return tx.plan.update({ where: { id }, data: input, include: { models: true } }); }); await writeAuditLog({ request, actorId: profile.id, action: "admin.plan.update", entityType: "Plan", entityId: id, metadata: { changedFields: Object.keys(input).concat(modelIds ? ["modelIds"] : []) } }); return apiSuccess(plan, requestId); } catch (error) { return adminApiError(error, requestId, "Не удалось обновить тариф"); } }
