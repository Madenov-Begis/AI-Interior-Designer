import type { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db";
import { adminApiError, adminMutationLimit } from "@/features/admin/http";
import { planSchema } from "@/features/admin/schemas";
import { writeAuditLog } from "@/features/admin/audit";

export async function GET(request: NextRequest) { const requestId = getRequestId(request.headers); try { await requireAdmin(); return apiSuccess(await getDb().plan.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { models: { include: { model: true } }, _count: { select: { users: true } } } }), requestId); } catch (error) { return adminApiError(error, requestId, "Не удалось загрузить тарифы"); } }
export async function POST(request: NextRequest) { const requestId = getRequestId(request.headers); try { await adminMutationLimit(request); const { profile } = await requireAdmin(); const { modelIds, ...input } = planSchema.parse(await request.json()); const plan = await getDb().plan.create({ data: { ...input, models: { create: modelIds.map((modelId) => ({ modelId })) } }, include: { models: true } }); await writeAuditLog({ request, actorId: profile.id, action: "admin.plan.create", entityType: "Plan", entityId: plan.id, metadata: { code: plan.code } }); return apiSuccess(plan, requestId, { status: 201 }); } catch (error) { return adminApiError(error, requestId, "Не удалось создать тариф"); } }
