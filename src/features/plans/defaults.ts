import "server-only";

import { getDb } from "@/lib/db";

export const DEFAULT_MODEL_CODE = "fake-interior-v1";
export const VERTEX_MODEL_CODE = "gemini-interior-v1";

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
    const vertexEnabled = process.env.AI_PROVIDER === "vertex";
    const fakeModel = await tx.aiModel.upsert({
      where: { code: DEFAULT_MODEL_CODE },
      create: {
        provider: "FAKE",
        code: DEFAULT_MODEL_CODE,
        externalModelId: DEFAULT_MODEL_CODE,
        name: "Mock Interior Studio",
        description: "Локальный provider для разработки интерфейса без внешних credentials",
        supportedAspectRatios: ["RATIO_1_1", "RATIO_16_9", "RATIO_9_16", "RATIO_4_3", "RATIO_3_4"],
        supportsVisualPrompt: true,
        active: !vertexEnabled,
      },
      update: { active: !vertexEnabled },
    });
    const vertexModel = await tx.aiModel.upsert({
      where: { code: VERTEX_MODEL_CODE },
      create: {
        provider: "VERTEX_AI",
        code: VERTEX_MODEL_CODE,
        externalModelId: process.env.VERTEX_IMAGE_MODEL || "gemini-3-pro-image",
        name: "Gemini 3 Pro Interior",
        description: "Премиальная фотореалистичная визуализация интерьера через Google Vertex AI",
        supportedAspectRatios: ["RATIO_1_1", "RATIO_16_9", "RATIO_9_16", "RATIO_4_3", "RATIO_3_4"],
        supportsVisualPrompt: true,
        priority: 100,
        timeoutSeconds: 180,
        active: vertexEnabled,
      },
      update: {
        provider: "VERTEX_AI",
        externalModelId: process.env.VERTEX_IMAGE_MODEL || "gemini-3-pro-image",
        name: "Gemini 3 Pro Interior",
        description: "Премиальная фотореалистичная визуализация интерьера через Google Vertex AI",
        priority: 100,
        active: vertexEnabled,
      },
    });
    for (const plan of [freePlan, vipPlan]) {
      await tx.planModel.upsert({ where: { planId_modelId: { planId: plan.id, modelId: fakeModel.id } }, create: { planId: plan.id, modelId: fakeModel.id }, update: {} });
      await tx.planModel.upsert({ where: { planId_modelId: { planId: plan.id, modelId: vertexModel.id } }, create: { planId: plan.id, modelId: vertexModel.id }, update: {} });
    }
    return { freePlan, vipPlan, model: vertexEnabled ? vertexModel : fakeModel };
  });
}
