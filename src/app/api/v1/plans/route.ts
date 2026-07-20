import type { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { ensureSystemDefaults } from "@/features/plans/defaults";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) { const requestId = getRequestId(request.headers); try { await ensureSystemDefaults(); const plans = await getDb().plan.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, code: true, name: true, description: true, dailyGenerationLimit: true, maxParallelGenerations: true, maxReferenceImages: true, maxReferenceUrls: true, maxUploadSizeMb: true, watermarkRequired: true, priorityProcessing: true } }); return apiSuccess(plans, requestId); } catch { return apiError("INTERNAL_ERROR", "Не удалось загрузить тарифы", requestId, 500); } }
