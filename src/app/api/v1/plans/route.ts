import type { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import { getDb } from "@/server/shared/db/prisma";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    const plans = await getDb().plan.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        maxParallelGenerations: true,
        maxReferenceImages: true,
        maxReferenceUrls: true,
        maxUploadSizeMb: true,
        watermarkRequired: true,
        priorityProcessing: true,
      },
    });
    return apiSuccess(plans, requestId);
  } catch {
    return apiError(
      "INTERNAL_ERROR",
      "Не удалось загрузить тарифы",
      requestId,
      500,
    );
  }
}
