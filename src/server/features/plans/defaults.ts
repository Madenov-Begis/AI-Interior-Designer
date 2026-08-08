import "server-only";

import { getDb } from "@/server/shared/db/prisma";

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
        description: "Генерации оплачиваются кредитами",
        maxParallelGenerations: 1,
        maxReferenceImages: 10,
        maxReferenceUrls: 10,
        sortOrder: 0,
      },
      update: {
        description: "Генерации оплачиваются кредитами",
      },
    });
    const vipPlan = await tx.plan.upsert({
      where: { code: "VIP" },
      create: {
        code: "VIP",
        name: "VIP",
        description: "Расширенные лимиты и приоритетная обработка",
        maxParallelGenerations: 3,
        maxReferenceImages: 10,
        maxReferenceUrls: 10,
        priorityProcessing: true,
        sortOrder: 10,
      },
      update: {},
    });
    return { freePlan, vipPlan };
  });
}
