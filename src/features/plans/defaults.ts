import "server-only";

import { getDb } from "@/lib/db";

export function getRequiredPlan(code: "FREE" | "VIP" = "FREE") {
  return getDb().plan.findUniqueOrThrow({ where: { code } });
}

export async function ensureSystemDefaults() {
  return getDb().$transaction(async (tx) => {
    const freePlan = await tx.plan.upsert({
      where: { code: "FREE" },
      create: {
        code: "FREE",
        name: "Обычный",
        description: "10 генераций в сутки",
        dailyGenerationLimit: 10,
        maxParallelGenerations: 1,
        maxReferenceImages: 10,
        maxReferenceUrls: 10,
        watermarkRequired: true,
        sortOrder: 0,
      },
      update: {},
    });
    const vipPlan = await tx.plan.upsert({
      where: { code: "VIP" },
      create: {
        code: "VIP",
        name: "VIP",
        description: "Расширенные лимиты без водяного знака",
        dailyGenerationLimit: 100,
        maxParallelGenerations: 3,
        maxReferenceImages: 10,
        maxReferenceUrls: 10,
        watermarkRequired: false,
        priorityProcessing: true,
        sortOrder: 10,
      },
      update: {},
    });
    return { freePlan, vipPlan };
  });
}
