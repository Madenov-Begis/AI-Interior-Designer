import "server-only";

import { getDb } from "@/lib/db";

export const DEFAULT_MODEL_CODE = "fake-interior-v1";

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
    const model = await tx.aiModel.upsert({
      where: { code: DEFAULT_MODEL_CODE },
      create: {
        provider: "FAKE",
        code: DEFAULT_MODEL_CODE,
        externalModelId: DEFAULT_MODEL_CODE,
        name: "Mock Interior Studio",
        description: "Локальный provider для разработки интерфейса без внешних credentials",
        supportedAspectRatios: ["RATIO_1_1", "RATIO_16_9", "RATIO_9_16", "RATIO_4_3", "RATIO_3_4"],
        supportsVisualPrompt: true,
      },
      update: {},
    });
    await tx.planModel.upsert({ where: { planId_modelId: { planId: freePlan.id, modelId: model.id } }, create: { planId: freePlan.id, modelId: model.id }, update: {} });
    await tx.planModel.upsert({ where: { planId_modelId: { planId: vipPlan.id, modelId: model.id } }, create: { planId: vipPlan.id, modelId: model.id }, update: {} });
    return { freePlan, vipPlan, model };
  });
}
