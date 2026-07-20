import type { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db";
import { adminApiError, adminMutationLimit } from "@/features/admin/http";
import { modelSchema } from "@/features/admin/schemas";
import { writeAuditLog } from "@/features/admin/audit";

export async function GET(request: NextRequest) { const requestId = getRequestId(request.headers); try { await requireAdmin(); return apiSuccess(await getDb().aiModel.findMany({ orderBy: [{ priority: "desc" }, { name: "asc" }], include: { plans: { include: { plan: true } } } }), requestId); } catch (error) { return adminApiError(error, requestId, "Не удалось загрузить модели"); } }
export async function POST(request: NextRequest) { const requestId = getRequestId(request.headers); try { await adminMutationLimit(request); const { profile } = await requireAdmin(); const input = modelSchema.parse(await request.json()); const model = await getDb().aiModel.create({ data: input }); await writeAuditLog({ request, actorId: profile.id, action: "admin.model.create", entityType: "AiModel", entityId: model.id, metadata: { code: model.code, provider: model.provider } }); return apiSuccess(model, requestId, { status: 201 }); } catch (error) { return adminApiError(error, requestId, "Не удалось создать модель"); } }
